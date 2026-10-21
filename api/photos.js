// /api/photos  事業者の写真のアップロード
//   POST（本文は画像そのもの。Content-Type: image/jpeg | image/png | image/webp）→ { url }
//   画面側で送る前に小さくしておく（src/photos.js）。保存したら店舗の情報で URL を使う
import { throttle } from '../lib/auth.js';
import { fail, requireUser, route } from '../lib/http.js';
import { MAX_BYTES, TYPES, photosAvailable, savePhoto } from '../lib/photos.js';

async function readBody(req) {
  if (Buffer.isBuffer(req.body)) return req.body; // Vercel が読み込み済みのとき
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BYTES) fail(413, '写真が大きすぎます');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export default route({
  POST: async (req) => {
    const user = await requireUser(req, 'BUSINESS');
    if (!photosAvailable()) fail(503, '写真の保存先が設定されていません');
    const type = String(req.headers['content-type'] ?? '').split(';')[0].trim();
    if (!TYPES[type]) fail(415, 'JPEG・PNG・WebP の写真を選んでください');
    if (!(await throttle(`photo:${user.id}`, 60, 60))) fail(429, '写真の送信が多すぎます。少し待ってからもう一度お試しください');
    const data = await readBody(req);
    if (!data.length) fail(400, '写真が空です');
    if (data.length > MAX_BYTES) fail(413, '写真が大きすぎます');
    return { url: await savePhoto(user, data, type) };
  },
});

// 画像はそのまま読む（JSON として解析しない）
export const config = { api: { bodyParser: false } };
