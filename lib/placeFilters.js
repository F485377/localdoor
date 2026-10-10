// お店の絞り込み条件。API（本番）とブラウザ版デモの両方で同じルールを使う。
// 同じ種類の中は「どれか」（OR）、種類どうしは「すべて」（AND）で絞り込む。
// 例: カテゴリ = カフェ or バー、かつ ベジタリアン、かつ 評価4以上

export const CATEGORIES = ['restaurant', 'cafe', 'bar'];
export const FEATURES = ['englishMenu', 'englishStaff', 'cardAccepted', 'vegetarian', 'halal'];
export const PRICE_LEVELS = [1, 2, 3, 4];
export const MIN_RATINGS = [3, 4, 4.5];

const list = (value) =>
  String(value ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

// クエリ文字列（?categories=cafe,bar&features=halal ...）を条件オブジェクトにする
export function parseFilters(query) {
  return {
    q: String(query.q ?? '').trim().slice(0, 100),
    categories: list(query.categories).filter((c) => CATEGORIES.includes(c)),
    cities: list(query.cities),
    priceLevels: list(query.priceLevels).map(Number).filter((n) => PRICE_LEVELS.includes(n)),
    features: list(query.features).filter((f) => FEATURES.includes(f)),
    minRating: Number(query.minRating) || 0,
  };
}

// 条件オブジェクトをクエリ文字列にする（ブラウザ側で使う）
export function toQueryString(filters) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    const v = Array.isArray(value) ? value.join(',') : value;
    if (v) params.set(key, String(v));
  }
  return params.toString();
}

// places には rating（平均点、なければ null）が入っている前提
export function filterPlaces(places, f) {
  const needle = f.q.toLowerCase();
  return places.filter(
    (p) =>
      (!f.categories.length || f.categories.includes(p.category)) &&
      (!f.cities.length || f.cities.includes(p.city)) &&
      (!f.priceLevels.length || f.priceLevels.includes(p.priceLevel)) &&
      f.features.every((feature) => p[feature]) &&
      (!f.minRating || (p.rating ?? 0) >= f.minRating) &&
      (!needle ||
        [p.name, p.localName, p.description, p.city, ...p.ingredients, ...(p.cuisine ?? [])].some((s) =>
          s?.toLowerCase().includes(needle),
        )),
  );
}

// お店のある国の「今日」の日付（YYYY-MM-DD）。予約日のチェックに使う
export function todayIn(timeZone) {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date());
}
