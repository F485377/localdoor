// Vercel Functions 共通のヘルパー
import { currentUser, roleOf } from './auth.js';

export class HttpError extends Error {
  constructor(status, message, extra) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

export const fail = (status, message, extra) => {
  throw new HttpError(status, message, extra);
};

export function methodNotAllowed(res, allowed) {
  res.setHeader('Allow', allowed.join(', '));
  return res.status(405).json({ error: 'Method not allowed' });
}

// ほかのサイトからの書き込み（CSRF）を防ぐ。Cookie は SameSite=Lax だが、Origin も確かめる
function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true; // 同じサイトの fetch でも Origin が付かないブラウザがある（SameSite で守られる）
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

// ハンドラーを包んで、HttpError を JSON のエラーにする
export function route(handlers) {
  return async (req, res) => {
    const fn = handlers[req.method];
    if (!fn) return methodNotAllowed(res, Object.keys(handlers));
    res.setHeader('Cache-Control', 'no-store');
    try {
      if (req.method !== 'GET' && !sameOrigin(req)) fail(403, 'Forbidden');
      const result = await fn(req, res);
      if (!res.headersSent && !res.writableEnded) res.status(200).json(result ?? { ok: true });
    } catch (err) {
      if (err instanceof HttpError) return res.status(err.status).json({ error: err.message, ...err.extra });
      console.error(err);
      if (!res.headersSent) res.status(500).json({ error: 'Internal server error' });
    }
  };
}

// role を指定すると、その立場のログインを見る。指定しなければ、画面が送った立場（X-Jimoto-As）
export async function requireUser(req, role) {
  const user = await currentUser(req, role ?? roleOf(req));
  if (!user) fail(401, 'Login required');
  if (role && user.role !== role) fail(403, 'This account cannot do that');
  return user;
}

export const body = (req) => (req.body && typeof req.body === 'object' ? req.body : {});

// 文字列：前後の空白を取り、上限で切る。画面には React がエスケープして出すので、ここでは中身を変えない
export function str(value, max = 500) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export function int(value, { min = -Infinity, max = Infinity, fallback = null } = {}) {
  const n = typeof value === 'number' ? value : Number.parseInt(value, 10);
  if (!Number.isInteger(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export const oneOf = (value, list, fallback = null) => (list.includes(value) ? value : fallback);
export const listOf = (value, list) => (Array.isArray(value) ? [...new Set(value.filter((v) => list.includes(v)))] : []);

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function clientIp(req) {
  return String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
}
