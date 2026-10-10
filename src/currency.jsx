import { createContext, useContext, useEffect, useState } from 'react';
import { COUNTRY_INFO } from '../lib/countries.js';
import { api } from './api.js';
import { formatMoney } from './format.js';
import { useI18n } from './i18n/index.jsx';
import { useProfile } from './profile.jsx';

// 値段を「その土地の通貨（上）」と「自分の国の通貨（下・換算の目安）」の2段で出すための仕組み。
// 自分の国はプロフィールの出身国。為替レートは /api/rates（ExchangeRate-API）から1回だけ読む。
const CurrencyContext = createContext({ rates: null, home: null });

export function CurrencyProvider({ children }) {
  const { profile } = useProfile();
  const [rates, setRates] = useState(null);

  useEffect(() => {
    api
      .getRates()
      .then((data) => setRates(data.rates))
      .catch(() => setRates(null)); // 取れなければ、その土地の通貨だけ出す
  }, []);

  const home = COUNTRY_INFO[profile?.homeCountry]?.[1] ?? null;
  return <CurrencyContext.Provider value={{ rates, home }}>{children}</CurrencyContext.Provider>;
}

// 換算の目安なので、細かい端数は出さない（有効数字3桁：¥1,550、NT$213、€4.27）
function formatApprox(amount, currency, lang) {
  try {
    return new Intl.NumberFormat(lang, { style: 'currency', currency, maximumSignificantDigits: 3 }).format(amount);
  } catch {
    return formatMoney(amount, currency, lang);
  }
}

// 自分の国の通貨に換算する関数を返す。換算できない（レートが無い・同じ通貨・出身国が未設定）ときは null
export function useHomeCurrency() {
  const { rates, home } = useContext(CurrencyContext);
  const { lang } = useI18n();
  const convert = (amount, from) => {
    if (!rates || !home || home === from || !rates[from] || !rates[home]) return null;
    return (amount / rates[from]) * rates[home];
  };
  const format = (amount, from) => {
    const value = convert(amount, from);
    return value == null ? null : formatApprox(value, home, lang);
  };
  return { home, convert, format, available: Boolean(rates && home) };
}

// 2段の値段。上：その土地の通貨、下：自分の国の通貨（約）
export function DualPrice({ min, max, amount, currency, className = '' }) {
  const { t, lang } = useI18n();
  const { format } = useHomeCurrency();
  const local =
    amount != null
      ? formatMoney(amount, currency, lang)
      : `${formatMoney(min, currency, lang)}–${formatMoney(max, currency, lang)}`;
  const homeMin = format(amount ?? min, currency);
  const homeMax = amount == null ? format(max, currency) : null;
  const home = homeMin && (amount != null ? homeMin : homeMax && `${homeMin}–${homeMax}`);
  return (
    <span className={`dual-price ${className}`}>
      <span className="local">{local}</span>
      {home && (
        <span className="home">
          {t('approx')} {home}
        </span>
      )}
    </span>
  );
}

// 為替レートの出典（ExchangeRate-API の利用条件）
export function RatesCredit() {
  const { t } = useI18n();
  const { available } = useHomeCurrency();
  if (!available) return null;
  return (
    <p className="small muted rates-credit">
      {t('ratesNote')}{' '}
      <a href="https://www.exchangerate-api.com" target="_blank" rel="noreferrer">
        Rates By Exchange Rate API
      </a>
    </p>
  );
}
