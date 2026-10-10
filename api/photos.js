import { put } from '@vercel/blob';
import { prisma } from '../lib/prisma.js';
import { currentUser } from '../lib/auth.js';
import { deviceKey } from '../lib/author.js';
import { badRequest, methodNotAllowed, serverError } from '../lib/http.js';

// POST /api/photos?reviewId=...&kind=food|interior
// 本文は画像そのもの（image/jpeg など）。ブラウザ側で小さくしてから送る（Vercel の上限 4.5MB より小さく）。
// 写真は口コミにつける。口コミを書いた本人（同じアカウントか同じ端末）しかつけられない。
const KINDS = ['food', 'interior', 'other'];
const TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const MAX_BYTES = 4 * 1024 * 1024;

async function readBody(req) {
  if (Buffer.isBuffer(req.body)) return req.body;
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BYTES) throw Object.assign(new Error('too large'), { status: 413 });
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  try {
    const type = String(req.headers['content-type'] ?? '').split(';')[0];
    if (!TYPES[type]) return badRequest(res, 'Send a JPEG, PNG or WebP image');
    const kind = KINDS.includes(req.query.kind) ? req.query.kind : 'other';

    const review = await prisma.review.findUnique({ where: { id: String(req.query.reviewId ?? '') } });
    if (!review) return res.status(404).json({ error: 'Review not found' });
    const me = await currentUser(req);
    const key = deviceKey(req);
    const owner = (me && review.userId === me.uid) || (key && review.authorKey === key);
    if (!owner) return res.status(403).json({ error: 'You can only add photos to your own review' });
    if ((await prisma.photo.count({ where: { reviewId: review.id } })) >= 4) {
      return badRequest(res, 'Up to 4 photos per review');
    }

    const data = await readBody(req);
    if (!data.length) return badRequest(res, 'Empty image');
    const blob = await put(`places/${review.placeId}/${review.id}-${Date.now()}.${TYPES[type]}`, data, {
      access: 'public',
      contentType: type,
    });
    const photo = await prisma.photo.create({
      data: { placeId: review.placeId, reviewId: review.id, kind, url: blob.url, pathname: blob.pathname },
    });
    res.status(201).json(photo);
  } catch (err) {
    if (err.status === 413) return res.status(413).json({ error: 'Image is too large (max 4MB)' });
    serverError(res, err);
  }
}
