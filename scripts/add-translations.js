// DB にあるサンプルのお店に、日本語・中国語・韓国語の訳を足す。口コミや予約は消さない
//   npm run db:translate
import { PrismaClient } from '@prisma/client';
import { places } from '../prisma/sampleData.js';
import { withTranslations } from '../prisma/sampleTranslations.js';

const prisma = new PrismaClient();

async function main() {
  let updated = 0;
  for (const place of places) {
    const { translations } = withTranslations(place);
    const { count } = await prisma.place.updateMany({
      where: { name: place.name, source: 'haisai' },
      data: { translations },
    });
    updated += count;
  }
  console.log(`${updated} 件のお店に訳を足しました`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
