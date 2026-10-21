// 2026-10-20 のデータ移行：支払い方法（1つ）→ 支払方法（複数）、営業年数の区分 → 創業年。
//   DB_SCHEMA=<スキーマ> dotenv -e .env.local -- node scripts/migrate-payments-founded.js
// - payments：「現金のみ」→ [現金]、「カード可」→ [現金, カード]（まだ空のお店だけ）
// - foundedYear：デモの店（sample）だけ、区分の範囲の中で決まった年を入れる。
//   本物のお店は推測で入れない（次に店舗を保存するときに、事業者が創業年を入れる）
import { DB_SCHEMA } from '../lib/dbUrl.js';
import { prisma } from '../lib/prisma.js';

const RANGE = { gt30: [1950, 1994], '10to30': [1997, 2015], lt10: [2017, 2025] };
// 店の id から決まる数（何度実行しても同じ年になる）
const hash = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

const places = await prisma.place.findMany({ select: { id: true, sample: true, payment: true, payments: true, years: true, foundedYear: true } });
let pay = 0;
let founded = 0;
for (const p of places) {
  const data = {};
  if (!p.payments.length && p.payment) data.payments = p.payment === 'card' ? ['cash', 'card'] : ['cash'];
  if (p.sample && p.foundedYear == null && RANGE[p.years]) {
    const [lo, hi] = RANGE[p.years];
    data.foundedYear = lo + (hash(p.id) % (hi - lo + 1));
  }
  if (Object.keys(data).length) await prisma.place.update({ where: { id: p.id }, data });
  if (data.payments) pay++;
  if (data.foundedYear) founded++;
}
console.log(`${DB_SCHEMA}: ${places.length} 店のうち、支払方法 ${pay} 店・創業年 ${founded} 店を移しました`);
await prisma.$disconnect();
