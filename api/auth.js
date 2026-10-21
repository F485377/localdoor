// /api/auth  アカウント（旅行者・事業者で共通）
//   GET                       ログイン中のユーザーと、画面上の新着の数
//   POST ?action=register     { role, email, password, name, agree }
//   POST ?action=login        { role, email, password }
//   POST ?action=logout
//   POST ?action=forgot       { email }            パスワード再設定のメール
//   POST ?action=reset        { token, password }
//   PATCH                     { name?, currency? }
//   DELETE                    { password }         退会
import { burnTime, clearThrottle, currentUser, endSession, hashPassword, newToken, publicUser, sha256, startSession, throttle, verifyPassword } from '../lib/auth.js';
import { CURRENCIES, LANGS, PASSWORD_MIN, jstDate } from '../lib/domain.js';
import { EMAIL_RE, body, clientIp, fail, oneOf, requireUser, route, str } from '../lib/http.js';
import { appUrl, resetMail, sendMail } from '../lib/mail.js';
import { prisma } from '../lib/prisma.js';

const ROLES = ['TRAVELER', 'BUSINESS'];
const isNew = (at, readAt) => Boolean(at && (!readAt || at > readAt));

// 画面上の新着（未読バッジ）
async function badges(user) {
  if (user.role === 'TRAVELER') {
    const threads = await prisma.thread.findMany({ where: { travelerId: user.id }, select: { lastBizAt: true, travelerReadAt: true } });
    const cancelled = await prisma.booking.count({ where: { travelerId: user.id, status: 'CANCELLED_BY_BUSINESS', travelerSeenAt: null } });
    return { messages: threads.filter((t) => isNew(t.lastBizAt, t.travelerReadAt)).length, bookings: cancelled };
  }
  // 持っている全店舗の分
  const mine = { place: { ownerId: user.id } };
  const threads = await prisma.thread.findMany({ where: mine, select: { lastTravelerAt: true, bizReadAt: true } });
  const fresh = await prisma.booking.count({ where: { ...mine, bizSeenAt: null, status: { not: 'CANCELLED_BY_BUSINESS' } } });
  return { messages: threads.filter((t) => isNew(t.lastTravelerAt, t.bizReadAt)).length, bookings: fresh };
}

function checkPassword(password) {
  if (typeof password !== 'string' || password.length < PASSWORD_MIN || password.length > 200) {
    fail(400, `Password must be at least ${PASSWORD_MIN} characters`, { code: 'password' });
  }
}

const normEmail = (v) => str(v, 254).toLowerCase();

async function register(req, res) {
  const b = body(req);
  const role = oneOf(b.role, ROLES);
  const email = normEmail(b.email);
  const name = str(b.name, 60);
  if (!role) fail(400, 'Invalid role');
  if (!EMAIL_RE.test(email)) fail(400, 'Enter a valid email address', { code: 'email' });
  checkPassword(b.password);
  if (!name) fail(400, 'Enter your name', { code: 'name' });
  if (b.agree !== true) fail(400, 'Please agree to the Terms and Privacy Policy', { code: 'agree' });
  if (!(await throttle(`register-ip:${clientIp(req)}`, 10, 60))) fail(429, 'Too many attempts. Please try again later.', { code: 'throttle' });
  if (await prisma.user.findUnique({ where: { email_role: { email, role } } })) fail(409, 'This email is already registered', { code: 'taken' });
  const user = await prisma.user.create({
    data: { role, email, name, passwordHash: await hashPassword(b.password), termsAt: new Date(), currency: oneOf(b.currency, CURRENCIES, 'USD'), lang: oneOf(b.lang, LANGS, 'en') },
  });
  await startSession(req, res, user);
  return { user: publicUser(user), badges: { messages: 0, bookings: 0 } };
}

async function login(req, res) {
  const b = body(req);
  const email = normEmail(b.email);
  const password = typeof b.password === 'string' ? b.password.slice(0, 200) : '';
  const okIp = await throttle(`login-ip:${clientIp(req)}`, 50, 15);
  const okEmail = await throttle(`login:${email}`, 10, 15);
  if (!okIp || !okEmail) fail(429, 'Too many attempts. Please wait 15 minutes and try again.', { code: 'throttle' });
  const role = oneOf(b.role, ROLES, 'TRAVELER');
  const user = email ? await prisma.user.findUnique({ where: { email_role: { email, role } } }) : null;
  const ok = user?.passwordHash ? await verifyPassword(password, user.passwordHash) : (await burnTime(password), false);
  if (!ok) fail(401, 'Email or password is incorrect', { code: 'wrong' });
  await clearThrottle(`login:${email}`);
  await startSession(req, res, user);
  return { user: publicUser(user), badges: await badges(user) };
}

