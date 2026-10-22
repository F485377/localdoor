// 事業者へのお知らせ：プッシュ通知（スマホ・パソコン）。メールでは送らない。
//   新しい予約・お客様のキャンセル・お客様からのメッセージで送る。
//   お客様のメッセージに2分たっても返信がなければ、もう一度プッシュで知らせる（remindUnreplied）。
// VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT があるときだけ送る
import webpush from 'web-push';
import { prisma } from './prisma.js';

export const REMIND_MS = 2 * 60 * 1000;

let ready = null;
function pushReady() {
  if (ready !== null) return ready;
  const { VAPID_PUBLIC_KEY: pub, VAPID_PRIVATE_KEY: priv, VAPID_SUBJECT: subject } = process.env;
  ready = Boolean(pub && priv);
  if (ready) webpush.setVapidDetails(subject || 'mailto:noreply@example.com', pub, priv);
  return ready;
}
export const pushPublicKey = () => (pushReady() ? process.env.VAPID_PUBLIC_KEY : null);

// 宛先を覚える（同じブラウザは上書き）
export async function saveSubscription(userId, sub) {
  const endpoint = typeof sub?.endpoint === 'string' ? sub.endpoint.slice(0, 1000) : '';
  const p256dh = typeof sub?.keys?.p256dh === 'string' ? sub.keys.p256dh.slice(0, 200) : '';
  const auth = typeof sub?.keys?.auth === 'string' ? sub.keys.auth.slice(0, 100) : '';
  if (!/^https:\/\//.test(endpoint) || !p256dh || !auth) return false;
  await prisma.pushSub.upsert({ where: { endpoint }, create: { userId, endpoint, p256dh, auth }, update: { userId, p256dh, auth } });
  return true;
}

async function pushTo(userId, payload) {
  if (!pushReady()) return 0;
  const subs = await prisma.pushSub.findMany({ where: { userId } });
  let sent = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), { TTL: 60 * 60, urgency: 'high' });
        sent += 1;
      } catch (err) {
        // もう使えない宛先（アプリを消した・通知を切った）は消す
        if (err?.statusCode === 404 || err?.statusCode === 410) await prisma.pushSub.delete({ where: { id: s.id } }).catch(() => {});
        else console.error('push', err?.statusCode, err?.body ?? err?.message);
      }
    }),
  );
  return sent;
}

// 事業者に知らせる。tag が同じ通知は、上書きしてもう一度鳴らす
export async function notifyBusiness(ownerId, { title, body, path = '/biz', tag }) {
  return pushTo(ownerId, { title, body, url: path, tag: tag ?? path });
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// お客様のメッセージ（sentAt）のあと、2分たっても事業者が返信していなければ、もう一度知らせる
export async function remindUnreplied(threadId, sentAt) {
  await wait(REMIND_MS);
  const t = await prisma.thread.findUnique({ where: { id: threadId }, include: { place: true, traveler: true } });
  if (!t || t.blocked || t.place.deletedAt) return;
  const replied = t.lastBizAt && t.lastBizAt >= sentAt;
  // 2分の間に、お客様がもっと新しいメッセージを送っていたら、そちらの見張りに任せる
  const newer = t.lastTravelerAt && t.lastTravelerAt > sentAt;
  if (replied || newer) return;
  await notifyBusiness(t.place.ownerId, {
    title: 'まだ返信していないメッセージがあります',
    body: `${t.traveler?.name ?? 'お客様'} 様（${t.place.name}）へのお返事を待っています。`,
    path: `/biz/chats/${t.id}`,
    tag: `chat-${t.id}`,
  });
}
