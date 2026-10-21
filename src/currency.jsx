import { createContext, useContext, useEffect, useState } from 'react';
import { CURRENCIES } from '../lib/domain.js';
import { api } from './api.js';
import { useSession } from './session.jsx';
import { useI18n } from './i18n/index.jsx';
import { store } from './store.js';

// 料金は日本円を正とし、選んだ通貨の目安額を併記する。
// 為替レートは /api/rates（1日1回更新）。取れなかったら、最後に取れたレートと取得日時を出す。
const RATES = 'jimoto-rates';
const CURRENCY = 'jimoto-currency';
const Ctx = createContext(null);

// 端末の設定から通貨を推定する（初回の選択画面の初期値）
export function guessCurrency() {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';
  const lang = navigator.language ?? '';
  if (tz === 'Asia/Tokyo' || lang.startsWith('ja')) return 'JPY';
  if (tz === 'Asia/Singapore' || lang.endsWith('-SG')) return 'SGD';
  if (tz === 'Asia/Hong_Kong' || lang.endsWith('-HK')) return 'HKD';
  if (tz === 'Asia/Taipei' || lang.endsWith('-TW')) return 'TWD';
  if (tz === 'Asia/Shanghai' || lang === 'zh-CN') return 'CNY';
  if (tz === 'Asia/Seoul' || lang.startsWith('ko')) return 'KRW';
  if (tz.startsWith('Europe/')) return 'EUR';
  return 'USD';
}

export function CurrencyProvider({ children }) {
  const { user, setUser } = useSession();
  const [rates, setRates] = useState(() => ({ ...(store.get(RATES) ?? { rates: null, updatedAt: null }), cached: true }));
  const [local, setLocal] = useState(() => store.get(CURRENCY));

  useEffect(() => {
    api
      .rates()
      .then((d) => {
        const next = { rates: d.rates, updatedAt: d.updatedAt };
        setRates({ ...next, cached: false });
        store.set(RATES, next);
      })
      .catch(() => setRates((s) => ({ ...s, cached: true })));
  }, []);

  // ログイン中はアカウントの通貨、ログインしていなければ端末に保存した通貨
  const currency = user?.role === 'TRAVELER' ? user.currency : local;
  const chosen = Boolean(user?.role === 'TRAVELER' || local);

  const setCurrency = async (c) => {
    if (!CURRENCIES.includes(c)) return;
    store.set(CURRENCY, c);
    setLocal(c);
    if (user?.role === 'TRAVELER') {
      setUser({ ...user, currency: c });
      await api.updateMe({ currency: c }).catch(() => {});
    }
  };

  return <Ctx.Provider value={{ ...rates, currency: currency ?? guessCurrency(), chosen, setCurrency }}>{children}</Ctx.Provider>;
}

export const useCurrency = () => useContext(Ctx);

// 日本語では「3,000円」、ほかの言語では「¥3,000」
export const formatYen = (n, lang = 'en') => (lang === 'ja' ? `${n.toLocaleString('ja-JP')}円` : `¥${n.toLocaleString('en-US')}`);

export function useConvert() {
  const { rates, currency } = useCurrency();
  return (yen) => {
    // 円を選んだときは目安を出さない
    if (currency === 'JPY' || !rates || !rates.JPY || !rates[currency]) return null;
    const v = (yen / rates.JPY) * rates[currency];
    try {
      // 円の「¥」と紛らわしくならないよう、通貨コードで出す（例：SGD 44.5）
      return new Intl.NumberFormat('en-US', { style: 'currency', currency, currencyDisplay: 'code', maximumSignificantDigits: 3 }).format(v);
    } catch {
      return `${currency} ${v.toFixed(2)}`;
    }
  };
}

// ¥6,000 (≈ SGD 55)
export function Price({ yen, suffix = '' }) {
  const convert = useConvert();
  const { lang } = useI18n();
  if (yen == null) return null;
  const approx = convert(yen);
  return (
    <span className="price">
      <strong>{formatYen(yen, lang)}</strong>
      {suffix}
      {approx && <span className="price-approx"> (≈ {approx})</span>}
    </span>
  );
}

// レートの取得日時と「目安」である旨。ExchangeRate-API の利用条件で出典も出す
export function RateNote() {
  const { updatedAt, cached, currency } = useCurrency();
  const { t, locale } = useI18n();
  if (currency === 'JPY') return null;
  if (!updatedAt) return <p className="small muted">{t('rate.none')}</p>;
  const when = new Date(updatedAt).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
  return (
    <p className="small muted">
      {t('rate.note', { when, cached: cached ? t('rate.cached') : '' })}{' '}
      <a href="https://www.exchangerate-api.com" target="_blank" rel="noreferrer">
        Rates By Exchange Rate API
      </a>
    </p>
  );
}

// 為替：1 SGD ≈ ¥115。通貨を選んでいなくても、円を選んでいても、いつも出す。
// 円を選んでいるときは、言語に合わせた代表的な通貨（英語・日本語は USD など）で出し、「自分の通貨で表示」も添える
const REFERENCE = { en: 'USD', ja: 'USD', zh: 'CNY', zt: 'TWD', ko: 'KRW' };
export function RateLine() {
  const { rates, currency } = useCurrency();
  const { t, lang } = useI18n();
  const cur = currency === 'JPY' ? REFERENCE[lang] ?? 'USD' : currency;
  if (!rates?.JPY || !rates[cur]) return null;
  const yenPerUnit = rates.JPY / rates[cur];
  const yen = yenPerUnit >= 10 ? Math.round(yenPerUnit) : Math.round(yenPerUnit * 100) / 100;
  return (
    <span className="rate-line" title={t('rate.title')}>
      {t('rate.line', { cur, yen: formatYen(yen, lang) })}
      {currency === 'JPY' && (
        <>
          {' · '}
          <button type="button" className="rate-line pick" onClick={() => window.dispatchEvent(new Event('jimoto-open-settings'))}>
            {t('rate.pick')}
          </button>
        </>
      )}
    </span>
  );
}