async function forgot(req) {
  const email = normEmail(body(req).email);
  if (!EMAIL_RE.test(email)) fail(400, 'Enter a valid email address', { code: 'email' });
  const okIp = await throttle(`forgot-ip:${clientIp(req)}`, 10, 60);
  const okEmail = await throttle(`forgot:${email}`, 3, 60);
  if (!okIp || !okEmail) fail(429, 'Too many requests. Please try again later.', { code: 'throttle' });
  // 登録の有無にかかわらず同じ返事にする（登録されているかを当てられないように）。
  // 同じメールアドレスで旅行者と事業者の両方があれば、それぞれに送る
  const users = await prisma.user.findMany({ where: { email, deletedAt: null } });
  for (const user of users) {
    const token = newToken();
    await prisma.passwordReset.create({ data: { id: sha256(token), userId: user.id, expiresAt: new Date(Date.now() + 3600000) } });
    const link = appUrl(`${user.role === 'BUSINESS' ? '/biz' : ''}/reset?token=${token}`);
    await sendMail({ to: email, ...resetMail(user, link) });
  }
  return { ok: true };
}

async function reset(req, res) {
  const b = body(req);
  checkPassword(b.password);
  const row = typeof b.token === 'string' ? await prisma.passwordReset.findUnique({ where: { id: sha256(b.token) }, include: { user: true } }) : null;
  if (!row || row.usedAt || row.expiresAt < new Date() || row.user.deletedAt) fail(400, 'This link has expired. Please request a new one.', { code: 'expired' });
  const user = await prisma.$transaction(async (tx) => {
    await tx.passwordReset.update({ where: { id: row.id }, data: { usedAt: new Date() } });
    await tx.session.deleteMany({ where: { userId: row.userId } }); // ほかの端末はログアウトさせる
    return tx.user.update({ where: { id: row.userId }, data: { passwordHash: await hashPassword(b.password) } });
  });
  await clearThrottle(`login:${user.email}`);
  await startSession(req, res, user);
  return { user: publicUser(user), badges: await badges(user) };
}

async function withdraw(req, res) {
  const user = await requireUser(req);
  const password = typeof body(req).password === 'string' ? body(req).password : '';
  if (!(await verifyPassword(password, user.passwordHash))) fail(401, 'Password is incorrect', { code: 'wrong' });
  const today = jstDate();
  const where =
    user.role === 'TRAVELER'
      ? { travelerId: user.id, status: 'CONFIRMED', date: { gte: today } }
      : { place: { ownerId: user.id }, status: 'CONFIRMED', date: { gte: today } };
  const upcoming = await prisma.booking.count({ where });
  if (upcoming) fail(409, 'Please cancel your upcoming bookings first', { code: 'upcoming', count: upcoming });
  await prisma.$transaction([
    prisma.place.updateMany({ where: { ownerId: user.id }, data: { published: false } }),
    prisma.session.deleteMany({ where: { userId: user.id } }),
    prisma.passwordReset.deleteMany({ where: { userId: user.id } }),
    // アカウントは消して、ログインできないようにする。予約・チャットの記録は相手の画面のために「退会したユーザー」として残す
    prisma.user.update({ where: { id: user.id }, data: { email: null, passwordHash: null, name: user.role === 'BUSINESS' ? '退会した事業者' : 'Deleted user', deletedAt: new Date() } }),
  ]);
  await endSession(req, res);
  return { ok: true };
}

export default route({
  GET: async (req) => {
    const user = await currentUser(req);
    return user ? { user: publicUser(user), badges: await badges(user) } : { user: null };
  },
  POST: async (req, res) => {
    switch (req.query.action) {
      case 'register':
        return register(req, res);
      case 'login':
        return login(req, res);
      case 'logout':
        await endSession(req, res);
        return { ok: true };
      case 'forgot':
        return forgot(req);
      case 'reset':
        return reset(req, res);
      default:
        return fail(400, 'Unknown action');
    }
  },
  PATCH: async (req) => {
    const user = await requireUser(req);
    const b = body(req);
    const data = {};
    if (b.name !== undefined) {
      data.name = str(b.name, 60);
      if (!data.name) fail(400, 'Enter your name', { code: 'name' });
    }
    if (b.currency !== undefined) data.currency = oneOf(b.currency, CURRENCIES, user.currency);
    if (b.lang !== undefined) data.lang = oneOf(b.lang, LANGS, user.lang);
    const updated = await prisma.user.update({ where: { id: user.id }, data });
    return { user: publicUser(updated) };
  },
  DELETE: withdraw,
});
