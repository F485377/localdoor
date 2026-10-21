// /api/places  旅行者向けの店舗（ログインなしで見られる）
//   GET    一覧。?lang&area&near=lat,lng&bounds=s,w,n,e&date&people&page と絞り込み。20件ずつ（page=all は全部。地図用）
//          （category, genre, q（キーワード）, bmin・bmax（予算）, lmin・lmax（地元の割合）, ymin・ymax（営業年数）, tfrom・tto（時間帯）,
//           sameday（当日予約）, pay（支払方法。カンマ区切り、どれかが使える店）, distance, smoking, pets, room, perk, diet）
//          sort=rating で口コミの評価が高い順
//          各店に今日から1週間の〇△✕（week）を付ける。検索した日に入れる店を先に、あとは新着順（現在地のときは近い順）
//   GET ?id=               詳細（閲覧を記録する）
//   GET ?saved=1           旅行者：保存したお店（ログインが必要）
//   GET ?savedIds=1        旅行者：保存したお店の id だけ
//   POST ?action=report    { placeId, reason, note }  この店舗を報告
//   POST ?action=save      { placeId, saved }         お店を保存／外す（ログインが必要）
//   GET ?reviews=<id>      口コミの一覧と集計（グラフ用）。ログインしていれば、書けるか・自分の口コミも
//   POST ?action=review    { placeId, rating, withWhom, people, occasion?, religion?, calm?, special?, comment }
//                          口コミを書く（書き直す）。そのお店を予約して、来店の時刻を過ぎた旅行者だけ
import { currentUser, throttle } from '../lib/auth.js';
import { availabilityMany } from '../lib/availability.js';
import {
  ALL_GENRES, LOCAL_STEP, PAYMENT_METHODS, TIME_STEP, YEARS_STEP, YEARS_TOP, BAND_RANGE, BUDGET_STEP, BUDGET_TOP, BUDGETS, CATEGORIES, DIET_SUPPORT, DISTANCES, LANGS, LOCAL_FILTERS, MAX_PARTY, NEAR_KM, PETS, PRICE_BANDS, REPORT_REASONS, SMOKING, WEEK, YEARS,
  MAX_REVIEW, MAX_REVIEW_PEOPLE, OCCASIONS, RELIGIONS, WITH_WHOM,
  dayMark, distanceKm, isPast, jstDate, normalizeSlots,
} from '../lib/domain.js';
import { DATE_RE, body, clientIp, fail, int, oneOf, requireUser, route, str } from '../lib/http.js';
import { cityOf } from '../lib/cities.js';
import { PREF_CODES } from '../lib/japan.js';
import { VISIBLE, sourceTexts, travelerPlace } from '../lib/places.js';
import { GENRE_NAMES as L_GENRE } from '../lib/genres.js';
import { interpretWord } from '../lib/keywords.js';
import { prisma } from '../lib/prisma.js';
import { REVIEW_VISIBLE, reviewView, summarize } from '../lib/reviews.js';
import { translateToMany } from '../lib/translate.js';

const num = (v) => (v === undefined || v === '' ? NaN : Number(v));
const coords = (v, n) => {
  const parts = String(v ?? '').split(',').map(Number);
  return parts.length === n && parts.every(Number.isFinite) ? parts : null;
};

// 絞り込み条件（未指定は入れない）。0件のとき「条件を一つ外すと何件」に使う
function filtersFrom(q) {
  const f = {
    category: oneOf(q.category, CATEGORIES),
    genre: oneOf(q.genre, ALL_GENRES),
    // キーワード（ラーメン・うどん・和菓子づくり など）。空白で区切ると、すべてを含むお店
    q: str(q.q, 60) || null,
    // 予算の範囲（1人あたり。BUDGET_STEP 刻み。上は BUDGET_TOP で「上限なし」）
    bmin: budgetValue(q.bmin, 0),
    bmax: budgetValue(q.bmax, BUDGET_TOP),
    // 地元のお客さんの割合（0〜100%、LOCAL_STEP 刻み）
    lmin: stepValue(q.lmin, LOCAL_STEP, 100, 0),
    lmax: stepValue(q.lmax, LOCAL_STEP, 100, 100),
    // 営業年数（創業年から計算。YEARS_STEP 刻み、上は YEARS_TOP で「上限なし」）
    ymin: stepValue(q.ymin, YEARS_STEP, YEARS_TOP, 0),
    ymax: stepValue(q.ymax, YEARS_STEP, YEARS_TOP, YEARS_TOP),
    // 時間帯：この時刻の間に始まる時間枠があるお店（TIME_STEP 分刻み）
    tfrom: timeValue(q.tfrom),
    tto: timeValue(q.tto),
    pay: payList(q.pay),
    distance: oneOf(num(q.distance), DISTANCES),
    smoking: oneOf(q.smoking, SMOKING),
    pets: oneOf(q.pets, PETS),
    room: q.room === '1' ? true : null,
    perk: q.perk === '1' ? true : null,
    diet: oneOf(q.diet, DIET_SUPPORT),
    sameday: q.sameday === '1' ? true : null,
  };
  return Object.fromEntries(Object.entries(f).filter(([, v]) => v != null));
}

