// デモ店の事業者アカウント（demo-shop-001@example.com 〜）のパスワードを、DEMO_PASSWORD に入れ替える。demo スキーマにだけ使う。
//   npm run demo:password
// 店・予約・口コミなどのデータは消さない（シードのやり直しは、demo スキーマの中身をすべて消すため）。
// 入れ替えたら、そのアカウントのログイン中の状態（セッション）もすべて切る。
import { hashPassword } from '../lib/auth.js';
import { DB_SCHEMA } from '../lib/dbUrl.js';
import { prisma } from '../lib/prisma.js';

if (DB_SCHEMA !== 'demo') {
  console.error(`demo スキーマにだけ使います（今は "${DB_SCHEMA}"）。DB_SCHEMA=demo で実行してください。`);
  process.exit(1);
}
const password = process.env.DEMO_PASSWORD;
if (!password || password.length < 16) {
  console.error('DEMO_PASSWORD（16文字以上のランダムな値）を .env.local に入れてから実行してください。');
  process.exit(1);
}
const demo = { role: 'BUSINESS', email: { startsWith: 'demo-shop-', endsWith: '@example.com' } };
const passwordHash = await hashPassword(password);
const { count } = await prisma.user.updateMany({ where: demo, data: { passwordHash } });
const sessions = await prisma.session.deleteMany({ where: { user: demo } });
console.log(`デモ店の事業者アカウント ${count} 件のパスワードを入れ替え、ログイン中の状態 ${sessions.count} 件を切りました`);
await prisma.$disconnect();
