import { prisma } from '../../lib/prisma.js';
import { methodNotAllowed, serverError } from '../../lib/http.js';
import { filterPlaces, parseFilters } from '../../lib/placeFilters.js';

// GET /api/places?q=&categories=cafe,bar&cities=Seoul&priceLevels=1,2&features=halal,vegetarian&minRating=4
// 条件の意味は lib/placeFilters.js を参照
export default async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);

  try {
    const [places, stats] = await Promise.all([
      // 一覧のサムネイル用に、いちばん新しい写真を1枚だけつける
      prisma.place.findMany({
        orderBy: { name: 'asc' },
        include: { photos: { orderBy: { createdAt: 'desc' }, take: 1, select: { url: true, kind: true } } },
      }),
      prisma.review.groupBy({ by: ['placeId'], _avg: { rating: true }, _count: true }),
    ]);
    const statsById = Object.fromEntries(stats.map((s) => [s.placeId, s]));
    const withRatings = places.map((p) => ({
      ...p,
      rating: statsById[p.id]?._avg.rating ?? null,
      reviewCount: statsById[p.id]?._count ?? 0,
    }));

    // お店が少ないうちは全件読んでから絞り込む。数千件を超えたらDB側の where に移す
    res.status(200).json(filterPlaces(withRatings, parseFilters(req.query)));
  } catch (err) {
    serverError(res, err);
  }
}
