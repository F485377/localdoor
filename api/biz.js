// /api/biz  事業者の画面（日本語）
//   GET                         自分の店舗の一覧（1つの事業者が複数の店舗を持てる）
//   GET ?id=                    1つの店舗と受付停止日
//   GET ?view=bookings          予約一覧（全店舗。開いたら新着を「見た」にする）
//   PUT ?action=place&id=       店舗を保存（日本語 → 4言語に自動翻訳）。{ ...項目, publish }。id がなければ新しい店舗を作る
//   GET ?view=calendar&id=&from=&days=   カレンダー：日ごとの時間枠・定員・予約人数・旅行者に見える印（〇△✕）
//   PUT ?action=closures        期間をまとめて { placeId, from, to, mark }（mark: 'x' 受付停止・'none' 未定・'auto' 元に戻す。古い closed: true/false も使える）
//   PUT ?action=day             1日の調節 { placeId, date, mark?, slots?: [{ time, capacity }] }
//                               mark は旅行者に見せる印：'auto' 空きに合わせる・'o' 〇・'limited' △・'x' ✕（受付停止）・'none' ー（未定）。定員 0 はその枠だけ止める
//   POST ?action=cancel         予約のキャンセル { id, reason, note }
//   POST ?action=delete         店舗を削除 { id }（これからの予約があると削除できない。行は残して見えなくする）
import {
  BOOK_AHEAD_DAYS, CANCEL_REASONS, DAY_MARKS, FOUNDED_MIN, MAX_MENU, PAYMENT_METHODS, genreFits, CATEGORIES, MAX_CAPACITY, DIET_SUPPORT, TRANSLATE_LANGS, LOCAL_PCTS, MAX_DESCRIPTION, MAX_PHOTOS, MENU_STYLES, PAYMENTS, PETS, PRICE_BANDS, SMOKING, YEARS,
  addDays, dayMark, isPast, jstDate, missingFields, normalizeSlots, safeUrl, weekday,
} from '../lib/domain.js';
import { Prisma } from '@prisma/client';
import { DATE_RE, body, fail, int, listOf, oneOf, requireUser, route, str } from '../lib/http.js';
import { availabilityMany } from '../lib/availability.js';
import { cityOf } from '../lib/cities.js';
import { PREF_CODES } from '../lib/japan.js';
import { deletePhotos, isOwnPhoto } from '../lib/photos.js';
import { sourceTexts } from '../lib/places.js';
import { prisma } from '../lib/prisma.js';
import { translateMany, translateText } from '../lib/translate.js';

function placeView(p) {
  if (!p) return null;
  return {
    ...p,
    slots: normalizeSlots(p.slots),
    missing: missingFields(p),
    visible: p.published && !p.suspended,
  };
}

const MAX_PLACES = 20; // 1つのアカウントで持てる店舗の数

// 自分の店舗だけ（ほかの事業者の店舗は見つからない扱い）
async function ownPlace(user, id) {
  const place = typeof id === 'string' && id ? await prisma.place.findFirst({ where: { id: str(id, 40), ownerId: user.id, deletedAt: null } }) : null;
  if (!place) fail(404, '店舗が見つかりません');
  return place;
}

async function list(user) {
  const places = await prisma.place.findMany({ where: { ownerId: user.id, deletedAt: null }, orderBy: { createdAt: 'asc' } });
  return { places: places.map(placeView), max: MAX_PLACES };
}

async function load(user, id) {
  const place = await ownPlace(user, id);
  const closures = await prisma.closure.findMany({ where: { placeId: place.id, date: { gte: jstDate() } }, orderBy: { date: 'asc' } });
  return { place: placeView(place), closures: closures.map((c) => c.date) };
}

