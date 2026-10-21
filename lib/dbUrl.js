// 旧 Haisai のテーブル（public スキーマ）と混ざらないように、このアプリは別のスキーマを使う。
// URL に ?schema=mvp を付けると、Prisma はそのスキーマだけを読み書きする。
export const DB_SCHEMA = process.env.DB_SCHEMA || 'mvp';

export function withSchema(url) {
  if (!url) return url;
  const u = new URL(url);
  u.searchParams.set('schema', DB_SCHEMA);
  return u.toString();
}
