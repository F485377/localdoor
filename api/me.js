import { prisma } from '../lib/prisma.js';
import { currentUser } from '../lib/auth.js';
import { methodNotAllowed, serverError, str } from '../lib/http.js';

// GET /api/me  ログイン中の人のプロフィール（別のスマホでログインしたときに復元する）
// PUT /api/me  プロフィールを保存する { name, language, homeCountry, destination, diet }
export default async function handler(req, res) {
  try {
    const me = await currentUser(req);
    if (!me) return res.status(401).json({ error: 'Sign in required' });

    if (req.method === 'GET') {
      const user = await prisma.user.findUnique({ where: { id: me.uid } });
      return user ? res.status(200).json(user) : res.status(404).json({ error: 'No profile yet' });
    }

    if (req.method === 'PUT') {
      const body = req.body ?? {};
      const data = {
        provider: me.provider,
        email: me.email,
        phone: me.phone,
        name: str(body.name, 40) || me.name,
        language: str(body.language, 10) || 'en',
        homeCountry: str(body.homeCountry, 2) || null,
        destination: str(body.destination, 100) || null,
        diet: Array.isArray(body.diet) ? body.diet.filter((d) => ['vegetarian', 'halal'].includes(d)) : [],
      };
      const user = await prisma.user.upsert({ where: { id: me.uid }, create: { id: me.uid, ...data }, update: data });
      return res.status(200).json(user);
    }

    return methodNotAllowed(res, ['GET', 'PUT']);
  } catch (err) {
    serverError(res, err);
  }
}
