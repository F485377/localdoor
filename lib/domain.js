// 予約と掲載のルール。画面（src/）と API（api/）の両方で使う。外部のパッケージには頼らない。

export const CATEGORIES = ['experience', 'restaurant'];

// ジャンル（料理名ではなく、お店・体験の種類で分ける）。カテゴリごとに選べるもの
export const GENRES = {
  restaurant: ['washoku', 'yoshoku', 'chuka', 'izakaya', 'restaurant', 'cafe', 'sweets', 'bar', 'other_food'],
  experience: ['cooking', 'craft', 'culture', 'nature', 'other_exp'],
};
export const ALL_GENRES = [...GENRES.restaurant, ...GENRES.experience];
export const genreFits = (category, genre) => Boolean(GENRES[category]?.includes(genre));

// メニュー表（料理名・値段・量・ひとこと）
export const MAX_MENU = 20;

// 口コミ：星（必須）・来店シーン（誰と・何人で は必須、どんな時に は任意）・宗教（任意。同じ食の決まりがある旅行者の参考に）・雰囲気（任意、1〜5）
export const WITH_WHOM = ['solo', 'friends', 'family', 'partner', 'colleagues', 'other'];
export const OCCASIONS = ['everyday', 'sightseeing', 'date', 'birthday', 'anniversary', 'business', 'other'];
export const MAX_REVIEW_PEOPLE = 20;
export const RELIGIONS = ['muslim', 'hindu', 'buddhist', 'christian', 'jewish', 'none', 'other'];
export const MAX_REVIEW = 1000;

// 予算の範囲（1人あたり）。上の端は「上限なし」
export const BUDGET_STEP = 500;
export const BUDGET_TOP = 10000;

// 旅行者画面の言語：英語・簡体字・繁体字・韓国語・日本語
export const LANGS = ['en', 'zh', 'zt', 'ko', 'ja'];
// 掲載文を訳す先（日本語は原文のまま）
export const TRANSLATE_LANGS = ['en', 'zh', 'zt', 'ko'];

// 値段帯（1人あたり）
export const PRICE_BANDS = ['lt1000', '1000to3000', '3000to5000', '5000to10000', 'gt10000'];
export const BAND_RANGE = { lt1000: [0, 1000], '1000to3000': [1000, 3000], '3000to5000': [3000, 5000], '5000to10000': [5000, 10000], gt10000: [10000, null] };
export const LOCAL_PCTS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
export const LOCAL_FILTERS = [50, 70]; // 地元のお客さんが ○％以上
export const SMOKING = ['none', 'separated', 'allowed'];
export const PETS = ['ok', 'no'];
export const YEARS = ['gt30', '10to30', 'lt10'];
export const PAYMENTS = ['cash', 'card']; // 古い項目（payment）。今は PAYMENT_METHODS を使う
// 支払方法（事業者は複数選べる。旅行者は「どれかが使えるお店」で絞り込む）
export const PAYMENT_METHODS = ['cash', 'card', 'ic', 'qr'];
// 創業年（営業年数は創業年から毎年自動で計算する）
export const FOUNDED_MIN = 1600;
export const yearsOpen = (foundedYear, now = new Date()) => (Number.isInteger(foundedYear) ? Math.max(0, Number(jstDate(now).slice(0, 4)) - foundedYear) : null);
// 絞り込みの範囲（バー）
export const LOCAL_STEP = 10; // 地元のお客さんの割合 0〜100%
export const YEARS_STEP = 5; // 営業年数 0〜YEARS_TOP年（上の端は「上限なし」）
export const YEARS_TOP = 100;
export const TIME_STEP = 30; // 時間帯（分）
export const MENU_STYLES = ['course', 'alacarte', 'both'];
export const DIET_SUPPORT = ['vegetarian', 'vegan', 'halal', 'gluten_free', 'allergy'];
// 旅行者が予約で選ぶ食事制限（アレルギーは日本の表示義務8品目＋よく聞かれるもの）
export const DIETS = ['vegetarian', 'vegan', 'halal', 'no_pork', 'no_alcohol', 'gluten_free'];
export const ALLERGIES = ['egg', 'milk', 'wheat', 'buckwheat', 'peanut', 'shrimp', 'crab', 'walnut', 'soy', 'sesame', 'fish', 'shellfish'];
export const ALL_DIETS = [...DIETS, ...ALLERGIES.map((a) => `allergy_${a}`)];
export const CANCEL_REASONS = ['closed', 'weather', 'other'];
export const REPORT_REASONS = ['fake', 'wrong', 'inappropriate', 'other'];

// 絞り込みの選択肢
export const BUDGETS = [1000, 3000, 5000, 10000]; // 1人あたり ○円まで（値段帯の上限で比べる）
export const DISTANCES = [1, 3, 10]; // 最寄り駅から ○km以内

export const CURRENCIES = ['JPY', 'SGD', 'USD', 'CNY', 'HKD', 'TWD', 'KRW', 'EUR']; // JPY = 円だけで表示する

