// ブラウザからは必ず /api 経由でデータを取得する（DBには直接つながない）
import { toQueryString } from '../lib/placeFilters.js';
import { demoApi } from './demoApi.js';
import { deviceId } from './device.js';

export const isDemo = import.meta.env.VITE_DEMO === '1';

// ログイン中は、IDトークンを Authorization ヘッダーに付けて送る（auth.jsx が設定する）
let getToken = () => Promise.resolve(null);
export const setTokenGetter = (fn) => (getToken = fn);

async function request(path, options = {}) {
  const token = await getToken().catch(() => null);
  const raw = options.body instanceof Blob; // 写真などはそのまま送る
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': raw ? options.body.type : 'application/json',
      'X-Haisai-Device': deviceId(),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    body: raw ? options.body : options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

const httpApi = {
  listPlaces: (filters) => request(`/api/places?${toQueryString(filters)}`),
  getPlace: (id) => request(`/api/places/${encodeURIComponent(id)}`),
  getGoogleReviews: (placeId, lang) =>
    request(`/api/google-reviews?placeId=${encodeURIComponent(placeId)}&lang=${lang}`),
  createReview: (body) => request('/api/reviews', { method: 'POST', body }),
  listMyReviews: () => request('/api/reviews?mine=1'),
  uploadPhoto: (reviewId, kind, blob) =>
    request(`/api/photos?reviewId=${encodeURIComponent(reviewId)}&kind=${kind}`, { method: 'POST', body: blob }),
  createReservation: (body) => request('/api/reservations', { method: 'POST', body }),
  listReservations: (email) =>
    request(email ? `/api/reservations?email=${encodeURIComponent(email)}` : '/api/reservations'),
  getRates: () => request('/api/rates'),
  getMe: () => request('/api/me'),
  saveMe: (profile) => request('/api/me', { method: 'PUT', body: profile }),
  cancelReservation: (id, email) =>
    request(`/api/reservations/${encodeURIComponent(id)}`, { method: 'PATCH', body: { action: 'cancel', email } }),
};

// デモ版ビルドではブラウザ内だけで動く API を使う
export const api = isDemo ? demoApi : httpApi;
