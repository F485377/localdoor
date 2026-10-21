import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { navigate, usePath } from '../router.jsx';
import { useSession } from '../session.jsx';

// 事業者の使い方ガイド。実際の画面の上で、押すところを光らせて順に案内する（画面を移ってもガイドは続く）。
//   target：光らせる所（CSSセレクタ。並べたときは最初に見つかったもの）
//   tap：押してもらう手順。target（または tap に書いた所）が押されたら次へ進む
//   on：この手順の画面（違う画面にいるときは open の画面を開くボタン、back の手順へ戻るボタンを出す）
//   guest：ログイン前の手順。ログインしたら飛ばす。それ以外はログインしてから案内する
//   missing：光らせる所がないとき（店舗がまだないなど）の説明
const STEPS = [
  { guest: true, title: 'アカウントを作る', text: '「アカウント登録」を押してください。アカウントがある方は「ログイン」を押してください。', target: '[data-guide="start"]', tap: true, on: /^\/biz\/?$/, open: '/biz' },
  { guest: true, title: 'メールとパスワードを入れる', text: 'メールアドレスとパスワードを入れて、登録（ログイン）してください。終わると自動で次へ進みます。', target: '.main form', on: /^\/biz\/(register|login)/, open: '/biz/register' },
  { title: '「店舗」を開く', text: '下のバーの「店舗」を押してください。', target: '.tabs a[href="/biz/place"]', tap: true },
  {
    title: 'お店の一覧',
    text: '載せているお店がここに並びます。写真・メニュー・時間枠などを直すときは「店舗情報の変更」を押します。日本語で書けば、英語・中国語・韓国語に自動で翻訳します。',
    target: '.biz-place',
    on: /^\/biz\/place\/?$/,
    open: '/biz/place',
    missing: 'まだお店がありません。「＋ 店舗を追加」から、お店の情報を書いてみましょう。書き終わったら、このガイドの「次へ」で続きへ進めます。',
    missingTarget: '.main a[href="/biz/place/new"]',
  },
  {
    title: '日程を開く',
    text: '「日程（カレンダー）の変更」を押してください。',
    target: '.biz-place-actions a[href$="/calendar"]',
    tap: true,
    on: /^\/biz\/place\/?$/,
    open: '/biz/place',
    missing: 'お店を登録すると、ここに「日程（カレンダー）の変更」が出ます。今は「次へ」で先へ進めます。',
  },
  { title: '日を選ぶ', text: 'カレンダーの日を1つ押してください。', target: '.biz-cal', tap: '.cal-day', on: /^\/biz\/place\/[^/]+\/calendar$/, back: 4 },
  {
    title: '印や人数を変えて「決定」',
    text: '〇△✕ー（ーは未定）や、その日の人数を選べます。変えたら「決定」で確定します。押すまで旅行者の画面は変わりません。試しただけなら「取り消す」で戻せます。',
    target: '.decide-bar, .day-editor',
    on: /^\/biz\/place\/[^/]+\/calendar$/,
    back: 4,
  },
  { title: '「予約」を開く', text: '下のバーの「予約」を押してください。', target: '.tabs a[href="/biz"]', tap: true },
  {
    title: '予約を確かめる',
    text: '空きがあれば、予約はその場で確定してここに並びます。メールは届かないので、こまめに確かめてください。この画面を開いている間は、新しい予約が入ると音で知らせます。都合が悪くなったときは、予約から理由を選んでキャンセルできます。',
    target: '.booking-row, .sound-toggle',
    on: /^\/biz\/?$/,
    open: '/biz',
  },
  { title: '「チャット」を開く', text: '下のバーの「チャット」を押してください。', target: '.tabs a[href="/biz/chats"]', tap: true },
  {
    title: 'お客様とやりとりする',
    text: 'お客様のメッセージは日本語で読めます。日本語で返事を書けば、相手の言葉に訳して届きます。よく使う返事は「定型文」から選べます。',
    target: '.thread-row, .main h1',
    on: /^\/biz\/chats\/?$/,
    open: '/biz/chats',
  },
  {
    title: '当日のこと',
    text: 'お客様には、来店したら名前を伝えるよう案内しています。代金はお店で受け取ってください。このガイドは、右上の三本線（メニュー）の「使い方を見る」から、いつでも見られます。',
    target: '.menu-btn',
  },
];

const KEY = 'ld-biz-tour';
export function savedTour() {
  try {
    const n = Number(sessionStorage.getItem(KEY));
    return sessionStorage.getItem(KEY) != null && n >= 0 && n < STEPS.length ? n : null;
  } catch {
    return null;
  }
}
function save(n) {
  try {
    if (n == null) sessionStorage.removeItem(KEY);
    else sessionStorage.setItem(KEY, String(n));
  } catch {
    /* 保存できなくてもガイドは続く */
  }
}

