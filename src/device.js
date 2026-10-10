// この端末の目印（ランダムな ID）。ログインしていなくても「自分の口コミ」を見つけるために使う
const KEY = 'haisai-device-id';
let cached = null;

export function deviceId() {
  if (cached) return cached;
  try {
    cached = localStorage.getItem(KEY);
    if (!cached) {
      cached = crypto.randomUUID();
      localStorage.setItem(KEY, cached);
    }
  } catch {
    cached ??= crypto.randomUUID(); // 保存できない環境では、このページを開いている間だけ使う
  }
  return cached;
}
