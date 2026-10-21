import { CURRENCIES, LANGS } from '../../lib/domain.js';
import { useCurrency } from '../currency.jsx';
import { HTML_LANG, LANG_NAMES, useI18n } from '../i18n/index.jsx';
import { Sheet } from '../ui.jsx';

// 表示言語と表示通貨。料金は日本円で表示し、選んだ通貨の目安を併記する
export default function SettingsSheet({ open, onClose, first = false }) {
  const { t, lang, setLang } = useI18n();
  const { currency, setCurrency } = useCurrency();
  const close = () => {
    // 初回は、何も選ばずに閉じても「推定した言語・通貨」で決めたことにする
    if (first) {
      setLang(lang);
      setCurrency(currency);
    }
    onClose();
  };
  return (
    <Sheet
      open={open}
      onClose={close}
      title={first ? t('s.welcome') : t('s.title')}
      closeLabel={t('close')}
      footer={
        <button className="btn primary block" onClick={close}>
          {t('s.done')}
        </button>
      }
    >
      <h3>{t('s.language')}</h3>
      <div className="chips" role="radiogroup" aria-label={t('s.language')}>
        {LANGS.map((l) => (
          <button key={l} type="button" role="radio" aria-checked={lang === l} className={lang === l ? 'chip on' : 'chip'} onClick={() => setLang(l)} lang={HTML_LANG[l]}>
            {LANG_NAMES[l]}
          </button>
        ))}
      </div>
      <h3 style={{ marginTop: 18 }}>{t('s.currency')}</h3>
      <p className="muted small">{t('s.currencyNote')}</p>
      <div className="chips" role="radiogroup" aria-label={t('s.currency')}>
        {CURRENCIES.map((c) => (
          <button key={c} type="button" role="radio" aria-checked={currency === c} className={currency === c ? 'chip on' : 'chip'} onClick={() => setCurrency(c)}>
            {c === 'JPY' ? '円 JPY' : c}
          </button>
        ))}
      </div>
    </Sheet>
  );
}
