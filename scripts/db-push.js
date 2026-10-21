// テーブル作成（prisma db push）。Neon では、テーブルを作るときはプールを通さない直接の接続先を使う。
// DATABASE_URL_UNPOOLED があればそれを、なければ DATABASE_URL を使う。
// スキーマは lib/dbUrl.js の DB_SCHEMA（既定 "mvp"）。ほかのスキーマ（旧 Haisai の public、前の版の v2）には触らない。
import { execSync } from 'node:child_process';
import { DB_SCHEMA, withSchema } from '../lib/dbUrl.js';

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) {
  console.error('.env.local に DATABASE_URL がありません。README の「セットアップ」を見てください。');
  process.exit(1);
}
console.log(`スキーマ "${DB_SCHEMA}" にテーブルを作ります`);
execSync('npx prisma db push --skip-generate', { stdio: 'inherit', env: { ...process.env, DATABASE_URL: withSchema(url) } });
