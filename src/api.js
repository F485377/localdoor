// ブラウザからは必ず /api 経由でデータを取得する（DB には直接つながない）。
// ログインは Cookie（HttpOnly）なので、ここではトークンを扱わない。
// 旅行者と事業者でログインを分けているので、どちらの画面からの呼び出しかをヘッダーで伝える

let side = 'traveler';
export const setSide = (s) => {
  side = s;
};
const sideHeader = () => ({ 'X-Jimoto-As': side });

export class ApiError extends Error {
  constructor(status, message, data = {}) {
    super(message);
    this.status = status;
    this.code = data.code;
    this.data = data;
  }
}

async function request(path, { method = 'GET', body, query, as } = {}) {
  const entries = Object.entries(query ?? {}).filter(([, v]) => v !== undefined && v !== null && v !== '');
  const qs = entries.length ? `?${new URLSearchParams(entries.map(([k, v]) => [k, String(v)]))}` : '';
  let res;
  try {
    res = await fetch(`/api/${path}${qs}`, {
      method,
      credentials: 'same-origin',
      headers: { ...(as ? { 'X-Jimoto-As': as } : sideHeader()), ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'network', { code: 'network' });
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error || `Request failed (${res.status})`, data);
  return data;
}

// 写真を送る（本文は画像そのもの。先に src/photos.js で小さくしておく）→ { url }
async function uploadPhoto(blob) {
  let res;
  try {
    res = await fetch('/api/photos', { method: 'POST', credentials: 'same-origin', headers: { 'X-Jimoto-As': 'business', 'Content-Type': blob.type || 'image/jpeg' }, body: blob });
  } catch {
    throw new ApiError(0, 'network', { code: 'network' });
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error || `Upload failed (${res.status})`, data);
  return data;
}

export const api = {
  // アカウント
  me: (as) => request('auth', { as }),
  register: (body) => request('auth', { method: 'POST', query: { action: 'register' }, body }),
  login: (body) => request('auth', { method: 'POST', query: { action: 'login' }, body }),
  logout: (as) => request('auth', { method: 'POST', query: { action: 'logout' }, as }),
  forgot: (email) => request('auth', { method: 'POST', query: { action: 'forgot' }, body: { email } }),
  reset: (token, password) => request('auth', { method: 'POST', query: { action: 'reset' }, body: { token, password } }),
  updateMe: (body) => request('auth', { method: 'PATCH', body }),
  withdraw: (password) => request('auth', { method: 'DELETE', body: { password } }),
  // 店舗（旅行者）
  places: (filters) => request('places', { query: filters }),
  place: (id, lang) => request('places', { query: { id, lang } }),
  report: (body) => request('places', { method: 'POST', query: { action: 'report' }, body }),
  reviews: (id, lang) => request('places', { query: { reviews: id, lang } }),
  writeReview: (body) => request('places', { method: 'POST', query: { action: 'review' }, body }),
  saved: (lang) => request('places', { query: { saved: 1, lang } }),
  savedIds: () => request('places', { query: { savedIds: 1 } }),
  save: (placeId, saved) => request('places', { method: 'POST', query: { action: 'save' }, body: { placeId, saved } }),
  rates: () => request('rates'),
  // 予約（旅行者）
  availability: (placeId, from, days) => request('bookings', { query: { availability: placeId, from, days } }),
  bookings: () => request('bookings'),
  book: (body) => request('bookings', { method: 'POST', body }),
  cancelBooking: (id) => request('bookings', { method: 'PATCH', query: { id }, body: { action: 'cancel' } }),
  // チャット（旅行者・事業者）
  threads: () => request('messages'),
  thread: (id) => request('messages', { query: { id } }),
  threadForPlace: (placeId) => request('messages', { query: { placeId } }),
  threadForTraveler: (travelerId, shop) => request('messages', { query: { travelerId, shop } }),
  send: (body) => request('messages', { method: 'POST', body }),
  block: (id, blocked) => request('messages', { method: 'POST', query: { action: 'block' }, body: { id, blocked } }),
  // キャラクターとのおしゃべり（旅行者）
  buddy: (body) => request('buddy', { method: 'POST', body }),
  // 事業者
  uploadPhoto,
  bizPlaces: () => request('biz'),
  pushInfo: () => request('biz', { query: { view: 'push' } }),
  savePush: (subscription, test = false) => request('biz', { method: 'POST', query: { action: 'push' }, body: { subscription, test } }),
  bizPlace: (id) => request('biz', { query: { id } }),
  bizBookings: () => request('biz', { query: { view: 'bookings' } }),
  savePlace: (body, id) => request('biz', { method: 'PUT', query: { action: 'place', id }, body }),
  bizCalendar: (id, from, days) => request('biz', { query: { view: 'calendar', id, from, days } }),
  saveDay: (body) => request('biz', { method: 'PUT', query: { action: 'day' }, body }),
  closures: (body) => request('biz', { method: 'PUT', query: { action: 'closures' }, body }),
  deletePlace: (id) => request('biz', { method: 'POST', query: { action: 'delete' }, body: { id } }),
  bizCancel: (body) => request('biz', { method: 'POST', query: { action: 'cancel' }, body }),
};
