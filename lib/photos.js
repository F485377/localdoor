// 写真の保存先（Vercel Blob）。事業者ごとのフォルダ places/<userId>/ に置く。
// BLOB_READ_WRITE_TOKEN がないと写真は保存できない（ほかの機能は動く）
import { del, put } from '@vercel/blob';
import { randomUUID } from 'node:crypto';

export const photosAvailable = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);
export const TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
export const MAX_BYTES = 4 * 1024 * 1024; // Vercel Functions に送れる本文の上限（4.5MB）より小さく

const folder = (user) => `places/${user.id}/`;

export async function savePhoto(user, data, type) {
  const blob = await put(`${folder(user)}${randomUUID()}.${TYPES[type]}`, data, { access: 'public', contentType: type, addRandomSuffix: false });
  return blob.url;
}

// この事業者がアップロードした写真か（ほかの人の写真や外部の URL は使わせない）
export function isOwnPhoto(user, url) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && u.hostname.endsWith('.blob.vercel-storage.com') && u.pathname.startsWith(`/${folder(user)}`);
  } catch {
    return false;
  }
}

export async function deletePhotos(urls) {
  if (!urls.length || !photosAvailable()) return;
  await del(urls).catch((err) => console.error('photos.delete', err.message));
}
