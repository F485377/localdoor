import { methodNotAllowed } from '../lib/http.js';

// GET /api/rates  為替レート（1 USD あたり）。料金（日本円）を旅行者の通貨に換算する目安に使う。
// 出典：ExchangeRate-API の無料版（APIキー不要。1日1回更新）。画面に出典リンクを出すことが利用条件。
// Vercel のキャッシュで12時間使い回すので、元のサーバーにはほとんどアクセスしない。
const SOURCE = 'https://open.er-api.com/v6/latest/USD';

export default async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  try {
    const r = await fetch(SOURCE, { signal: AbortSignal.timeout(10_000) });
    const data = await r.json();
    if (data.result !== 'success') throw new Error(data['error-type'] ?? 'rate source error');
    res.setHeader('Cache-Control', 's-maxage=43200, stale-while-revalidate=86400');
    res.status(200).json({ base: 'USD', rates: data.rates, updatedAt: data.time_last_update_utc });
  } catch (err) {
    console.error('rates', err);
    // 換算は「目安」なので、取れなくてもアプリは動く（その土地の通貨だけ表示する）
    res.status(502).json({ error: 'Exchange rates are not available right now' });
  }
}
