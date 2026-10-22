// /api/messages  翻訳チャット（店舗と旅行者の組ごとに1スレッド）
//   GET                    自分のスレッド一覧（旅行者：店ごと、事業者：旅行者ごと）
//   GET ?id=               スレッドとメッセージ（開いたら既読にする）
//   GET ?placeId=          旅行者：その店とのスレッド（なければ thread: null）
//   GET ?travelerId=&shop= 事業者：その店舗を予約したお客様とのスレッド（なければ thread: null）
//   POST { id?, placeId?, travelerId?, text }   送る。旅行者は placeId、事業者は placeId（自分の店舗）と予約したお客様の travelerId で新しく始められる
//   POST ?action=block { id, blocked } 事業者：相手をブロック／解除
import { later } from '../lib/later.js';
import { notifyBusiness, remindUnreplied } from '../lib/notify.js';
import { MAX_MESSAGE } from '../lib/domain.js';
import { body, fail, requireUser, route, str } from '../lib/http.js';
import { throttle } from '../lib/auth.js';
import { prisma } from '../lib/prisma.js';
import { templateOf } from '../lib/templates.js';
import { translateAvailable, translateText } from '../lib/translate.js';

const isNew = (at, readAt) => Boolean(at && (!readAt || at > readAt));

// 事業者の店舗（複数持てる）。placeId がなく、店舗が1つだけならその店舗
async function bizPlace(user, placeId) {
  const where = placeId ? { id: str(placeId, 40), ownerId: user.id, deletedAt: null } : { ownerId: user.id, deletedAt: null };
  const places = await prisma.place.findMany({ where, take: 2 });
  if (places.length !== 1) fail(404, places.length ? '店舗を選んでください' : '店舗が見つかりません');
  return places[0];
}

// 見る人の言語で出す：相手のメッセージは訳（なければ原文）、自分のはそのまま。日本語の旅行者には、お店の返信は原文のまま
function messageView(m, viewerIsBiz, lang = 'en') {
  const mine = m.fromBiz === viewerIsBiz;
  const same = !viewerIsBiz && lang === 'ja';
  return {
    id: m.id,
    mine,
    text: mine || same ? m.text : m.translated ?? m.text,
    original: m.text,
    translated: mine || same ? null : m.translated != null && m.translated !== m.text,
    templateId: m.templateId ?? null,
    createdAt: m.createdAt,
  };
}

function threadView(t, viewerIsBiz, lang = 'en') {
  const last = t.messages?.[0];
  return {
    id: t.id,
    placeId: t.placeId,
    placeName: (t.place?.translatedAt && t.place?.i18n?.[lang]?.name) || t.place?.name,
    placeNameJa: t.place?.name,
    travelerName: t.traveler?.deletedAt ? null : t.traveler?.name,
    travelerLeft: Boolean(t.traveler?.deletedAt),
    blocked: t.blocked,
    lastMessageAt: t.lastMessageAt,
    unread: viewerIsBiz ? isNew(t.lastTravelerAt, t.bizReadAt) : isNew(t.lastBizAt, t.travelerReadAt),
    preview: last ? messageView(last, viewerIsBiz, lang).text.slice(0, 80) : '',
  };
}

const LIST_INCLUDE = { place: true, traveler: true, messages: { orderBy: { createdAt: 'desc' }, take: 1 } };

async function list(user) {
  const isBiz = user.role === 'BUSINESS';
  const where = isBiz ? { place: { ownerId: user.id } } : { travelerId: user.id };
  const threads = await prisma.thread.findMany({ where, include: LIST_INCLUDE, orderBy: { lastMessageAt: 'desc' } });
  return { threads: threads.map((t) => threadView(t, isBiz, user.lang)) };
}

async function findThread(user, id) {
  const t = await prisma.thread.findUnique({ where: { id }, include: { place: true, traveler: true } });
  const ok = t && (user.role === 'BUSINESS' ? t.place.ownerId === user.id : t.travelerId === user.id);
  if (!ok) fail(404, 'Conversation not found');
  return t;
}

// 読む人の言語にそろえる。
//   事業者：旅行者のメッセージで、まだ日本語になっていないものを訳す（何語で書かれていても日本語で読める）
//   旅行者：お店の返信を、今の旅行者の言語で読めるようにする（言語を変えたら訳し直す）
// 定型文は決まった訳を使う。訳したものは保存して、次からは訳さない
async function localize(messages, isBiz, lang) {
  const jobs = messages.slice(-40).map(async (m) => {
    if (isBiz && !m.fromBiz && m.translated == null) {
      const tpl = m.templateId && templateOf('traveler', m.templateId);
      const ja = tpl ? tpl.ja : translateAvailable() ? await translateText(m.text, 'ja') : null;
      if (ja) Object.assign(m, await prisma.message.update({ where: { id: m.id }, data: { translated: ja } }));
    }
    if (!isBiz && m.fromBiz && lang !== 'ja' && (m.lang !== lang || m.translated == null)) {
      const tpl = m.templateId && templateOf('business', m.templateId);
      const tr = tpl ? tpl[lang] : translateAvailable() ? await translateText(m.text, lang) : null;
      if (tr) Object.assign(m, await prisma.message.update({ where: { id: m.id }, data: { translated: tr, lang } }));
    }
  });
  await Promise.all(jobs);
  return messages;
}

async function open(user, id) {
  const isBiz = user.role === 'BUSINESS';
  const t = await findThread(user, id);
  const messages = await localize(await prisma.message.findMany({ where: { threadId: t.id }, orderBy: { createdAt: 'asc' }, take: 500 }), isBiz, user.lang);
  await prisma.thread.update({ where: { id: t.id }, data: isBiz ? { bizReadAt: new Date() } : { travelerReadAt: new Date() } });
  return { thread: threadView({ ...t, messages: [] }, isBiz, user.lang), messages: messages.map((m) => messageView(m, isBiz, user.lang)) };
}

