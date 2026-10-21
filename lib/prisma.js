import { PrismaClient } from '@prisma/client';
import { withSchema } from './dbUrl.js';

// DB（Neon）は使われていない間は休み、起きるときに接続を閉じることがある（P1017 / P1001 / P1002）。
// 接続が切れると、手元の接続がまとめて使えなくなっていることが多いので、
// いったん切断して（次の問い合わせで新しくつなぎ直される）、少し待ってからやり直す（最大2回）
const RETRY = new Set(['P1017', 'P1001', 'P1002']);
const WAIT = [300, 1500];

function create() {
  const base = new PrismaClient({ datasourceUrl: withSchema(process.env.DATABASE_URL) });
  // 同時にいくつも失敗しても、つなぎ直しは1回で済ませる
  let resetting = null;
  const reset = () =>
    (resetting ??= base
      .$disconnect()
      .catch(() => {})
      .finally(() => setTimeout(() => (resetting = null), 2000)));

  return base.$extends({
    query: {
      async $allOperations({ args, query }) {
        for (let attempt = 0; ; attempt++) {
          try {
            return await query(args);
          } catch (err) {
            // 接続そのものに失敗したとき（PrismaClientInitializationError）は code がなく errorCode に入ることがある
            const code = err?.code ?? err?.errorCode;
            const retryable = RETRY.has(code) || err?.name === 'PrismaClientInitializationError';
            if (!retryable || attempt >= WAIT.length) throw err;
            await reset();
            await new Promise((r) => setTimeout(r, WAIT[attempt]));
          }
        }
      },
    },
  });
}

// Vercel Functions のウォームスタートで接続を使い回す
const globalForPrisma = globalThis;
export const prisma = globalForPrisma.prisma ?? create();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
