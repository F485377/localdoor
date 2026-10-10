// テーブル作成（prisma db push）。Neon では、テーブルを作るときはプールを通さない直接の接続先を使う。
// DATABASE_URL_UNPOOLED があればそれを、なければ DATABASE_URL を使う。
import { execSync } from 'node:child_process';

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) {
  console.error('.env.local に DATABASE_URL がありません。docs/README の「セットアップ」を見てください。');
  process.exit(1);
}
execSync('npx prisma db push', { stdio: 'inherit', env: { ...process.env, DATABASE_URL: url } });