// 刻みに合う 0〜top の数。端（edge）は「指定なし」
function stepValue(v, step, top, edge) {
  const n = num(v);
  if (!Number.isFinite(n) || n % step || n < 0 || n > top || n === edge) return null;
  return n;
}
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const timeValue = (v) => (TIME_RE.test(v ?? '') && Number(v.slice(3)) % TIME_STEP === 0 ? v : null);
const payList = (v) => {
  const list = [...new Set(String(v ?? '').split(','))].filter((x) => PAYMENT_METHODS.includes(x));
  return list.length ? list : null;
};

function budgetValue(v, edge) {
  const n = num(v);
  if (!Number.isFinite(n) || n % BUDGET_STEP || n < 0 || n > BUDGET_TOP || n === edge) return null;
  return n;
}

// 予算の範囲に入る値段帯：値段帯の範囲が [bmin, bmax] と重なるもの
const bandsIn = (min, max) =>
  PRICE_BANDS.filter((b) => {
    const [lo, hi] = BAND_RANGE[b];
    return (hi == null || hi > min) && (max == null || lo < max);
  });

function whereFrom(f, place) {
  const w = { ...VISIBLE };
  if (place.pref) w.prefCode = place.pref;
  if (place.city) w.cityId = place.city;
  if (place.bounds) {
    const [s, wst, n, e] = place.bounds;
    w.lat = { gte: s, lte: n };
    w.lng = { gte: wst, lte: e };
  }
  if (place.near) {
    w.lat = { not: null };
    w.lng = { not: null };
  }
  if (f.category) w.category = f.category;
  if (f.genre) w.genre = f.genre;
  if (f.bmin != null || f.bmax != null) w.priceBand = { in: bandsIn(f.bmin ?? 0, f.bmax) };
  if (f.lmin != null || f.lmax != null) w.localPct = { gte: f.lmin ?? 0, lte: f.lmax ?? 100 };
  if (f.ymin != null || f.ymax != null) {
    // 営業年数 ymin〜ymax 年 ＝ 創業年が（今年 − ymax）〜（今年 − ymin）
    const year = Number(jstDate().slice(0, 4));
    w.foundedYear = { lte: year - (f.ymin ?? 0), ...(f.ymax != null ? { gte: year - f.ymax } : {}) };
  }
  if (f.pay) w.payments = { hasSome: f.pay };
  if (f.distance) w.stationKm = { lte: f.distance };
  if (f.smoking) w.smoking = f.smoking;
  if (f.pets) w.pets = f.pets;
  if (f.room) w.privateRoom = true;
  if (f.perk) w.perk = { not: '' };
  if (f.diet) w.dietSupport = { has: f.diet };
  if (f.sameday) w.leadDays = 0;
  return w;
}

// キーワード：店名・説明・こだわり・メニューなどを、日本語の原文とすべての訳から探す（大文字小文字・全角半角は区別しない）
const norm = (s) => String(s ?? '').normalize('NFKC').toLowerCase();
function matches(p, q) {
  // 空白で区切った語をすべて含むお店。語ごとに言いかえ（ramen ⇔ ラーメン など）のどれかが含まれればよい
  const words = norm(q).split(/\s+/).filter(Boolean);
  const texts = [sourceTexts(p), ...Object.values(p.i18n ?? {})].flatMap((x) => Object.values(x ?? {}));
  const genre = p.genre ? Object.values(L_GENRE[p.genre] ?? {}) : [];
  const hay = norm([...texts, ...genre].join(' '));
  // 語ごとに推測して読む（「お茶体験」→ お茶（茶道・抹茶…）＋ 文化のジャンル ＋ 体験）。
  // 本文に言葉があるか、推測したジャンルのお店ならよい。体験・飲食店の言葉があれば、そのカテゴリだけ
  return words.every((w) => {
    const { terms, genres, category } = interpretWord(w);
    if (category && p.category !== category) return false;
    if (!terms.length && !genres.length) return true;
    return terms.some((x) => hay.includes(x)) || genres.includes(p.genre);
  });
}

