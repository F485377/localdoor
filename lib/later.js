// 返事を返したあとも、裏で処理を続ける（Vercel では waitUntil で関数を終わらせない。手元ではそのまま走らせる）
import { waitUntil } from '@vercel/functions';

export function later(promise) {
  const p = Promise.resolve(promise).catch((err) => console.error('later', err?.message ?? err));
  try {
    waitUntil(p);
  } catch {
    /* Vercel の外では何もしない（Promise はそのまま走る） */
  }
}
