import { PrismaClient } from '@prisma/client';

// Vercel Functions のウォームスタートで接続を使い回す
const globalForPrisma = globalThis;
export const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
