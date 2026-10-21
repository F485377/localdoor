// 空き枠（サーバー側）。受付停止日・その日だけの定員・予約済みの人数を DB から読み、lib/domain.js のルールで計算する
import { BOOK_AHEAD_DAYS, addDays, dayOpen, jstDate, slotsFor } from './domain.js';
import { prisma } from './prisma.js';

// 複数の店の、from から days 日分：{ placeId: [{ date, open, slots: [{ time, capacity, left }], undecided?, markAs? }] }
//   undecided ＝ 日程がまだ決まっていない（ー。予約できない）、markAs ＝ 事業者が決めた印（〇 'o' か △ 'limited'）
export async function availabilityMany(places, from, days, db = prisma) {
  const ids = places.map((p) => p.id);
  if (!ids.length) return {};
  const to = addDays(from, days - 1);
  const [closures, booked, overrides, marks] = await Promise.all([
    db.closure.findMany({ where: { placeId: { in: ids }, date: { gte: from, lte: to } }, select: { placeId: true, date: true } }),
    db.booking.groupBy({
      by: ['placeId', 'date', 'time'],
      where: { placeId: { in: ids }, status: 'CONFIRMED', date: { gte: from, lte: to } },
      _sum: { partySize: true },
    }),
    db.slotOverride.findMany({ where: { placeId: { in: ids }, date: { gte: from, lte: to } } }),
    db.dayMark.findMany({ where: { placeId: { in: ids }, date: { gte: from, lte: to } } }),
  ]);
  const set = {};
  for (const m of marks) (set[m.placeId] ??= {})[m.date] = m.mark;
  const last = addDays(jstDate(), BOOK_AHEAD_DAYS);
  const caps = {};
  for (const o of overrides) ((caps[o.placeId] ??= {})[o.date] ??= {})[o.time] = o.capacity;
  const closed = {};
  for (const c of closures) (closed[c.placeId] ??= new Set()).add(c.date);
  const byPlace = {};
  for (const b of booked) ((byPlace[b.placeId] ??= {})[b.date] ??= {})[b.time] = b._sum.partySize ?? 0;
  const now = new Date();
  const out = {};
  for (const place of places) {
    out[place.id] = [];
    for (let i = 0; i < days; i++) {
      const date = addDays(from, i);
      const mark = set[place.id]?.[date];
      // 事業者が「ー」にした日と、予約できる期間より先の日は、まだ決まっていない
      const undecided = mark === 'none' || date > last;
      const open = !undecided && dayOpen(place, date, closed[place.id] ?? new Set(), now);
      const slots = open ? slotsFor(place, date, byPlace[place.id]?.[date] ?? {}, now, caps[place.id]?.[date]) : [];
      const day = { date, open: open && slots.length > 0, slots };
      if (undecided) day.undecided = true;
      else if (mark === 'o' || mark === 'limited') day.markAs = mark;
      out[place.id].push(day);
    }
  }
  return out;
}

// 1つの店の、from から days 日分
export async function availability(place, from, days, db = prisma) {
  return (await availabilityMany([place], from, days, db))[place.id];
}

export const today = () => jstDate();