// 写真の URL は、この事業者がアップロードしたものだけ
const photo = (user, v) => (typeof v === 'string' && isOwnPhoto(user, v) ? v : null);
const item = (user, v) => {
  const name = str(v?.name, 60);
  return name ? { name, price: int(v.price, { min: 0, max: 1000000 }), note: str(v.note, 200), photo: photo(user, v.photo) } : null;
};
// 創業年：FOUNDED_MIN〜今年の整数だけ（範囲外は保存しない）
const foundedYearOf = (v) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= FOUNDED_MIN && n <= Number(jstDate().slice(0, 4)) ? n : null;
};

// メニュー表の1行：料理名（必須）・値段・量（例：200g、2〜3人前）・ひとこと
const menuRow = (v) => {
  const name = str(v?.name, 60);
  return name ? { name, price: int(v.price, { min: 0, max: 1000000 }), amount: str(v.amount, 40), note: str(v.note, 120) } : null;
};
const coord = (v, min, max) => (Number.isFinite(Number(v)) && v !== '' && v != null && Number(v) >= min && Number(v) <= max ? Number(v) : null);

// 画面から来た値を確かめる。おかしな値は保存しない（空にする）
function parsePlace(b, user) {
  const link = str(b.link, 500);
  if (link && !safeUrl(link)) fail(400, '外部リンクは http:// か https:// で始まるURLを入力してください', { code: 'link' });
  const km = Number(b.stationKm);
  return {
    category: oneOf(b.category, CATEGORIES),
    // ジャンルは、そのカテゴリのものだけ
    genre: genreFits(b.category, b.genre) ? b.genre : null,
    menu: (Array.isArray(b.menu) ? b.menu : []).map(menuRow).filter(Boolean).slice(0, MAX_MENU),
    prefCode: oneOf(b.prefCode, PREF_CODES),
    // 市区町村は、その都道府県のものだけ
    cityId: cityOf(b.cityId)?.pref === b.prefCode ? b.cityId : null,
    station: str(b.station, 40),
    name: str(b.name, 80),
    address: str(b.address, 200),
    description: str(b.description, MAX_DESCRIPTION),
    price: int(b.price, { min: 0, max: 1000000 }),
    durationMin: int(b.durationMin, { min: 10, max: 1440 }),
    payments: PAYMENT_METHODS.filter((m) => listOf(b.payments, PAYMENT_METHODS).includes(m)), // 決まった順に並べる
    link: link ? safeUrl(link) : null,
    priceBand: oneOf(b.priceBand, PRICE_BANDS),
    localPct: oneOf(int(b.localPct), LOCAL_PCTS),
    lat: coord(b.lat, 20, 46), // 日本の範囲
    lng: coord(b.lng, 122, 154),
    smoking: oneOf(b.smoking, SMOKING),
    pets: oneOf(b.pets, PETS),
    privateRoom: typeof b.privateRoom === 'boolean' ? b.privateRoom : null,
    photos: [...new Set((Array.isArray(b.photos) ? b.photos : []).map((v) => photo(user, v)).filter(Boolean))].slice(0, MAX_PHOTOS),
    popular: item(user, b.popular) ?? Prisma.DbNull, // Json の項目を空にするときは DbNull
    ownerPick: item(user, b.ownerPick) ?? Prisma.DbNull,
    kodawari: str(b.kodawari, 1000),
    kodawariPhoto: photo(user, b.kodawariPhoto),
    perk: str(b.perk, 200),
    foundedYear: foundedYearOf(b.foundedYear),
    stationKm: b.stationKm === '' || b.stationKm == null || !Number.isFinite(km) ? null : Math.min(100, Math.max(0, Math.round(km * 10) / 10)),
    belongings: str(b.belongings, 300),
    minPeople: int(b.minPeople, { min: 1, max: 50 }),
    dietSupport: listOf(b.dietSupport, DIET_SUPPORT),
    menuStyle: oneOf(b.menuStyle, MENU_STYLES),
    slots: normalizeSlots((Array.isArray(b.slots) ? b.slots : []).map((s) => ({ time: s?.time, end: s?.end, capacity: int(s?.capacity, { min: 1, max: 50 }) }))),
    closedWeekdays: listOf((Array.isArray(b.closedWeekdays) ? b.closedWeekdays : []).map(Number), [0, 1, 2, 3, 4, 5, 6]),
    leadDays: oneOf(int(b.leadDays), [0, 1, 2], 1),
  };
}

