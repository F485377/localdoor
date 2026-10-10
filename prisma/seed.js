// サンプルデータを投入する。`npm run db:seed` で実行
import { PrismaClient } from '@prisma/client';
import { places, sampleReviews } from './sampleData.js';
import { withTranslations } from './sampleTranslations.js';

const prisma = new PrismaClient();

async function main() {
  await prisma.reservation.deleteMany();
  await prisma.review.deleteMany();
  await prisma.place.deleteMany();

  for (const data of places) {
    await prisma.place.create({
      data: { ...withTranslations(data), reviews: { create: sampleReviews[data.name] ?? [] } },
    });
  }
  console.log(`Seeded ${places.length} places`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
