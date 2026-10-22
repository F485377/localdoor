import { useCallback, useEffect, useState } from 'react';
import { useI18n } from './i18n/index.jsx';
import { Link } from './router.jsx';
export { store } from './store.js';

// 画面で共通して使う小さな部品

// データの読み込み。reload() で読み直す
export function useLoad(fn, deps) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const run = useCallback(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));
    fn()
      .then((data) => !cancelled && setState({ data, error: null, loading: false }))
      .catch((error) => !cancelled && setState({ data: null, error, loading: false }));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(run, [run]);
  return { ...state, reload: run, setData: (data) => setState((s) => ({ ...s, data })) };
}

// options: [{ value, label }]。multi=false なら1つだけ（もう一度押すと外れる）
export function Chips({ options, value, onChange, multi = true, label }) {
  const selected = multi ? value ?? [] : [value];
  const toggle = (v) => {
    if (!multi) return onChange(value === v ? null : v);
    onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
  };
  return (
    <div className="chips" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          type="button"
          key={String(o.value)}
          className={selected.includes(o.value) ? 'chip on' : 'chip'}
          aria-pressed={selected.includes(o.value)}
          onClick={() => toggle(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Sheet({ open, onClose, title, children, footer, closeLabel = 'Close', className = '' }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="sheet-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`sheet ${className}`} role="dialog" aria-modal="true" aria-label={title}>
        <header className="sheet-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label={closeLabel}>
            ✕
          </button>
        </header>
        <div className="sheet-body">{children}</div>
        {footer && <footer className="sheet-foot">{footer}</footer>}
      </div>
    </div>
  );
}

// エラーの表示。何が起きたかと、次にできることを出す（ja = 事業者画面、それ以外は旅行者の言語）
const JA_ERR = {
  network: '通信できませんでした。電波の良いところで、もう一度お試しください。',
  login: 'ログインが切れました。もう一度ログインしてください。',
  server: 'サーバーで問題が起きました。少し待ってから、もう一度お試しください。',
};
export function errorText(error, t) {
  if (!error) return '';
  if (error.code === 'network' || error.status === 0) return t('err.network');
  if (error.status === 401 && error.code !== 'wrong') return t('err.login');
  if (error.status >= 500) return t('err.server');
  return error.message;
}

// 赤（ブランドの色）と見分けられるよう、エラーは色だけでなくアイコンと文章で伝える
export function ErrorNote({ error, ja = false, onRetry }) {
  const { t } = useI18n();
  if (!error) return null;
  const tt = ja ? (k) => JA_ERR[k.slice(4)] : t;
  return (
    <div className="error" role="alert">
      <span className="error-icon" aria-hidden="true">
        ⚠
      </span>
      <span>
        {errorText(error, tt)}
        {onRetry && (
          <>
            {' '}
            <button type="button" className="link" onClick={onRetry}>
              {ja ? 'もう一度読み込む' : t('tryAgain')}
            </button>
          </>
        )}
      </span>
    </div>
  );
}

// データを取ってくる間は、画面の形に合わせた灰色の「骨組み（スケルトン）」を出す。
//   kind="cards" … お店のカード（写真つき）が並ぶ画面
//   kind="detail" … お店の詳しい画面
//   kind="rows" … 予約・チャットなどの一覧
//   なし … 文章とボタンがある、ふつうの画面
const Bone = ({ w = '100%', h = 14, r, style }) => <span className="skel" style={{ width: w, height: h, borderRadius: r, ...style }} />;
function SkelCard() {
  return (
    <div className="skel-card">
      <Bone h={190} r={0} />
      <div className="skel-pad">
        <Bone w="45%" h={12} />
        <Bone w="70%" h={20} />
        <Bone w="35%" h={14} />
        <Bone w="55%" h={16} />
        <div className="skel-days">
          {Array.from({ length: 7 }, (_, i) => (
            <Bone key={i} h={30} r={10} />
          ))}
        </div>
      </div>
    </div>
  );
}
export function Spinner({ ja = false, kind }) {
  const { t } = useI18n();
  let body;
  if (kind === 'cards')
    body = (
      <div className="card-grid">
        {[0, 1, 2].map((i) => (
          <SkelCard key={i} />
        ))}
      </div>
    );
  else if (kind === 'detail') {
    body = (
      <>
        <Bone w={60} h={14} style={{ marginBottom: 16 }} />
        <Bone h={260} r={0} style={{ marginLeft: 'calc(var(--gutter, 20px) * -1)', width: 'calc(100% + var(--gutter, 20px) * 2)' }} />
        <div className="skel-pad" style={{ padding: '18px 0' }}>
          <Bone w="40%" h={12} />
          <Bone w="75%" h={26} />
          <Bone w="50%" h={16} />
          <Bone h={70} r={14} />
          <Bone h={180} r={12} />
        </div>
      </>
    );
  } else if (kind === 'rows') {
    body = [0, 1, 2, 3].map((i) => (
      <div key={i} className="skel-row">
        <Bone w={44} h={44} r={22} />
        <div className="skel-pad" style={{ padding: 0, flex: 1 }}>
          <Bone w="55%" h={16} />
          <Bone w="85%" h={12} />
        </div>
      </div>
    ));
  } else {
    body = (
      <div className="skel-pad" style={{ padding: 0 }}>
        <Bone w="50%" h={24} />
        <Bone h={14} />
        <Bone w="90%" h={14} />
        <Bone w="70%" h={14} />
        <Bone w="40%" h={44} r={10} style={{ marginTop: 8 }} />
      </div>
    );
  }
  return (
    <div className="skel-wrap" aria-busy="true" role="status">
      <span className="sr-only">{ja ? '読み込み中…' : t('loading')}</span>
      {body}
    </div>
  );
}

// 日付の表示（lang：en | zh | zt | ko | ja）
const LOCALES = { en: 'en-US', zh: 'zh-CN', zt: 'zh-TW', ko: 'ko-KR', ja: 'ja-JP' };
export function formatDate(date, lang = 'en') {
  const d = new Date(`${date}T00:00:00+09:00`);
  return d.toLocaleDateString(LOCALES[lang] ?? 'en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Tokyo' });
}

export function shortDate(date, lang = 'en') {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString(LOCALES[lang] ?? 'en-US', { month: 'short', day: 'numeric', weekday: 'short', timeZone: 'UTC' });
}

export function timeShort(at, lang = 'en') {
  const d = new Date(at);
  const sameDay = d.toDateString() === new Date().toDateString();
  return d.toLocaleString(LOCALES[lang] ?? 'en-US', sameDay ? { hour: '2-digit', minute: '2-digit' } : { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function Back({ to, label }) {
  return (
    <Link to={to} className="back">
      ← {label}
    </Link>
  );
}