async function savePlace(req, user) {
  const b = body(req);
  const data = parsePlace(b, user);
  const current = req.query.id ? await ownPlace(user, req.query.id) : null;
  if (!current && (await prisma.place.count({ where: { ownerId: user.id, deletedAt: null } })) >= MAX_PLACES) fail(409, `店舗は${MAX_PLACES}件まで登録できます`);

  // 日本語の文章が変わったとき（または前回の翻訳に失敗していたとき）だけ、4言語に訳し直す
  const texts = sourceTexts(data);
  const changed = !current?.translatedAt || JSON.stringify(sourceTexts(current)) !== JSON.stringify(texts);
  if (changed) {
    const tr = await translateMany(texts, TRANSLATE_LANGS);
    data.i18n = tr ?? undefined;
    data.translatedAt = tr ? new Date() : null;
  }

  // 必須項目がそろっていれば公開。足りなければ下書き
  const missing = missingFields(data);
  const wantPublic = b.publish !== false;
  data.published = wantPublic && missing.length === 0;
  if (data.published && !current?.publishedAt) data.publishedAt = new Date();

  const place = current
    ? await prisma.place.update({ where: { id: current.id }, data })
    : await prisma.place.create({ data: { ...data, ownerId: user.id } });
  // 外した写真は保存先からも消す
  if (current) {
    const used = new Set([...place.photos, place.popular?.photo, place.ownerPick?.photo, place.kodawariPhoto].filter(Boolean));
    const old = [...current.photos, current.popular?.photo, current.ownerPick?.photo, current.kodawariPhoto].filter(Boolean);
    await deletePhotos(old.filter((u) => !used.has(u)));
  }
  return { place: placeView(place), translationFailed: changed && !place.translatedAt };
}

// カレンダー（事業者用）。旅行者から見えない日（締切を過ぎた日など）も、枠と予約は見られる
async function calendar(user, q) {
  const place = await ownPlace(user, q.id);
  const today = jstDate();
  const from = DATE_RE.test(q.from ?? '') && q.from >= today ? q.from : today;
  const days = int(q.days, { min: 1, max: 62 }) ?? 42;
  const to = addDays(from, days - 1);
  const [closures, overrides, booked, seen, marks] = await Promise.all([
    prisma.closure.findMany({ where: { placeId: place.id, date: { gte: from, lte: to } } }),
    prisma.slotOverride.findMany({ where: { placeId: place.id, date: { gte: from, lte: to } } }),
    prisma.booking.groupBy({ by: ['date', 'time'], where: { placeId: place.id, status: 'CONFIRMED', date: { gte: from, lte: to } }, _sum: { partySize: true }, _count: true }),
    availabilityMany([place], from, days),
    prisma.dayMark.findMany({ where: { placeId: place.id, date: { gte: from, lte: to } } }),
  ]);
  const setMark = Object.fromEntries(marks.map((m) => [m.date, m.mark]));
  const closed = new Set(closures.map((c) => c.date));
  const caps = {};
  for (const o of overrides) (caps[o.date] ??= {})[o.time] = o.capacity;
  const count = {};
  for (const b of booked) (count[b.date] ??= {})[b.time] = { people: b._sum.partySize ?? 0, bookings: b._count };
  const slots = normalizeSlots(place.slots);
  return {
    place: { id: place.id, name: place.name, slots, closedWeekdays: place.closedWeekdays, leadDays: place.leadDays },
    days: seen[place.id].map((d) => {
      const date = d.date;
      const daySlots = slots.map((s) => {
        const capacity = caps[date]?.[s.time] ?? s.capacity;
        const c = count[date]?.[s.time] ?? { people: 0, bookings: 0 };
        return { time: s.time, end: s.end, base: s.capacity, capacity, people: c.people, bookings: c.bookings };
      });
      return {
        date,
        weekly: place.closedWeekdays.includes(weekday(date)),
        closed: closed.has(date),
        // 事業者が決めた印（決めていなければ 'auto'）
        setting: closed.has(date) ? 'x' : setMark[date] ?? 'auto',
        changed: Boolean(caps[date]),
        slots: daySlots,
        people: daySlots.reduce((n, s) => n + s.people, 0),
        mark: dayMark(d), // 旅行者に見える印
      };
    }),
  };
}

