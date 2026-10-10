import { prisma } from '../lib/prisma.js';
import { currentUser } from '../lib/auth.js';
import { deviceKey } from '../lib/author.js';
import { badRequest, methodNotAllowed, serverError, str } from '../lib/http.js';

// POST /api/reviews         口コミを書く { placeId, author, country, rating, comment }
// GET  /api/reviews?mine=1  自分の口コミ（お店と写真つき）。ログイン中ならアカウント、そうでなければこの端末の分
export default async function handler(req, res) {
  try {
    const me = await currentUser(req);
    const key = deviceKey(req);

    if (req.method === 'GET') {
      if (req.query.mine !== '1') return badRequest(res, 'Use ?mine=1');
      const owners = [me && { userId: me.uid }, key && { authorKey: key }].filter(Boolean);
      if (!owners.length) return res.status(200).json([]);
      const reviews = await prisma.review.findMany({
        where: { OR: owners },
        include: {
          place: {
            select: { id: true, name: true, localName: true, category: true, city: true, country: true, lat: true, lng: true, translations: true },
          },
          photos: { orderBy: { createdAt: 'asc' } },
        },
        orderBy: { createdAt: 'desc' },
      });
      return res.status(200).json(reviews);
    }

    if (req.method === 'POST') {
      const body = req.body ?? {};
      const placeId = str(body.placeId, 50);
      const author = str(body.author, 50);
      const country = str(body.country, 50) || null;
      const comment = str(body.comment, 1000);
      const rating = Number(body.rating);

      if (!placeId || !author || !comment) return badRequest(res, 'placeId, author and comment are required');
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) return badRequest(res, 'rating must be 1-5');

      const place = await prisma.place.findUnique({ where: { id: placeId }, select: { id: true } });
      if (!place) return res.status(404).json({ error: 'Place not found' });

      const review = await prisma.review.create({
        data: { placeId, author, country, rating, comment, userId: me?.uid ?? null, authorKey: key },
        include: { photos: true },
      });
      return res.status(201).json(review);
    }

    return methodNotAllowed(res, ['GET', 'POST']);
  } catch (err) {
    serverError(res, err);
  }
}
