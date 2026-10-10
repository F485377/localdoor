// デモ版（VITE_DEMO=1 でビルド）用の API。サーバーやDBを使わず、ブラウザ内だけで動く。
// 口コミ・予約はこのブラウザの localStorage にだけ保存される。
import { filterPlaces, parseFilters, todayIn } from '../lib/placeFilters.js';
import { places as samplePlaces, sampleReviews } from '../prisma/sampleData.js';
import { withTranslations } from '../prisma/sampleTranslations.js';
import { deviceId } from './device.js';

// デモ版の写真は、ページを開いている間だけ覚えておく（端末の保存領域には大きすぎるため）
const memPhotos = [];
const photosOf = (filter) => memPhotos.filter(filter).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

const STORAGE_KEY = 'haisai-demo-v2';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const newId = () => Math.random().toString(36).slice(2, 12);

function initialState() {
  const places = samplePlaces.map((p, i) => ({ ...withTranslations(p), id: `place-${i + 1}`, googlePlaceId: null }));
  const reviews = places.flatMap((p) =>
    (sampleReviews[p.name] ?? []).map((r) => ({
      ...r,
      id: newId(),
      placeId: p.id,
      createdAt: new Date().toISOString(),
    })),
  );
  return { places, reviews, reservations: [] };
}

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    // 前に保存したお店には訳がないので、サンプルから足しなおす
    if (saved?.places?.length) return { ...saved, places: saved.places.map(withTranslations) };
  } catch {
    // 保存できない環境では毎回サンプルから始める
  }
  return initialState();
}

// 本番ビルドで丸ごと取り除けるよう、読み込みは初回アクセス時に行う
let state;
const db = () => (state ??= load());

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db()));
  } catch {
    // ignore
  }
}

function withRating(place) {
  const latest = photosOf((ph) => ph.placeId === place.id).slice(0, 1);
  return { ...withRatingOnly(place), photos: latest };
}

function withRatingOnly(place) {
  const ratings = db().reviews.filter((r) => r.placeId === place.id).map((r) => r.rating);
  return {
    ...place,
    rating: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null,
    reviewCount: ratings.length,
  };
}

const delay = (value) => new Promise((resolve) => setTimeout(() => resolve(structuredClone(value)), 150));
const fail = (message) => Promise.reject(new Error(message));

export const demoApi = {
  listPlaces: (filters) => {
    const all = db()
      .places.map(withRating)
      .sort((x, y) => x.name.localeCompare(y.name));
    return delay(filterPlaces(all, parseFilters(filters)));
  },

  getPlace: (id) => {
    const place = db().places.find((p) => p.id === id);
    if (!place) return fail('Place not found');
    const reviews = db()
      .reviews.filter((r) => r.placeId === id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((r) => ({ ...r, photos: photosOf((ph) => ph.reviewId === r.id).reverse() }));
    return delay({ ...withRatingOnly(place), reviews, photos: photosOf((ph) => ph.placeId === id) });
  },

  getGoogleReviews: () => delay({ available: false, reviews: [] }),

  listMyReviews: () => {
    const mine = db()
      .reviews.filter((r) => r.authorKey === deviceId())
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((r) => {
        const { id, name, localName, category, city, country, lat, lng, translations } = db().places.find(
          (p) => p.id === r.placeId,
        );
        return {
          ...r,
          place: { id, name, localName, category, city, country, lat, lng, translations },
          photos: photosOf((ph) => ph.reviewId === r.id).reverse(),
        };
      });
    return delay(mine);
  },

  uploadPhoto: (reviewId, kind, blob) => {
    const review = db().reviews.find((r) => r.id === reviewId);
    if (!review) return fail('Review not found');
    const photo = {
      id: newId(),
      placeId: review.placeId,
      reviewId,
      kind,
      url: URL.createObjectURL(blob),
      createdAt: new Date().toISOString(),
    };
    memPhotos.push(photo);
    return delay(photo);
  },

  createReview: ({ placeId, author, country, rating, comment }) => {
    if (!author?.trim() || !comment?.trim()) return fail('Name and comment are required');
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return fail('Rating must be 1-5');
    const review = {
      id: newId(),
      placeId,
      author: author.trim(),
      country: country?.trim() || null,
      rating,
      comment: comment.trim(),
      authorKey: deviceId(),
      createdAt: new Date().toISOString(),
    };
    db().reviews.push(review);
    save();
    return delay(review);
  },

  createReservation: (body) => {
    const place = db().places.find((p) => p.id === body.placeId);
    if (!place) return fail('Place not found');
    const email = body.email.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return fail('Valid email is required');
    if (body.date < todayIn(place.timeZone)) return fail('Date must be today or later');
    if (!Number.isInteger(body.partySize) || body.partySize < 1 || body.partySize > 20) {
      return fail('Party size must be 1-20');
    }
    const reservation = {
      id: newId(),
      placeId: place.id,
      name: body.name.trim(),
      email,
      date: body.date,
      time: body.time,
      partySize: body.partySize,
      note: body.note?.trim() || null,
      language: body.language,
      status: 'CONFIRMED',
      depositAmount: place.deposit,
      currency: place.currency,
      paymentStatus: 'AUTHORIZED',
      cardBrand: 'DEMO',
      cardLast4: '4242',
      createdAt: new Date().toISOString(),
    };
    db().reservations.push(reservation);
    save();
    return delay(reservation);
  },

  listReservations: (email) => {
    const target = email.trim().toLowerCase();
    if (!EMAIL_RE.test(target)) return fail('Valid email is required');
    const result = db().reservations
      .filter((r) => r.email === target)
      .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
      .map((r) => {
        const { id, name, localName, address, country } = db().places.find((p) => p.id === r.placeId);
        return { ...r, place: { id, name, localName, address, country } };
      });
    return delay(result);
  },

  // デモ版は外部に通信できないので、おおよその固定レート（1 USD あたり、2026年10月ごろ）を使う
  getRates: () =>
    delay({
      base: 'USD',
      updatedAt: 'sample',
      rates: { USD: 1, JPY: 158, KRW: 1343, EUR: 0.86, THB: 33, MXN: 18.5, TWD: 31.8, CNY: 7.1, HKD: 7.8, SGD: 1.3, GBP: 0.75, AUD: 1.5, CAD: 1.37, INR: 84, PHP: 57, IDR: 16300, VND: 25500, MYR: 4.2, BRL: 5.4 },
    }),

  // デモではプロフィールはこの端末に保存済みなので、サーバー保存は何もしない
  getMe: () => fail('No profile yet'),
  saveMe: (profile) => delay(profile),

  cancelReservation: (id, email) => {
    const r = db().reservations.find((x) => x.id === id && x.email === email.trim().toLowerCase());
    if (!r) return fail('Reservation not found');
    if (r.status === 'CANCELLED') return fail('Already cancelled');
    r.status = 'CANCELLED';
    r.paymentStatus = 'REFUNDED';
    save();
    return delay(r);
  },
};