export default function BizTour({ start = 0, onClose }) {
  const { pathname } = usePath();
  const { user, loading } = useSession();
  const loggedIn = user?.role === 'BUSINESS';
  const [i, setI] = useState(start);
  const step = STEPS[i];
  const last = i === STEPS.length - 1;
  const onPage = !step.on || step.on.test(pathname);
  const needLogin = !step.guest && !loggedIn && !loading;
  const active = onPage && !needLogin && !(loading && !step.guest);

  useEffect(() => save(i), [i]);
  const close = () => (save(null), onClose());

  // ログインしたら、ログイン前の手順は飛ばす
  useEffect(() => {
    if (loggedIn && step.guest) setI(2);
  }, [loggedIn, step.guest]);

  // 光らせる所を探して、位置を追いかける（画面の読み込みやスクロールで動くため）
  const [rect, setRect] = useState(null);
  const [found, setFound] = useState(true);
  const scrolled = useRef(-1);
  useLayoutEffect(() => {
    if (!active) {
      setRect(null);
      return undefined;
    }
    let first = true;
    const find = () => {
      let el = document.querySelector(step.target);
      if (!el && step.missingTarget) el = document.querySelector(step.missingTarget);
      // 読み込み中は「見つからない」と決めない
      const loading = document.querySelector('.main .spinner, .main [aria-busy="true"]');
      if (!loading || el) setFound(!!document.querySelector(step.target));
      if (!el) return setRect(null);
      if (scrolled.current !== i) {
        scrolled.current = i;
        el.scrollIntoView({ block: 'center', behavior: first ? 'auto' : 'smooth' });
      }
      first = false;
      const r = el.getBoundingClientRect();
      setRect((old) => (old && old.top === r.top && old.left === r.left && old.width === r.width && old.height === r.height ? old : { top: r.top, left: r.left, width: r.width, height: r.height }));
    };
    find();
    const timer = setInterval(find, 250);
    window.addEventListener('scroll', find, true);
    window.addEventListener('resize', find);
    return () => (clearInterval(timer), window.removeEventListener('scroll', find, true), window.removeEventListener('resize', find));
  }, [active, i, step]);

  // 押してもらう手順：光っている所が押されたら次へ
  useEffect(() => {
    if (!active || !step.tap) return undefined;
    const sel = step.tap === true ? step.target : step.tap;
    const onClick = (e) => {
      if (e.target.closest?.(sel)) setTimeout(() => setI((n) => (n === i ? n + 1 : n)), 0);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [active, i, step]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  let text = step.text;
  let action = null;
  if (needLogin) {
    text = '続きは、アカウント登録（ログイン）のあとで案内します。';
    action = { label: 'アカウント登録の画面へ', go: () => (setI(1), navigate('/biz/register')) };
  } else if (!onPage) {
    text = `「${step.title}」は別の画面での説明です。`;
    if (step.back != null) action = { label: '店舗の一覧から開く', go: () => (setI(step.back), navigate('/biz/place')) };
    else action = { label: 'その画面を開く', go: () => navigate(step.open) };
  } else if (!found && step.missing) text = step.missing;

  // 光らせる所が画面の下半分なら、説明は上に出す
  const top = rect && rect.top + rect.height / 2 > window.innerHeight * 0.55;
  const pad = 6;
  return (
    <>
      {rect && (
        <div
          className="tour-spot"
          aria-hidden="true"
          style={{ top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }}
        />
      )}
      {!rect && <div className="tour-dim" aria-hidden="true" />}
      <section className={`tour-panel${top ? ' at-top' : ''}`} role="dialog" aria-modal="false" aria-labelledby="tour-title" lang="ja">
        <div className="guide-head">
          <span className="small muted">
            使い方ガイド　{i + 1} / {STEPS.length}
          </span>
          <button type="button" className="link small" onClick={close}>
            ガイドを終わる
          </button>
        </div>
        <ol className="guide-dots" aria-hidden="true">
          {STEPS.map((s, j) => (
            <li key={s.title} className={j === i ? 'on' : j < i ? 'done' : ''} />
          ))}
        </ol>
        <h2 id="tour-title">
          <span className="guide-no">{i + 1}</span>
          {step.title}
        </h2>
        <p aria-live="polite" className={active && step.tap && rect ? 'tour-tap' : undefined}>
          {text}
        </p>
        {action && (
          <button type="button" className="btn block" onClick={action.go}>
            {action.label}
          </button>
        )}
        <div className="btn-row guide-nav">
          <button type="button" className="btn" disabled={i === 0} onClick={() => setI(i - 1)}>
            ← 前へ
          </button>
          {last ? (
            <button type="button" className="btn primary" onClick={close}>
              おわり
            </button>
          ) : (
            <button type="button" className={`btn${active && step.tap && rect ? '' : ' primary'}`} onClick={() => setI(i + 1)}>
              {active && step.tap && rect ? '押さずに次へ →' : '次へ →'}
            </button>
          )}
        </div>
      </section>
    </>
  );
}
