import { BAND_RANGE } from '../../lib/domain.js';
import { formatYen, useConvert } from '../currency.jsx';
import { useI18n } from '../i18n/index.jsx';
import { WEEKDAYS, bandText, label } from '../labels.js';
import { store } from '../store.js';

// 旅行者画面で共通して使う小さな部品

// 地元のお客さんとその他の割合（事業者の申告）。点数ではなく、申告をそのまま帯グラフにする
export function LocalBar({ pct, compact = false }) {
  const { t } = useI18n();
  if (pct == null) return null;
  return (
    <div className="local-bar" aria-label={`${t('local.locals')} ${pct}%, ${t('local.others')} ${100 - pct}% (${t('local.stated')})`}>
      <div className="local-bar-track" aria-hidden="true">
        <div className="local-bar-locals" style={{ width: `${pct}%` }} />
        <div className="local-bar-others" style={{ width: `${100 - pct}%` }} />
      </div>
      <div className="local-bar-legend" aria-hidden="true">
        <span>
          {t('local.locals')} <b>{pct}%</b>
        </span>
        {!compact && <span>{t('local.stated')}</span>}
        <span>
          {t('local.others')} <b>{100 - pct}%</b>
        </span>
      </div>
    </div>
  );
}

const MARK = { o: '〇', limited: '△', x: '✕', none: 'ー' }; // ー ＝ 日程がまだ決まっていない

// 今日から1週間の〇△✕。chosen は検索した日
export function WeekMarks({ week, chosen }) {
  const { t, lang } = useI18n();
  if (!week?.length) return null;
  return (
    <div>
      <div className="week" role="list" aria-label={t('res.week')}>
        {week.map((d) => {
          const wd = WEEKDAYS[lang][new Date(`${d.date}T00:00:00Z`).getUTCDay()];
          return (
            <div key={d.date} role="listitem" aria-label={`${d.date} ${MARK[d.mark]}`}>
              <div className="week-day">
                {Number(d.date.slice(8))} {wd}
              </div>
              <div className={`week-mark ${d.mark}${d.date === chosen ? ' chosen' : ''}`}>{MARK[d.mark]}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 設備・方針のマーク（タバコ・ペット・個室）
export function Facilities({ place }) {
  const { lang } = useI18n();
  const tags = [];
  if (place.smoking) tags.push(label('smoking', place.smoking, lang));
  if (place.pets) tags.push(label('pets', place.pets, lang));
  if (place.privateRoom != null) tags.push(label('privateRoom', place.privateRoom, lang));
  if (!tags.length) return null;
  return (
    <div className="icons">
      {tags.map((x) => (
        <span key={x} className="icon-tag">
          {x}
        </span>
      ))}
    </div>
  );
}

// 値段帯：¥1,000〜3,000（≈ SGD 8.6–26）
export function Band({ band, suffix = '' }) {
  const convert = useConvert();
  const { lang } = useI18n();
  const r = BAND_RANGE[band];
  if (!r) return null;
  const lo = r[0] ? convert(r[0]) : null;
  const hi = r[1] ? convert(r[1]) : null;
  const approx = lo && hi ? `${lo} – ${hi}` : hi ? `≤ ${hi}` : lo ? `${lo}+` : null;
  return (
    <span className="price">
      <strong>{bandText(band, lang)}</strong>
      {suffix}
      {approx && <span className="price-approx"> (≈ {approx})</span>}
    </span>
  );
}

export const yen = formatYen;

// 星（★）。value は 0〜5（小数もよい。4.3 なら4つと少し）
export function Stars({ value, size = '1em' }) {
  const pct = Math.max(0, Math.min(5, value ?? 0)) * 20;
  return (
    <span className="stars" style={{ fontSize: size }} role="img" aria-label={`${(value ?? 0).toFixed(1)} / 5`}>
      <span className="stars-back" aria-hidden="true">
        ★★★★★
      </span>
      <span className="stars-front" style={{ width: `${pct}%` }} aria-hidden="true">
        ★★★★★
      </span>
    </span>
  );
}

// 営業年数（創業年から）：創業1985年（41年）
export function yearsText(p, t) {
  return p.foundedYear ? t('yr.since', { y: p.foundedYear, n: p.yearsOpen ?? 0 }) : '';
}
// 使える支払方法：現金・クレジットカード
export const paymentsText = (p, lang) => (p.payments ?? []).map((m) => label('paymentMethod', m, lang)).join(lang === 'ja' || lang === 'zh' || lang === 'zt' ? '・' : ', ');

// 地図のピンの色の説明（体験は青、飲食店は赤）
export function MapLegend() {
  const { lang } = useI18n();
  return (
    <p className="small muted map-legend">
      <span className="legend-dot experience" aria-hidden="true" /> {label('category', 'experience', lang)}
      <span className="legend-dot restaurant" aria-hidden="true" /> {label('category', 'restaurant', lang)}
    </p>
  );
}

// 最後の検索（行先・日時・人数）。予約の画面の初期値に使う
const SEARCH = 'jimoto-search';
export const lastSearch = () => store.get(SEARCH, {});
export const saveSearch = (s) => store.set(SEARCH, s);

// 最後に見た検索結果の画面（条件・絞り込み・一覧か地図か・ページ）。メニューの「探す」で、その画面に戻る
const RESULTS = 'jimoto-last-results';
export const lastResults = () => {
  const url = store.get(RESULTS);
  return typeof url === 'string' && url.startsWith('/search') ? url : null;
};
export const saveResults = (url) => store.set(RESULTS, url);