// キーワードに合う度合い（0 は合わない）
function relevance(p, q) {
  if (!matches(p, q)) return 0;
  const names = norm([p.name, ...Object.values(p.i18n ?? {}).map((x) => x?.name)].join(' '));
  const all = norm([...Object.values(sourceTexts(p)), ...Object.values(p.i18n ?? {}).flatMap((x) => Object.values(x ?? {}))].join(' '));
  let score = 1;
  for (const w of norm(q).split(/\s+/).filter(Boolean)) {
    const { terms } = interpretWord(w);
    if (terms.some((x) => names.includes(x))) score += 4;
    else if (terms.some((x) => all.includes(x))) score += 2;
  }
  return score;
}

// 時間帯：tfrom〜tto の間に始まる時間枠があるお店
const inTime = (p, from, to) => normalizeSlots(p.slots).some((s) => s.time >= (from ?? '00:00') && s.time <= (to ?? '23:59'));

// 1回の検索で調べる店の数の上限（一覧は20件ずつ出す。件数の表示もこの数まで）
const MAX_RESULTS = 1000;

async function search(f, where, near) {
  let places = await prisma.place.findMany({ where: whereFrom(f, where), orderBy: { publishedAt: 'desc' }, take: MAX_RESULTS });
  if (f.tfrom || f.tto) places = places.filter((p) => inTime(p, f.tfrom, f.tto));
  if (f.q) {
    // キーワードに近い順：店名に言葉がある > 説明などにある > 推測したジャンルだけ
    places = places
      .map((p, i) => ({ p, i, score: relevance(p, f.q) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || a.i - b.i)
      .map((x) => x.p);
  }
  if (near) {
    places = places
      .map((p) => ({ p, km: distanceKm(near, { lat: p.lat, lng: p.lng }) }))
      .filter((x) => x.km <= NEAR_KM)
      .sort((a, b) => a.km - b.km)
      .map((x) => Object.assign(x.p, { _km: x.km }));
  }
  return places;
}

async function list(q) {
  const lang = oneOf(q.lang, LANGS, 'en');
  const today = jstDate();
  const date = DATE_RE.test(q.date ?? '') && q.date >= today ? q.date : null;
  const people = int(q.people, { min: 1, max: MAX_PARTY, fallback: 1 });
  const near = coords(q.near, 2);
  const where = {
    pref: oneOf(q.pref, PREF_CODES),
    city: cityOf(q.city) ? q.city : null,
    bounds: coords(q.bounds, 4),
    near: near ? { lat: near[0], lng: near[1] } : null,
  };
  const f = filtersFrom(q);
  const places = await search(f, where, where.near);

  // 今日から1週間の〇△✕（検索した人数で判定）。検索した日が1週間より先なら、その日も計算する
  const week = await availabilityMany(places, today, WEEK);
  const extra = date && date >= today && !week[places[0]?.id]?.some((d) => d.date === date) ? await availabilityMany(places, date, 1) : {};
  const rows = places.map((p) => {
    const days = week[p.id] ?? [];
    const onDate = date ? (days.find((d) => d.date === date) ?? extra[p.id]?.[0]) : null;
    return {
      ...travelerPlace(p, { lang }),
      km: p._km ?? null,
      week: days.map((d) => ({ date: d.date, mark: dayMark(d, people) })),
      dateMark: onDate ? dayMark(onDate, people) : null,
    };
  });
  // 検索した日に入れる店を先に（並びは保つ）。「空きがある店だけ」なら、入れない店は出さない
  if (date) rows.sort((a, b) => (a.dateMark === 'x') - (b.dateMark === 'x'));
  const shown = f.open && date ? rows.filter((r) => r.dateMark !== 'x') : rows;

  let suggestions = [];
  if (!shown.length && (Object.keys(f).length || where.pref || where.city || where.bounds)) {
    // 「空きがある店だけ」は空き枠の計算が要るので、外したときの件数は数えない
    // 範囲の条件（予算・地元の割合・営業年数・時間帯）は、上と下をまとめて1つの条件として外す
    const keys = [...new Set(Object.keys(f).map((k) => PAIR_OF[k] ?? k)), ...(where.city ? ['city'] : where.pref ? ['pref'] : [])];
    suggestions = await Promise.all(
      keys.map(async (key) => {
        const { [key]: _, ...rest } = f;
        const partner = Object.keys(PAIR_OF).find((k) => PAIR_OF[k] === key);
        if (partner) delete rest[partner];
        const w = key === 'city' ? { ...where, city: null } : key === 'pref' ? { ...where, pref: null } : where;
        return { remove: key, count: (await search(key === 'city' || key === 'pref' ? f : rest, w, where.near)).length };
      }),
    );
    suggestions = suggestions.filter((s) => s.count > 0).sort((a, b) => b.count - a.count);
  }
  // 1ページ20件。地図は全部のピンを出すので page=all
  const total = shown.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (q.page === 'all') return { places: shown, suggestions, total, page: 1, pages: 1 };
  const page = int(q.page, { min: 1, max: pages, fallback: 1 });
  // 口コミの評価が高い順（口コミのないお店は後ろ）。並べるために全部の評価を先に読む
  let ratings = null;
  if (q.sort === 'rating') {
    ratings = await ratingsFor(shown.map((r) => r.id));
    const score = (r) => ratings[r.id] ?? { average: -1, count: 0 };
    shown.sort((a, b) => score(b).average - score(a).average || score(b).count - score(a).count);
  }
  const pageRows = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  ratings ??= await ratingsFor(pageRows.map((r) => r.id));
  return { places: pageRows.map((r) => ({ ...r, rating: ratings[r.id] ?? null })), suggestions, total, page, pages };
}

// 口コミの平均と件数 { placeId: { average, count } }
async function ratingsFor(ids) {
  if (!ids.length) return {};
  const rows = await prisma.review.groupBy({ by: ['placeId'], where: { placeId: { in: ids }, ...REVIEW_VISIBLE }, _avg: { rating: true }, _count: true });
  return Object.fromEntries(rows.map((r) => [r.placeId, { average: Math.round(r._avg.rating * 10) / 10, count: r._count }]));
}
const PAGE_SIZE = 20;
// 範囲の条件の上の端 → 下の端（0件のときに、まとめて外す）
const PAIR_OF = { bmax: 'bmin', lmax: 'lmin', ymax: 'ymin', tto: 'tfrom' };

// 保存したお店（今日から1週間の〇△✕も付ける）
async function saved(req, q) {
  const user = await requireUser(req, 'TRAVELER');
  const lang = oneOf(q.lang, LANGS, 'en');
  const rows = await prisma.savedPlace.findMany({ where: { userId: user.id, place: VISIBLE }, include: { place: true }, orderBy: { createdAt: 'desc' } });
  const places = rows.map((r) => r.place);
  const week = await availabilityMany(places, jstDate(), WEEK);
  return { places: places.map((p) => ({ ...travelerPlace(p, { lang }), week: (week[p.id] ?? []).map((d) => ({ date: d.date, mark: dayMark(d, 2) })) })) };
}

async function savedIds(req) {
  const user = await currentUser(req);
  if (user?.role !== 'TRAVELER') return { ids: [] };
  const rows = await prisma.savedPlace.findMany({ where: { userId: user.id }, select: { placeId: true } });
  return { ids: rows.map((r) => r.placeId) };
}

async function save(req) {
  const user = await requireUser(req, 'TRAVELER');
  const b = body(req);
  const place = await prisma.place.findFirst({ where: { id: str(b.placeId, 40), ...VISIBLE }, select: { id: true } });
  if (!place) fail(404, 'This listing is not available');
  const key = { userId_placeId: { userId: user.id, placeId: place.id } };
  if (b.saved === false) await prisma.savedPlace.deleteMany({ where: { userId: user.id, placeId: place.id } });
  else await prisma.savedPlace.upsert({ where: key, create: { userId: user.id, placeId: place.id }, update: {} });
  return { saved: b.saved !== false };
}

async function detail(req) {
  const id = str(req.query.id, 40);
  const lang = oneOf(req.query.lang, LANGS, 'en');
  const place = await prisma.place.findFirst({ where: { id, ...VISIBLE } });
  if (!place) fail(404, 'This listing is not available');
  const user = await currentUser(req, 'TRAVELER');
  const owner = await currentUser(req, 'BUSINESS');
  // 成功指標のための閲覧の記録（事業者が自分の店を見たときは数えない）
  if (owner?.id !== place.ownerId) await prisma.placeView.create({ data: { placeId: id, userId: user?.id ?? null } });
  const ratings = await ratingsFor([place.id]);
  return { place: { ...travelerPlace(place, { full: true, lang }), rating: ratings[place.id] ?? null } };
}

async function report(req) {
  const b = body(req);
  const reason = oneOf(b.reason, REPORT_REASONS);
  if (!reason) fail(400, 'Choose a reason');
  if (!(await throttle(`report-ip:${clientIp(req)}`, 10, 60))) fail(429, 'Too many reports. Please try again later.');
  const place = await prisma.place.findFirst({ where: { id: str(b.placeId, 40), ...VISIBLE }, select: { id: true } });
  if (!place) fail(404, 'This listing is not available');
  const user = await currentUser(req);
  await prisma.report.create({ data: { placeId: place.id, userId: user?.id ?? null, reason, note: str(b.note, 500) } });
  return { ok: true };
}

// 口コミを書ける人：このお店を予約して（キャンセルしていない）、来店の時刻を過ぎた旅行者
async function canReview(user, placeId) {
  if (user?.role !== 'TRAVELER') return false;
  const bookings = await prisma.booking.findMany({ where: { placeId, travelerId: user.id, status: 'CONFIRMED' }, orderBy: { date: 'asc' } });
  return bookings.some((b) => isPast(b));
}

async function reviews(req, q) {
  const id = str(q.reviews, 40);
  const place = await prisma.place.findFirst({ where: { id, ...VISIBLE }, select: { id: true, localPct: true } });
  if (!place) fail(404, 'This listing is not available');
  const lang = oneOf(q.lang, LANGS, 'en');
  const user = await currentUser(req, 'TRAVELER');
  const rows = await prisma.review.findMany({ where: { placeId: id, ...REVIEW_VISIBLE }, include: { traveler: true }, orderBy: { createdAt: 'desc' }, take: 200 });
  const mine = user ? rows.find((r) => r.travelerId === user.id) : null;
  return {
    summary: { ...summarize(rows), localPct: place.localPct },
    reviews: rows.map((r) => reviewView(r, lang, user?.id)),
    mine: mine ? reviewView(mine, lang, user.id) : null,
    canWrite: await canReview(user, id),
  };
}

// 1〜5 の整数だけ（範囲外は捨てる）
const scale = (v) => oneOf(int(v), [1, 2, 3, 4, 5]);

async function writeReview(req) {
  const user = await requireUser(req, 'TRAVELER');
  const b = body(req);
  const placeId = str(b.placeId, 40);
  const place = await prisma.place.findFirst({ where: { id: placeId, ...VISIBLE }, select: { id: true } });
  if (!place) fail(404, 'This listing is not available');
  if (!(await canReview(user, placeId))) fail(403, 'You can write a review after your visit to this place', { code: 'not_visited' });
  const rating = scale(b.rating);
  const withWhom = oneOf(b.withWhom, WITH_WHOM);
  const people = int(b.people, { min: 1, max: MAX_REVIEW_PEOPLE });
  if (!rating) fail(400, 'Choose a star rating', { code: 'rating' });
  if (!withWhom || !people) fail(400, 'Tell us who you went with and how many people', { code: 'scene' });
  if (!(await throttle(`review:${user.id}`, 10, 60))) fail(429, 'Too many reviews. Please try again later.');
  const comment = str(b.comment, MAX_REVIEW);
  const old = await prisma.review.findUnique({ where: { placeId_travelerId: { placeId, travelerId: user.id } } });
  // 文章が変わったときだけ訳し直す（ほかの4言語へ）
  const others = LANGS.filter((l) => l !== user.lang);
  const i18n = old && old.comment === comment && old.lang === user.lang ? old.i18n : comment ? await translateToMany(comment, others) : null;
  const data = {
    rating,
    withWhom,
    people,
    occasion: oneOf(b.occasion, OCCASIONS),
    religion: oneOf(b.religion, RELIGIONS),
    calm: scale(b.calm),
    special: scale(b.special),
    comment,
    lang: user.lang,
    i18n: i18n ?? undefined,
  };
  const r = await prisma.review.upsert({
    where: { placeId_travelerId: { placeId, travelerId: user.id } },
    create: { ...data, placeId, travelerId: user.id },
    update: data,
    include: { traveler: true },
  });
  return { review: reviewView(r, user.lang, user.id), translationFailed: Boolean(comment && !i18n) };
}

export default route({
  GET: (req) =>
    req.query.id ? detail(req) : req.query.reviews ? reviews(req, req.query) : req.query.saved ? saved(req, req.query) : req.query.savedIds ? savedIds(req) : list(req.query),
  POST: (req) =>
    req.query.action === 'report' ? report(req) : req.query.action === 'save' ? save(req) : req.query.action === 'review' ? writeReview(req) : fail(400, 'Unknown action'),
});
