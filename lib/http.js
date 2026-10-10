// Vercel Functions 共通のヘルパー

export function methodNotAllowed(res, allowed) {
  res.setHeader('Allow', allowed.join(', '));
  return res.status(405).json({ error: 'Method not allowed' });
}

export function badRequest(res, message) {
  return res.status(400).json({ error: message });
}

export function serverError(res, err) {
  console.error(err);
  return res.status(500).json({ error: 'Internal server error' });
}

export function str(value, max = 500) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
