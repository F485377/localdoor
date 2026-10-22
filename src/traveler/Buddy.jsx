import { useEffect, useRef, useState } from 'react';
import Character from '../components/Character.jsx';
import { useI18n } from '../i18n/index.jsx';
import { store } from '../store.js';

// キャラクター：旅行者画面のどこにでも、画面の右下に小さく出ている。
//   タップ → 吹き出しが出て、「質問する」（会話の画面）か「隠す」を選ぶ
//   ドラッグ → 動かせる（場所は覚えない。画面が変わると右下に戻る）
//   隠す／表示する → 右上のメニューの「キャラクターを表示」。隠していても「キャラクターに質問する」で会話できる
const HIDDEN = 'jimoto-buddy-hidden';
const SIZE = 64;
const EVENT = 'jimoto-buddy';

// 隠す／表示する（メニューとキャラクターで同じ状態を使う）
// キャラクターとの会話の画面を開く（吹き出しの「話す」と、メニューの「キャラクターに質問する」）
const CHAT_EVENT = 'jimoto-buddy-chat';
export const openBuddyChat = () => window.dispatchEvent(new Event(CHAT_EVENT));
export function useBuddyChat() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const on = () => setOpen(true);
    window.addEventListener(CHAT_EVENT, on);
    return () => window.removeEventListener(CHAT_EVENT, on);
  }, []);
  return [open, () => setOpen(false)];
}

export function useBuddyHidden() {
  const [hidden, setHidden] = useState(() => store.get(HIDDEN, false));
  useEffect(() => {
    const on = () => setHidden(store.get(HIDDEN, false));
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);
  const set = (v) => {
    store.set(HIDDEN, v);
    window.dispatchEvent(new Event(EVENT));
  };
  return [hidden, set];
}

const clamp = (p) => ({
  x: Math.min(Math.max(4, p.x), window.innerWidth - SIZE - 4),
  y: Math.min(Math.max(60, p.y), window.innerHeight - SIZE - 4),
});
// いつもは右下（アプリの列の右下。画面下のボタン（送信・予約する）より少し上）。
// 指で動かせるが、場所は覚えない：画面が変わったり、画面の大きさが変わったりしたら右下に戻る
// アプリの列の幅（styles.css の --app-width。スマホはスマホの幅、パソコンは広く）
const appWidth = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--app-width')) || 520;
const defaultPos = () => {
  const right = Math.min(window.innerWidth, (window.innerWidth + appWidth()) / 2);
  return { x: right - SIZE - 8, y: window.innerHeight - SIZE - 84 };
};

// キャラクターは自分からは吹き出しを出さない。タップすると吹き出しが出て、「質問する」か「隠す」を選べる。
// hidden：チャットの画面や会話の画面を開いている間は出さない
export default function Buddy({ hidden: hideHere = false, at }) {
  const { t } = useI18n();
  const [hidden, setHidden] = useBuddyHidden();
  const [pos, setPos] = useState(() => clamp(defaultPos()));
  const [bubble, setBubble] = useState(false);
  const drag = useRef(null);
  // 最初の会話が終わったとき、右下にぽんっと出てくる
  const [arrive, setArrive] = useState(false);
  useEffect(() => {
    const on = () => {
      setArrive(true);
      setTimeout(() => setArrive(false), 1200);
    };
    window.addEventListener('jimoto-buddy-arrive', on);
    return () => window.removeEventListener('jimoto-buddy-arrive', on);
  }, []);

  // 画面の大きさが変わったら右下に戻す
  useEffect(() => {
    const onResize = () => setPos(clamp(defaultPos()));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  // 別の画面に移ったら右下に戻す
  useEffect(() => {
    setPos(clamp(defaultPos()));
    setBubble(false);
  }, [at]);
  // 画面が変わったら吹き出しは閉じる
  useEffect(() => {
    if (hideHere) setBubble(false);
  }, [hideHere]);

  if (hidden || hideHere) return null;

  const onPointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y, moved: false };
  };
  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    if (Math.abs(dx) + Math.abs(dy) > 6) d.moved = true;
    if (d.moved) setPos(clamp({ x: d.ox + dx, y: d.oy + dy }));
  };
  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (!d.moved) setBubble((b) => !b); // 動かさずに離したらタップ → 吹き出し
  };

  // 吹き出しは、キャラクターが画面の右側にいれば左に、左側にいれば右に出す
  const left = pos.x > window.innerWidth / 2;
  return (
    <div className={`buddy${arrive ? ' arrive' : ''}`} style={{ left: pos.x, top: pos.y }}>
      {bubble && (
        <div className={`buddy-bubble ${left ? 'to-left' : 'to-right'}`} role="dialog" aria-label={t('buddy.ask')}>
          <span>{t('buddy.ask')}</span>
          <span className="buddy-actions">
            <button type="button" className="btn primary small buddy-talk" onClick={() => (setBubble(false), openBuddyChat())}>
              {t('buddy.talk')}
            </button>
            <button type="button" className="btn small" onClick={() => (setBubble(false), setHidden(true))}>
              {t('buddy.hide')}
            </button>
          </span>
        </div>
      )}
      <button
        type="button"
        className="buddy-chr"
        aria-label={`${t('buddy.ask')} (${t('buddy.move')})`}
        aria-expanded={bubble}
        title={t('buddy.move')}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (drag.current = null)}
      >
        <Character pose="face" />
      </button>
    </div>
  );
}
