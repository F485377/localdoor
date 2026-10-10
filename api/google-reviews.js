import { prisma } from '../lib/prisma.js';
import { methodNotAllowed, serverError, str } from '../lib/http.js';

// GET /api/google-reviews?placeId=&lang=en
// Google Places API (New) から口コミを取得する。キー未設定なら { available: false }。
export default async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  try {
    const place = await prisma.place.findUnique({
      where: { id: str(req.query.placeId, 50) },
      select: { googlePlaceId: true },
    });
    if (!apiKey || !place?.googlePlaceId) return res.status(200).json({ available: false, reviews: [] });

    const lang = str(req.query.lang, 10) || 'en';
    const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(place.googlePlaceId)}?languageCode=${encodeURIComponent(lang)}`;
    const gRes = await fetch(url, {
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'rating,userRatingCount,reviews,googleMapsUri',
      },
    });
    if (!gRes.ok) {
      console.error('Google Places error', gRes.status, await gRes.text());
      return res.status(200).json({ available: false, reviews: [] });
    }
    const data = await gRes.json();

    res.setHeader('Cache-Control', 's-maxage=3600');
    res.status(200).json({
      available: true,
      rating: data.rating ?? null,
      userRatingCount: data.userRatingCount ?? 0,
      googleMapsUri: data.googleMapsUri ?? null,
      reviews: (data.reviews ?? []).map((r) => ({
        author: r.authorAttribution?.displayName ?? 'Google user',
        rating: r.rating,
        text: r.text?.text ?? r.originalText?.text ?? '',
        relativeTime: r.relativePublishTimeDescription ?? '',
      })),
    });
  } catch (err) {
    serverError(res, err);
  }
}