async function send(req, user) {
  const isBiz = user.role === 'BUSINESS';
  const b = body(req);
  const text = str(b.text, MAX_MESSAGE);
  if (!text) fail(400, isBiz ? 'メッセージを入力してください' : 'Write a message');
  if (!(await throttle(`msg:${user.id}`, 30, 10))) fail(429, isBiz ? '送信が多すぎます。少し待ってから送ってください' : 'Too many messages. Please wait a few minutes.');

  let thread;
  if (b.id) {
    thread = await findThread(user, str(b.id, 40));
  } else if (!isBiz && b.placeId) {
    const place = await prisma.place.findFirst({ where: { id: str(b.placeId, 40), published: true, suspended: false, deletedAt: null } });
    if (!place) fail(404, 'This listing is not available');
    thread = await prisma.thread.upsert({
      where: { placeId_travelerId: { placeId: place.id, travelerId: user.id } },
      create: { placeId: place.id, travelerId: user.id },
      update: {},
    });
  } else if (isBiz && b.travelerId) {
    const place = await bizPlace(user, b.placeId);
    const travelerId = await bookedTraveler(place, str(b.travelerId, 40));
    thread = await prisma.thread.upsert({
      where: { placeId_travelerId: { placeId: place.id, travelerId } },
      create: { placeId: place.id, travelerId },
      update: {},
      include: { traveler: true },
    });
  } else fail(400, 'Unknown conversation');
  if (thread.blocked && !isBiz) fail(403, 'You cannot send messages to this place', { code: 'blocked' });
  if (!isBiz && b.id && (!thread.place?.published || thread.place?.suspended)) fail(409, 'This place is no longer listed', { code: 'unlisted' });
  if (isBiz && thread.traveler?.deletedAt) fail(409, 'このお客様は退会しています');

  // 旅行者の文は日本語に、事業者の文は旅行者の言語に訳す
  const travelerLang = isBiz ? (thread.traveler ?? (await prisma.user.findUnique({ where: { id: thread.travelerId } }))).lang : user.lang;
  // 定型文をそのまま送ったときは、決まった訳を使う（翻訳 API を使わない）
  const tpl = b.templateId ? templateOf(isBiz ? 'business' : 'traveler', str(b.templateId, 20)) : null;
  const fromTemplate = tpl && tpl[isBiz ? 'ja' : user.lang] === text;
  const target = isBiz ? travelerLang : 'ja';
  // 日本語を使う旅行者とのやりとりは訳さない
  const translated = travelerLang === 'ja' ? text : fromTemplate ? tpl[target] : await translateText(text, target);
  const now = new Date();
  const message = await prisma.message.create({ data: { threadId: thread.id, fromBiz: isBiz, text, translated, lang: travelerLang, templateId: fromTemplate ? tpl.id : null } });
  await prisma.thread.update({
    where: { id: thread.id },
    data: isBiz ? { lastMessageAt: now, lastBizAt: now, bizReadAt: now } : { lastMessageAt: now, lastTravelerAt: now, travelerReadAt: now },
  });
  // お客様からのメッセージは、事業者にすぐ知らせ、2分たっても返信がなければもう一度知らせる
  if (!isBiz) {
    const place = thread.place ?? (await prisma.place.findUnique({ where: { id: thread.placeId } }));
    later(
      (async () => {
        await notifyBusiness(place.ownerId, {
          title: `${user.name} 様からメッセージ`,
          body: `${place.name}：${(translated ?? text).slice(0, 80)}`,
          path: `/biz/chats/${thread.id}`,
          tag: `chat-${thread.id}`,
        });
        await remindUnreplied(thread.id, now);
      })(),
    );
  }
  return { threadId: thread.id, message: messageView(message, isBiz, user.lang) };
}

// 事業者から話しかけられるのは、自分の店を予約したお客様だけ
async function bookedTraveler(place, travelerId) {
  const booking = await prisma.booking.findFirst({ where: { placeId: place.id, travelerId }, include: { traveler: true } });
  if (!booking) fail(404, 'このお客様の予約が見つかりません');
  if (booking.traveler.deletedAt) fail(409, 'このお客様は退会しています');
  return travelerId;
}

async function block(req, user) {
  if (user.role !== 'BUSINESS') fail(403, 'Forbidden');
  const b = body(req);
  const t = await findThread(user, str(b.id, 40));
  await prisma.thread.update({ where: { id: t.id }, data: { blocked: b.blocked === true } });
  return { ok: true };
}

export default route({
  GET: async (req) => {
    const user = await requireUser(req);
    if (req.query.id) return open(user, str(req.query.id, 40));
    if (req.query.placeId) {
      if (user.role !== 'TRAVELER') fail(403, 'Forbidden');
      const t = await prisma.thread.findUnique({ where: { placeId_travelerId: { placeId: str(req.query.placeId, 40), travelerId: user.id } } });
      return t ? open(user, t.id) : { thread: null, messages: [] };
    }
    if (req.query.travelerId) {
      if (user.role !== 'BUSINESS') fail(403, 'Forbidden');
      const place = await bizPlace(user, req.query.shop);
      const travelerId = await bookedTraveler(place, str(req.query.travelerId, 40));
      const t = await prisma.thread.findUnique({ where: { placeId_travelerId: { placeId: place.id, travelerId } } });
      return t ? open(user, t.id) : { thread: null, messages: [] };
    }
    return list(user);
  },
  POST: async (req) => {
    const user = await requireUser(req);
    return req.query.action === 'block' ? block(req, user) : send(req, user);
  },
});
