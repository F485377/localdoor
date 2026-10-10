import { prisma } from '../../lib/prisma.js';
import { methodNotAllowed, serverError } from '../../lib/http.js';

// GET /api/places/:id  お店の詳細＋アプリ内の口コミ
export default async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);

  try {
    const place = await prisma.place.findUnique({
      where: { id: String(req.query.id) },
      include: {
        reviews: { orderBy: { createdAt: 'desc' }, include: { photos: { orderBy: { createdAt: 'asc' } } } },
        photos: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!place) return res.status(404).json({ error: 'Place not found' });

    const ratings = place.reviews.map((r) => r.rating);
    const rating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
    const reviews = place.reviews.map(({ userId, authorKey, ...r }) => r); // 書いた人の目印は外に出さない
    res.status(200).json({ ...place, reviews, rating, reviewCount: ratings.length });
  } catch (err) {
    serverError(res, err);
  }
}
