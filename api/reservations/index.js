import { prisma } from '../../lib/prisma.js';
import { EMAIL_RE, badRequest, methodNotAllowed, serverError, str } from '../../lib/http.js';
import { currentUser } from '../../lib/auth.js';
import { authorizeDeposit } from '../../lib/payments.js';
import { todayIn } from '../../lib/placeFilters.js';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

// GET  /api/reservations          ログイン中なら、そのアカウントの予約一覧
// GET  /api/reservations?email=   ログインしていないときは、予約時のメールで探す
// POST /api/reservations          予約作成（デポジットを仮押さえ。ログイン中ならアカウントに結びつける）
export default async function handler(req, res) {
  try {
    const me = await currentUser(req);

    if (req.method === 'GET') {
      let where;
      if (me) {
        where = { userId: me.uid };
      } else {
        const email = str(req.query.email, 200).toLowerCase();
        if (!EMAIL_RE.test(email)) return badRequest(res, 'Valid email is required');
        where = { email };
      }
      const reservations = await prisma.reservation.findMany({
        where,
        include: {
          place: { select: { id: true, name: true, localName: true, address: true, country: true } },
        },
        orderBy: [{ date: 'asc' }, { time: 'asc' }],
      });
      return res.status(200).json(reservations);
    }

    if (req.method === 'POST') {
      const body = req.body ?? {};
      const placeId = str(body.placeId, 50);
      const name = str(body.name, 100);
      const email = str(body.email, 200).toLowerCase();
      const date = str(body.date, 10);
      const time = str(body.time, 5);
      const note = str(body.note, 500) || null;
      const language = str(body.language, 10) || 'en';
      const partySize = Number(body.partySize);

      if (!placeId || !name) return badRequest(res, 'placeId and name are required');
      if (!EMAIL_RE.test(email)) return badRequest(res, 'Valid email is required');
      if (!DATE_RE.test(date)) return badRequest(res, 'Date must be YYYY-MM-DD');
      if (!TIME_RE.test(time)) return badRequest(res, 'Time must be HH:mm');
      if (!Number.isInteger(partySize) || partySize < 1 || partySize > 20) {
        return badRequest(res, 'Party size must be 1-20');
      }

      const place = await prisma.place.findUnique({ where: { id: placeId } });
      if (!place) return res.status(404).json({ error: 'Place not found' });
      if (place.deposit == null) return badRequest(res, 'This place does not take bookings on Haisai yet');
      // 日付はお店の国の「今日」と比べる
      if (date < todayIn(place.timeZone)) return badRequest(res, 'Date must be today or later');

      const payment = await authorizeDeposit({ amount: place.deposit });
      const reservation = await prisma.reservation.create({
        data: {
          placeId, name, email, date, time, partySize, note, language,
          userId: me?.uid ?? null,
          depositAmount: payment.amount,
          currency: place.currency,
          paymentStatus: payment.status,
          cardBrand: payment.cardBrand,
          cardLast4: payment.cardLast4,
        },
      });
      return res.status(201).json(reservation);
    }

    return methodNotAllowed(res, ['GET', 'POST']);
  } catch (err) {
    serverError(res, err);
  }
}
