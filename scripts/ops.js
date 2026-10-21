// 運営の作業（MVP は管理画面を作らず、ここから DB を見る）。使い方：
//   npm run ops -- review            新しく公開・更新された店舗（2日以内）と、未確認の報告
//   npm run ops -- checked <reportId>  報告を確認済みにする
//   npm run ops -- suspend <placeId>   店舗を非公開にする（事業者は公開に戻せない）
//   npm run ops -- unsuspend <placeId> 非公開を解除する
//   npm run ops -- kpi [日数]          成功指標（既定は全期間）
import { PrismaClient } from '@prisma/client';
import { withSchema } from '../lib/dbUrl.js';

const prisma = new PrismaClient({ datasourceUrl: withSchema(process.env.DATABASE_URL) });
const [cmd, arg] = process.argv.slice(2);
const pct = (a, b) => (b ? `${((a / b) * 100).toFixed(1)}%` : '—');

async function review() {
  const since = new Date(Date.now() - 2 * 86400000);
  const places = await prisma.place.findMany({ where: { updatedAt: { gte: since } }, include: { owner: true }, orderBy: { updatedAt: 'desc' } });
  console.log(`\n■ 2日以内に保存された店舗：${places.length}件`);
  for (const p of places) {
    console.log(`\n[${p.id}] ${p.name || '（店名なし）'}  ${p.suspended ? '運営で非公開' : p.published ? '公開中' : '下書き'}`);
    console.log(`  ${p.category ?? '-'} / ${p.prefCode ?? '-'}-${p.cityId ?? '-'} / ${p.address}・最寄り駅 ${p.station || '-'}`);
    console.log(`  値段帯 ${p.priceBand ?? '-'}・料金 ${p.price ?? '-'}円・${p.durationMin ?? '-'}分・地元 ${p.localPct ?? '-'}%・営業 ${p.years}・駅から ${p.stationKm}km・位置 ${p.lat ?? '-'},${p.lng ?? '-'}`);
    console.log(`  写真 ${p.photos.length}枚 ${p.photos.join(' ')}`);
    if (p.perk) console.log(`  特典 ${p.perk}`);
    console.log(`  リンク ${p.link ?? '-'}`);
    console.log(`  事業者 ${p.owner.name} <${p.owner.email ?? '退会'}>  登録 ${p.owner.createdAt.toISOString().slice(0, 10)}`);
    console.log(`  説明 ${p.description.replace(/\s+/g, ' ').slice(0, 160)}`);
  }
  const reports = await prisma.report.findMany({ where: { checkedAt: null }, include: { place: true }, orderBy: { createdAt: 'asc' } });
  console.log(`\n■ 未確認の報告：${reports.length}件`);
  for (const r of reports) console.log(`  [${r.id}] ${r.createdAt.toISOString().slice(0, 16)} 店舗 ${r.place.name}（${r.placeId}）理由 ${r.reason} ${r.note && `「${r.note}」`}`);
}

async function kpi() {
  const days = Number(arg) || null;
  const since = days ? new Date(Date.now() - days * 86400000) : new Date(0);
  const at = { gte: since };
  const [places, views, viewers, bookings, cancelled, threads] = await Promise.all([
    prisma.place.count({ where: { published: true, suspended: false } }),
    prisma.placeView.count({ where: { createdAt: at } }),
    prisma.placeView.groupBy({ by: ['userId'], where: { createdAt: at, userId: { not: null } } }),
    prisma.booking.findMany({ where: { createdAt: at }, select: { placeId: true, travelerId: true, status: true } }),
    prisma.booking.count({ where: { createdAt: at, status: { not: 'CONFIRMED' } } }),
    prisma.thread.findMany({ where: { createdAt: at }, select: { placeId: true, travelerId: true } }),
  ]);
  const booked = new Set(bookings.map((b) => `${b.placeId}:${b.travelerId}`));
  const chatThenBook = threads.filter((t) => booked.has(`${t.placeId}:${t.travelerId}`)).length;
  console.log(`\n■ 成功指標（${days ? `直近${days}日` : '全期間'}）`);
  console.log(`  登録店舗数（公開中）        ${places}`);
  console.log(`  詳細ページの閲覧            ${views}（ログイン中の閲覧者 ${viewers.length}人）`);
  console.log(`  予約数                      ${bookings.length}（うちキャンセル ${cancelled}、${pct(cancelled, bookings.length)}）`);
  console.log(`  詳細→予約の転換率          ${pct(bookings.length, views)}`);
  console.log(`  チャットから予約に進んだ割合 ${pct(chatThenBook, threads.length)}（${chatThenBook}/${threads.length}）`);
}

async function setSuspended(value) {
  if (!arg) throw new Error('店舗の id を指定してください');
  const p = await prisma.place.update({ where: { id: arg }, data: { suspended: value } });
  console.log(`${p.name}：${value ? '非公開にしました' : '非公開を解除しました'}`);
}

try {
  if (cmd === 'review') await review();
  else if (cmd === 'kpi') await kpi();
  else if (cmd === 'suspend') await setSuspended(true);
  else if (cmd === 'unsuspend') await setSuspended(false);
  else if (cmd === 'checked') {
    await prisma.report.update({ where: { id: arg }, data: { checkedAt: new Date() } });
    console.log('確認済みにしました');
  } else console.log('使い方は scripts/ops.js の先頭を見てください');
} catch (err) {
  console.error(err.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
