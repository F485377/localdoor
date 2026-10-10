import { prisma } from '../../lib/prisma.js';
import { badRequest, methodNotAllowed, serverError, str } from '../../lib/http.js';
import { currentUser } from '../../lib/auth.js';
import { refundDeposit } from '../../lib/payments.js';

// PATCH /api/reservations/:id  { action: "cancel", email }
// キャンセルするとデポジットが返金される。ログイン中ならアカウント、そうでなければ予約時のメールで本人確認する。
export default async function handler(req, res) {
  if (req.method !== 'PATCH') return methodNotAllowed(res, ['PATCH']);

  try {
    const body = req.body ?? {};
    if (body.action !== 'cancel') return badRequest(res, 'Unsupported action');
    const email = str(body.email, 200).toLowerCase();

    const me = await currentUser(req);
    const reservation = await prisma.reservation.findUnique({ where: { id: String(req.query.id) } });
    const owner =
      reservation && ((me && reservation.userId === me.uid) || (email && reservation.email === email));
    if (!owner) {
      return res.status(404).json({ error: 'Reservation not found' });
    }
    if (reservation.status === 'CANCELLED') return badRequest(res, 'Already cancelled');

    const refund = await refundDeposit(reservation);
    const updated = await prisma.reservation.update({
      where: { id: reservation.id },
      data: { status: 'CANCELLED', paymentStatus: refund.status },
    });
    res.status(200).json(updated);
  } catch (err) {
    serverError(res, err);
  }
}
