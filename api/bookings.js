// /api/bookings  旅行者の予約
//   GET ?availability=<placeId>&from=YYYY-MM-DD&days=N   空き枠（ログイン不要）
//   GET                                                   自分の予約（事業者のキャンセルは、この時点で「見た」にする）
//   POST   { placeId, date, time, partySize, diets, message }   予約（上限人数の内なら即時確定）
//   PATCH ?id=   { action: "cancel" }                     キャンセル（開始時刻まで無料）
import { availability } from '../lib/availability.js';
import { ALL_DIETS, MAX_FUTURE_BOOKINGS, MAX_MESSAGE, MAX_PARTY, isPast, jstDate } from '../lib/domain.js';
import { DATE_RE, TIME_RE, body, fail, int, listOf, requireUser, route, str } from '../lib/http.js';
import { travelerPlace } from '../lib/places.js';
import { prisma } from '../lib/prisma.js';
import { later } from '../lib/later.js';
import { notifyBusiness } from '../lib/notify.js';
import { translateText } from '../lib/translate.js';

import { VISIBLE } from '../lib/places.js';

function bookingView(b, lang, now = new Date()) {
  return {
    id: b.id,
    date: b.date,
    time: b.time,
    endTime: b.endTime,
    partySize: b.partySize,
    diets: b.diets,
    message: b.message,
    status: b.status === 'CONFIRMED' && isPast(b, now) ? 'COMPLETED' : b.status,
    cancelReason: b.cancelReason,
    cancelNote: b.cancelNote ? b.cancelNoteTr ?? b.cancelNote : null,
    cancelNoteTranslated: b.cancelNote ? Boolean(b.cancelNoteTr) : null,
    fresh: b.status === 'CANCELLED_BY_BUSINESS' && !b.travelerSeenAt,
    createdAt: b.createdAt,
    place: travelerPlace(b.place, { full: true, lang }),
  };
}

async function slots(q) {
  const place = await prisma.place.findFirst({ where: { id: str(q.availability, 40), ...VISIBLE } });
  if (!place) fail(404, 'This listing is not available');
  const from = DATE_RE.test(q.from ?? '') && q.from >= jstDate() ? q.from : jstDate();
  const days = int(q.days, { min: 1, max: 42, fallback: 35 });
  return { days: await availability(place, from, days) };
}

async function mine(req) {
  const user = await requireUser(req, 'TRAVELER');
  const rows = await prisma.booking.findMany({ where: { travelerId: user.id }, include: { place: true }, orderBy: [{ date: 'asc' }, { time: 'asc' }] });
  const unseen = rows.filter((b) => b.status === 'CANCELLED_BY_BUSINESS' && !b.travelerSeenAt).map((b) => b.id);
  if (unseen.length) await prisma.booking.updateMany({ where: { id: { in: unseen } }, data: { travelerSeenAt: new Date() } });
  return { bookings: rows.map((b) => bookingView(b, user.lang)) };
}

async function create(req) {
  const user = await requireUser(req, 'TRAVELER');
  const b = body(req);
  const date = DATE_RE.test(b.date ?? '') ? b.date : null;
  const time = TIME_RE.test(b.time ?? '') ? b.time : null;
  const partySize = int(b.partySize, { min: 1, max: MAX_PARTY });
  const message = str(b.message, MAX_MESSAGE);
  if (!date || !time || !partySize) fail(400, 'Choose a date, time and number of people', { code: 'missing' });
  const place = await prisma.place.findFirst({ where: { id: str(b.placeId, 40), ...VISIBLE } });
  if (!place) fail(404, 'This listing is not available');
  const thread = await prisma.thread.findUnique({ where: { placeId_travelerId: { placeId: place.id, travelerId: user.id } } });
  if (thread?.blocked) fail(403, 'You cannot book this place', { code: 'blocked' });
  const upcoming = await prisma.booking.count({ where: { travelerId: user.id, status: 'CONFIRMED', date: { gte: jstDate() } } });
  if (upcoming >= MAX_FUTURE_BOOKINGS) fail(409, `You can have up to ${MAX_FUTURE_BOOKINGS} upcoming bookings`, { code: 'limit' });

  // メッセージの日本語訳は、枠を押さえる前に作っておく（翻訳を待つ間ロックしない）
  const messageJa = message ? (user.lang === 'ja' ? message : await translateText(message, 'ja')) : null;

  // 店の設定（受付停止・未定・その日の定員）は先に読む。順番待ちの中では、予約済みの人数だけを数える（待ちを短くするため）
  const [day] = await availability(place, date, 1);
  const slot = day.open && day.slots.find((s) => s.time === time);
  if (!slot) fail(409, 'This time is no longer available', { code: 'unavailable' });
  const booking = await prisma.$transaction(
    async (tx) => {
      // 同じ店・同じ日の予約は1つずつ処理する（同時に予約されても上限を超えない）
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${place.id}:${date}`}))`;
      const sum = await tx.booking.aggregate({ where: { placeId: place.id, date, time, status: 'CONFIRMED' }, _sum: { partySize: true } });
      const left = Math.max(0, slot.capacity - (sum._sum.partySize ?? 0));
      if (left < partySize) fail(409, left ? `Only ${left} spots left for this time` : 'This time is fully booked', { code: 'full', left });
      return tx.booking.create({
        data: { placeId: place.id, travelerId: user.id, date, time, endTime: slot.end ?? null, partySize, diets: listOf(b.diets, ALL_DIETS), message, messageJa, lang: user.lang },
        include: { place: true },
      });
    },
    { maxWait: 10000, timeout: 15000 },
  );
  // 事業者にプッシュで知らせる
  later(
    notifyBusiness(booking.place.ownerId, {
      title: '新しい予約が入りました',
      body: `${booking.place.name}：${date} ${time}〜 ${partySize}名（${user.name} 様）`,
      path: '/biz',
      tag: `booking-${booking.id}`,
    }),
  );
  return { booking: bookingView(booking, user.lang) };
}

async function cancel(req) {
  const user = await requireUser(req, 'TRAVELER');
  if (body(req).action !== 'cancel') fail(400, 'Unknown action');
  const b = await prisma.booking.findFirst({ where: { id: str(req.query.id, 40), travelerId: user.id } });
  if (!b) fail(404, 'Booking not found');
  if (b.status !== 'CONFIRMED') fail(409, 'This booking is already cancelled');
  if (isPast(b)) fail(409, 'This booking has already started');
  const updated = await prisma.booking.update({
    where: { id: b.id },
    data: { status: 'CANCELLED_BY_TRAVELER', cancelledAt: new Date(), bizSeenAt: null }, // 事業者の画面に新着として出す
    include: { place: true },
  });
  later(
    notifyBusiness(updated.place.ownerId, {
      title: '予約がキャンセルされました',
      body: `${updated.place.name}：${updated.date} ${updated.time}〜 ${updated.partySize}名（${user.name} 様）`,
      path: '/biz',
      tag: `booking-${updated.id}`,
    }),
  );
  return { booking: bookingView(updated, user.lang) };
}

export default route({
  GET: (req) => (req.query.availability ? slots(req.query) : mine(req)),
  POST: create,
  PATCH: cancel,
});