// 1日の調節：その日を止める／再開、時間枠ごとの定員（いつもと同じに戻したら、変更を消す）
async function saveDay(req, user) {
  const b = body(req);
  const place = await ownPlace(user, b.placeId);
  const date = DATE_RE.test(b.date ?? '') ? b.date : null;
  const today = jstDate();
  if (!date || date < today || date > addDays(today, BOOK_AHEAD_DAYS + 30)) fail(400, '日付を選んでください');
  const base = Object.fromEntries(normalizeSlots(place.slots).map((s) => [s.time, s.capacity]));
  const ops = [];
  const mark = typeof b.closed === 'boolean' ? (b.closed ? 'x' : 'auto') : oneOf(b.mark, DAY_MARKS);
  if (mark) ops.push(...markOps(place.id, [date], mark));
  for (const s of Array.isArray(b.slots) ? b.slots : []) {
    const time = typeof s?.time === 'string' ? s.time : '';
    const capacity = int(s?.capacity, { min: 0, max: MAX_CAPACITY });
    if (!(time in base) || capacity == null) continue;
    const key = { placeId_date_time: { placeId: place.id, date, time } };
    ops.push(
      capacity === base[time]
        ? prisma.slotOverride.deleteMany({ where: { placeId: place.id, date, time } })
        : prisma.slotOverride.upsert({ where: key, create: { placeId: place.id, date, time, capacity }, update: { capacity } }),
    );
  }
  await prisma.$transaction(ops);
  const cal = await calendar(user, { id: place.id, from: date, days: 1 });
  return { day: cal.days[0] };
}

async function saveClosures(req, user) {
  const b = body(req);
  const place = await ownPlace(user, b.placeId);
  const from = DATE_RE.test(b.from ?? '') ? b.from : null;
  const to = DATE_RE.test(b.to ?? '') ? b.to : from;
  if (!from || to < from) fail(400, '日付を選んでください');
  const dates = [];
  for (let d = from; d <= to && dates.length < 366; d = addDays(d, 1)) dates.push(d);
  const mark = typeof b.closed === 'boolean' ? (b.closed ? 'x' : 'auto') : oneOf(b.mark, ['x', 'none', 'auto']);
  if (!mark) fail(400, '止めるか、未定にするかを選んでください');
  await prisma.$transaction(markOps(place.id, dates, mark));
  return load(user, place.id);
}

// 印を決める：✕ は受付停止日（Closure）、〇・△・ー は DayMark、'auto' はどちらも消す（1日に1つだけ）
function markOps(placeId, dates, mark) {
  const where = { placeId, date: { in: dates } };
  const ops = [prisma.closure.deleteMany({ where }), prisma.dayMark.deleteMany({ where })];
  if (mark === 'x') ops.push(prisma.closure.createMany({ data: dates.map((date) => ({ placeId, date })) }));
  else if (mark !== 'auto') ops.push(prisma.dayMark.createMany({ data: dates.map((date) => ({ placeId, date, mark })) }));
  return ops;
}

function bizBooking(b, now = new Date()) {
  const left = Boolean(b.traveler.deletedAt);
  return {
    id: b.id,
    date: b.date,
    time: b.time,
    endTime: b.endTime,
    partySize: b.partySize,
    diets: b.diets,
    message: b.message,
    messageJa: b.messageJa,
    status: b.status === 'CONFIRMED' && isPast(b, now) ? 'COMPLETED' : b.status,
    cancelReason: b.cancelReason,
    cancelNote: b.cancelNote,
    cancelledAt: b.cancelledAt,
    fresh: !b.bizSeenAt && b.status !== 'CANCELLED_BY_BUSINESS',
    place: { id: b.place.id, name: b.place.name },
    traveler: { name: left ? null : b.traveler.name, left, id: b.travelerId },
    createdAt: b.createdAt,
  };
}

