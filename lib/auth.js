// ログイン（自前）。パスワードは scrypt でハッシュにして保存し、元には戻せない。
// ログイン中の端末は、Cookie（HttpOnly）に入れたランダムなトークンで見分ける。DB にはトークンのハッシュだけを残す。
// 旅行者と事業者で Cookie を分け（sid / bsid）、ログアウトせずに両方の画面を行き来できるようにする。
// どちらの立場で呼ばれたかは、画面が送るヘッダー X-Jimoto-As（business / traveler）で決める
import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { prisma } from './prisma.js';

const scrypt = promisify(scryptCb);
const COOKIES = { TRAVELER: 'sid', BUSINESS: 'bsid' };
export const roleOf = (req) => (req.headers['x-jimoto-as'] === 'business' ? 'BUSINESS' : 'TRAVELER');
const SESSION_DAYS = 30;
const KEYLEN = 64;
const COST = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, KEYLEN, COST);
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export async function verifyPassword(password, stored) {
  const [kind, salt, hash] = String(stored ?? '').split('$');
  if (kind !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'base64');
  const actual = await scrypt(password, Buffer.from(salt, 'base64'), expected.length, COST);
  return timingSafeEqual(actual, expected);
}

// 存在しないアドレスでも同じくらい時間をかけ、登録の有無を時間で当てられないようにする
let dummyHash;
export async function burnTime(password) {
  dummyHash ??= await hashPassword('dummy-password');
  await verifyPassword(password, dummyHash);
}

export const sha256 = (s) => createHash('sha256').update(s).digest('hex');
export const newToken = () => randomBytes(32).toString('base64url');

function parseCookies(req) {
  const out = {};
  for (const part of String(req.headers.cookie ?? '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function cookieHeader(req, role, value, maxAge) {
  const https = req.headers['x-forwarded-proto'] === 'https' || process.env.NODE_ENV === 'production';
  return `${COOKIES[role]}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${https ? '; Secure' : ''}`;
}

// user の立場の Cookie にセッションを入れる（もう一方の立場のログインはそのまま）
export async function startSession(req, res, user) {
  const token = newToken();
  await prisma.session.create({
    data: { id: sha256(token), userId: user.id, expiresAt: new Date(Date.now() + SESSION_DAYS * 86400000) },
  });
  res.setHeader('Set-Cookie', cookieHeader(req, user.role, token, SESSION_DAYS * 86400));
}

export async function endSession(req, res, role = roleOf(req)) {
  const token = parseCookies(req)[COOKIES[role]];
  if (token) await prisma.session.deleteMany({ where: { id: sha256(token) } });
  res.setHeader('Set-Cookie', cookieHeader(req, role, '', 0));
}

// ログイン中のユーザー（いなければ null）。role の Cookie を見る。同じリクエストの中では立場ごとに1回だけ DB を見る
export async function currentUser(req, role = roleOf(req)) {
  req._users ??= {};
  if (req._users[role] !== undefined) return req._users[role];
  req._users[role] = null;
  const token = parseCookies(req)[COOKIES[role]];
  if (!token) return null;
  const session = await prisma.session.findUnique({ where: { id: sha256(token) }, include: { user: true } });
  if (!session || session.expiresAt < new Date() || session.user.deletedAt || session.user.role !== role) return null;
  // 使っている間は期限を延ばす（1日に1回まで）
  const renewAt = session.expiresAt.getTime() - (SESSION_DAYS - 1) * 86400000;
  if (Date.now() > renewAt) {
    await prisma.session.update({ where: { id: session.id }, data: { expiresAt: new Date(Date.now() + SESSION_DAYS * 86400000) } });
  }
  req._users[role] = session.user;
  return session.user;
}

// 回数制限。limit 回を超えたら windowMin 分のあいだ false を返す
export async function throttle(key, limit, windowMin) {
  const now = new Date();
  const row = await prisma.throttle.findUnique({ where: { key } });
  if (!row || row.resetAt < now) {
    await prisma.throttle.upsert({
      where: { key },
      create: { key, count: 1, resetAt: new Date(now.getTime() + windowMin * 60000) },
      update: { count: 1, resetAt: new Date(now.getTime() + windowMin * 60000) },
    });
    return true;
  }
  if (row.count >= limit) return false;
  await prisma.throttle.update({ where: { key }, data: { count: { increment: 1 } } });
  return true;
}

export const clearThrottle = (key) => prisma.throttle.deleteMany({ where: { key } });

// 画面に返すユーザー情報（パスワードのハッシュなどは出さない）
export const publicUser = (u) => u && { id: u.id, email: u.email, role: u.role, name: u.name, currency: u.currency, lang: u.lang };
