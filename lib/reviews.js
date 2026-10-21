// 口コミの集計と、見る人の言語に合わせた形
import { LANGS, OCCASIONS, WITH_WHOM } from './domain.js';

export const REVIEW_VISIBLE = { hidden: false };

// グラフ用の集計：平均・星ごとの件数・誰と・どんな時に・雰囲気（平均）・人数（平均）
export function summarize(rows) {
  const count = rows.length;
  const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const withWhom = Object.fromEntries(WITH_WHOM.map((k) => [k, 0]));
  const occasion = Object.fromEntries(OCCASIONS.map((k) => [k, 0]));
  let sum = 0;
  let people = 0;
  const avg = (key) => {
    const xs = rows.map((r) => r[key]).filter((x) => Number.isInteger(x));
    return xs.length ? { value: Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10, count: xs.length } : null;
  };
  for (const r of rows) {
    dist[r.rating] += 1;
    sum += r.rating;
    people += r.people;
    if (r.withWhom in withWhom) withWhom[r.withWhom] += 1;
    if (r.occasion && r.occasion in occasion) occasion[r.occasion] += 1;
  }
  return {
    count,
    average: count ? Math.round((sum / count) * 10) / 10 : null,
    dist,
    withWhom,
    occasion,
    people: count ? Math.round((people / count) * 10) / 10 : null,
    calm: avg('calm'),
    special: avg('special'),
  };
}

// 書いた人の名前は、名（最初の語）だけ出す
const shortName = (u) => (u?.deletedAt ? null : String(u?.name ?? '').trim().split(/\s+/)[0] || null);

export function reviewView(r, lang, viewerId) {
  const l = LANGS.includes(lang) ? lang : 'en';
  const tr = r.lang === l ? null : r.i18n?.[l];
  return {
    id: r.id,
    rating: r.rating,
    withWhom: r.withWhom,
    people: r.people,
    occasion: r.occasion,
    religion: r.religion,
    calm: r.calm,
    special: r.special,
    comment: tr || r.comment,
    original: r.comment,
    translated: Boolean(tr && tr !== r.comment),
    author: shortName(r.traveler),
    sample: r.sample,
    mine: Boolean(viewerId && r.travelerId === viewerId),
    createdAt: r.createdAt,
  };
}