async function bookings(user) {
  const rows = await prisma.booking.findMany({
    where: { place: { ownerId: user.id }, date: { gte: addDays(jstDate(), -30) } },
    include: { traveler: true, place: true },
    orderBy: [{ date: 'asc' }, { time: 'asc' }],
  });
  const unseen = rows.filter((b) => !b.bizSeenAt).map((b) => b.id);
  if (unseen.length) await prisma.booking.updateMany({ where: { id: { in: unseen } }, data: { bizSeenAt: new Date() } });
  return { bookings: rows.map((b) => bizBooking(b)) };
}

async function cancel(req, user) {
  const b = body(req);
  const reason = oneOf(b.reason, CANCEL_REASONS);
  if (!reason) fail(400, 'キャンセルの理由を選んでください');
  const note = str(b.note, 500);
  const booking = await prisma.booking.findFirst({ where: { id: str(b.id, 40), place: { ownerId: user.id } }, include: { traveler: true, place: true } });
  if (!booking) fail(404, '予約が見つかりません');
  if (booking.status !== 'CONFIRMED') fail(409, 'この予約はすでにキャンセルされています');
  if (isPast(booking)) fail(409, '開始時刻を過ぎた予約はキャンセルできません');
  // 日本語を使う旅行者には訳さずそのまま
  const noteTr = note ? (booking.lang === 'ja' ? note : await translateText(note, booking.lang)) : null;
  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: { status: 'CANCELLED_BY_BUSINESS', cancelledAt: new Date(), cancelReason: reason, cancelNote: note || null, cancelNoteTr: noteTr, travelerSeenAt: null },
    include: { traveler: true, place: true },
  });
  return { booking: bizBooking(updated) };
}

// 店舗を削除する。これからの予約が残っていれば、先にキャンセルしてもらう。
// 旅行者の予約・メッセージの記録が消えないよう、行は残して「削除済み」にし、検索・詳細・保存からは外す。写真は消す
async function removePlace(req, user) {
  const place = await ownPlace(user, body(req).id);
  const upcoming = await prisma.booking.count({ where: { placeId: place.id, status: 'CONFIRMED', date: { gte: jstDate() } } });
  if (upcoming) fail(409, `これからの予約が${upcoming}件あるため削除できません。「予約」の画面でキャンセルしてから削除してください。`, { code: 'upcoming', count: upcoming });
  await prisma.$transaction([
    prisma.place.update({ where: { id: place.id }, data: { deletedAt: new Date(), published: false } }),
    prisma.savedPlace.deleteMany({ where: { placeId: place.id } }),
  ]);
  await deletePhotos([...place.photos, place.popular?.photo, place.ownerPick?.photo, place.kodawariPhoto].filter(Boolean));
  return { ok: true };
}

export default route({
  GET: async (req) => {
    const user = await requireUser(req, 'BUSINESS');
    if (req.query.view === 'bookings') return bookings(user);
    if (req.query.view === 'calendar') return calendar(user, req.query);
    return req.query.id ? load(user, req.query.id) : list(user);
  },
  PUT: async (req) => {
    const user = await requireUser(req, 'BUSINESS');
    if (req.query.action === 'place') return savePlace(req, user);
    if (req.query.action === 'closures') return saveClosures(req, user);
    if (req.query.action === 'day') return saveDay(req, user);
    return fail(400, 'Unknown action');
  },
  POST: async (req) => {
    const user = await requireUser(req, 'BUSINESS');
    if (req.query.action === 'cancel') return cancel(req, user);
    if (req.query.action === 'delete') return removePlace(req, user);
    return fail(400, 'Unknown action');
  },
});
