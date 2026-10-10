// 国・通貨・言語が違っても正しく表示するためのヘルパー

// 国コード → その国でお店の人に通じる言語（店員さんに見せるカード用）
const COUNTRY_LANGUAGE = { JP: 'ja', KR: 'ko', CN: 'zh', TW: 'zh', FR: 'fr', TH: 'th', MX: 'es', ES: 'es' };

export const localLanguageOf = (country) => COUNTRY_LANGUAGE[country] ?? 'en';

// 例: formatMoney(1500, 'JPY', 'en') → "¥1,500"、formatMoney(18, 'EUR', 'ja') → "€18"
export function formatMoney(amount, currency, lang) {
  return new Intl.NumberFormat(lang, { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}

// 値段がわからないお店（OpenStreetMap から取り込んだお店など）は null
export const formatPriceRange = (p, lang) =>
  p.priceMin == null || p.priceMax == null
    ? null
    : `${formatMoney(p.priceMin, p.currency, lang)}–${formatMoney(p.priceMax, p.currency, lang)}`;

// 通貨の記号（JPY → ¥、KRW → ₩、EUR → €、THB → ฿ …）
export function currencySymbol(currency, lang = 'en') {
  try {
    return (
      new Intl.NumberFormat(lang, { style: 'currency', currency, currencyDisplay: 'narrowSymbol' })
        .formatToParts(0)
        .find((part) => part.type === 'currency')?.value ?? '$'
    );
  } catch {
    return '$';
  }
}

// 1〜4 の価格帯を、その国の通貨記号の数で表す（日本なら ¥¥、韓国なら ₩₩）。わからなければ空
export const priceLevelLabel = (level, currency = 'USD', lang = 'en') =>
  level ? currencySymbol(currency, lang).repeat(level) : '';

// 国コード → 国旗の絵文字（JP → 🇯🇵）
export const flag = (country) =>
  country && /^[A-Z]{2}$/.test(country)
    ? String.fromCodePoint(...[...country].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65))
    : '📍';

// ユーザーの言語がお店の国の言語と同じなら、現地表記の店名を大きく出す
export function placeNames(place, lang) {
  const local = place.localName && place.localName !== place.name ? place.localName : null;
  if (local && localLanguageOf(place.country) === lang) return { primary: local, secondary: place.name };
  return { primary: place.name, secondary: local };
}

// 国コード → 表示用の国名（ブラウザの機能で各言語に翻訳される）
export function countryName(code, lang) {
  try {
    return new Intl.DisplayNames([lang], { type: 'region' }).of(code);
  } catch {
    return code;
  }
}

// お店の一覧から、都市の一覧（国・通貨つき）を作る。フィルターや行き先の選択肢に使う
export function citiesOf(places) {
  const byName = new Map();
  for (const p of places) {
    if (byName.has(p.city)) continue;
    // 都市名の訳（{ ja: '那覇', ko: '나하' }）。表示は cityLabel() で
    const names = Object.fromEntries(
      Object.entries(p.translations ?? {}).flatMap(([lang, tr]) => (tr?.city ? [[lang, tr.city]] : [])),
    );
    byName.set(p.city, { name: p.city, names, country: p.country, currency: p.currency });
  }
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}
