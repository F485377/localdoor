// 写真を送る前に端末で小さくする（長い辺を 1600px までの JPEG に）。
// Vercel Functions に送れる大きさ（4.5MB）に収め、通信量も減らす
const MAX_SIDE = 1600;

export async function shrinkImage(file) {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) throw new Error('この写真は読み込めませんでした。別の写真を選んでください。');
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('写真の変換に失敗しました'))), 'image/jpeg', 0.82));
}
