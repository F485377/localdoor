// 「この端末の目印」。ブラウザが最初に作ってずっと送ってくる（ヘッダー X-Haisai-Device）。
// ログインしていない人でも「自分の口コミ」を見つけられるようにするために使う。
export function deviceKey(req) {
  const key = String(req.headers['x-haisai-device'] ?? '');
  return /^[a-z0-9-]{16,64}$/i.test(key) ? key : null;
}