// 上限
export const MAX_MESSAGE = 1000; // メッセージの文字数（翻訳APIへの過剰な入力を防ぐ）
export const MAX_DESCRIPTION = 2000;
export const MAX_FUTURE_BOOKINGS = 5; // 1人の旅行者が同時に持てる、これからの予約
export const MAX_PARTY = 20;
export const MAX_SLOTS = 12;
export const MAX_CAPACITY = 50;
// 事業者が決められる印（'auto' は空きに合わせる。'x' は受付停止）
export const DAY_MARKS = ['auto', 'o', 'limited', 'x', 'none'];
export const BOOK_AHEAD_DAYS = 90; // 何日先まで予約できるか
export const PASSWORD_MIN = 8;
export const MAX_PHOTOS = 8; // 店の写真の枚数
export const NEAR_KM = 5; // 「現在地の近く」の範囲
export const WEEK = 7; // 一覧の〇△✕の日数

// ───── 日本時間 ─────
const JST = 9 * 3600 * 1000;
export const jstDate = (d = new Date()) => new Date(d.getTime() + JST).toISOString().slice(0, 10);
export const visitAt = (date, time) => new Date(`${date}T${time}:00+09:00`);
export function addDays(date, n) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export const weekday = (date) => new Date(`${date}T00:00:00Z`).getUTCDay();

// 予約の日時を過ぎたら「完了」
export const isPast = (b, now = new Date()) => visitAt(b.date, b.time) <= now;

// その日が受付の対象か（定休日・受付停止日・受付締切・予約できる期間）
export function dayOpen(place, date, closures, now = new Date()) {
  const today = jstDate(now);
  if (date < addDays(today, place.leadDays ?? 1)) return false;
  if (date > addDays(today, BOOK_AHEAD_DAYS)) return false;
  if ((place.closedWeekdays ?? []).includes(weekday(date))) return false;
  return !closures.has(date);
}

// 時間枠ごとの残り人数。booked は { "HH:MM": 予約済み人数 }。当日の始まった枠は出さない。
// overrides は { "HH:MM": その日だけの定員 }（事業者がカレンダーで変えたもの。0 はその枠を止める）
export function slotsFor(place, date, booked, now = new Date(), overrides = {}) {
  return normalizeSlots(place.slots)
    .filter((s) => visitAt(date, s.time) > now)
    .map((s) => ({ ...s, capacity: overrides[s.time] ?? s.capacity }))
    .filter((s) => s.capacity > 0)
    .map((s) => ({ time: s.time, end: s.end, capacity: s.capacity, left: Math.max(0, s.capacity - (booked[s.time] ?? 0)) }));
}

// 時間枠：{ time: 開始, end: 終了, capacity: 上限人数 }。終了は開始より後。開始が同じ枠は1つだけ
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
export function normalizeSlots(slots) {
  if (!Array.isArray(slots)) return [];
  const seen = new Set();
  return slots
    .filter((s) => HHMM.test(s?.time) && HHMM.test(s?.end) && s.end > s.time && Number.isInteger(s.capacity) && s.capacity > 0)
    .filter((s) => !seen.has(s.time) && seen.add(s.time))
    .map((s) => ({ time: s.time, end: s.end, capacity: Math.min(s.capacity, MAX_CAPACITY) }))
    .sort((a, b) => a.time.localeCompare(b.time))
    .slice(0, MAX_SLOTS);
}

// 10:00〜12:00
export const slotLabel = (s) => (s.end ? `${s.time}〜${s.end}` : s.time);

// 公開に必要な項目のうち、足りないもの（事業者画面で日本語の名前を出す）
export const REQUIRED = {
  name: '店名',
  category: 'カテゴリ',
  prefCode: '都道府県',
  cityId: '市区町村',
  address: '住所',
  location: '地図上の位置',
  description: '説明文',
  priceBand: '値段帯',
  price: '料金（体験）',
  durationMin: '所要時間（体験）',
  payments: '支払い方法',
  localPct: '地元のお客さんの割合',
  foundedYear: '創業年',
  station: '最寄り駅',
  stationKm: '最寄り駅からの距離',
};
export function missingFields(place) {
  const empty = (v) => v == null || v === '' || (Array.isArray(v) && !v.length);
  return Object.keys(REQUIRED).filter((k) => {
    if (k === 'location') return empty(place.lat) || empty(place.lng);
    if (k === 'price' || k === 'durationMin') return place.category === 'experience' && empty(place[k]);
    return empty(place[k]);
  });
}

// 一覧の〇△✕：その日に people 人で入れる時間枠があるか。
// o = 空きあり、limited = 残りわずか（その日の残りが合計の2割以下）、x = 満席・休み
// 〇 'o'・△ 'limited'・✕ 'x'・ー 'none'（日程がまだ決まっていない）。
// 事業者が〇や△を決めた日（markAs）でも、入れる枠がなければ ✕
export function dayMark(day, people = 1) {
  if (day.undecided) return 'none';
  if (!day.open) return 'x';
  const fits = day.slots.filter((s) => s.left >= people);
  if (!fits.length) return 'x';
  if (day.markAs) return day.markAs;
  const left = day.slots.reduce((n, s) => n + s.left, 0);
  const cap = day.slots.reduce((n, s) => n + s.capacity, 0);
  return left <= cap * 0.2 ? 'limited' : 'o';
}

// 2点間の距離（km）
export function distanceKm(a, b) {
  const R = 6371;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// 外部リンクは http(s) だけ
export function safeUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const u = new URL(value.trim());
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : null;
  } catch {
    return null;
  }
}
