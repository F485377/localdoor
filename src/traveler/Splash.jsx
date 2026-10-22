import { useEffect, useRef, useState } from 'react';
import { DoorLogo } from '../components/Logo.jsx';
import { HTML_LANG, LANG_NAMES, useI18n } from '../i18n/index.jsx';
import { LANGS } from '../../lib/domain.js';
import { navigate } from '../router.jsx';
import { useSession } from '../session.jsx';
import { store } from '../store.js';
import Onboarding, { OB_SEEN } from './Onboarding.jsx';

// 最初の画面。
//   ロゴ（閉じた格子の引き戸と「地元」のちょうちん）と、言語を選ぶボタン（1列）。サブタイトルは英語で出す。
//   「はじめる」→ 扉がすぐに大きくなり、画面と同じ大きさになったところで引き戸が開いて光が広がる
//   → そのまま地元の居酒屋に入ったていで、「旅行者」か「お店の方（事業者）」かを選ぶ（ロゴは出さない。壁は扉の中の灯りと同じ黄色）
//   扉が開くと、きらきらと一緒に向こうの居酒屋がそのまま見える
//   → 旅行者：同じ居酒屋の中で、煙から忍者がドロン（はじめて使う人だけ最初の会話。2回目から・ログイン中は、すぐアプリへ。右下の忍者はいつも出る）／事業者：/biz
//   最初の画面の文字は英語。ロゴと文字は、はじめにゆっくり順に出てくる
// スマホでは「Japan's hidden gems,」と「without the language worry.」の2行に分ける
const TAGLINE_EN = ["Japan's hidden gems,", 'without the language worry.'];
const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
// 扉が大きくなる時間・開く時間（styles.css の .door-grow / .door-lit と合わせる）
const GROW_MS = 1000; // 扉が画面いっぱいになるまで
const LIT_MS = 550; // 扉が横に開いたら、すぐ質問を出す
const CLOSE_MS = 1500; // 店の奥へ進む時間

export default function Splash({ children }) {
  const { t, lang, setLang } = useI18n();
  const { user } = useSession();
  // 最初の会話は、はじめて使う人だけ（会話を終えたことがある・ログインしている人は飛ばす）
  const skipTalk = Boolean(user) || store.get(OB_SEEN, false);
  // logo → grow → lit → role →（旅行者）closing → talk か traveler
  const [step, setStep] = useState('logo');
  const doorRef = useRef(null);
  const [zoom, setZoom] = useState(null);
  // 字が順に出てくる途中でタップしたら、すぐ全部出す
  const [shown, setShown] = useState(false);

  const start = () => {
    if (reduced()) return setStep('role');
    // 扉（ロゴの中の引き戸）が画面いっぱいになる大きさと位置を計る
    const box = doorRef.current;
    const svg = box?.querySelector('svg');
    if (svg) {
      const b = box.getBoundingClientRect();
      const r = svg.getBoundingClientRect();
      // 扉全体（梁から敷居まで。viewBox 340×280 の x=20〜248, y=18〜258）が画面いっぱいになるまで、ゆっくり大きくする
      const cx = r.left + (r.width * 134) / 340;
      const cy = r.top + (r.height * 138) / 280;
      const fw = (r.width * 228) / 340;
      const fh = (r.height * 240) / 280;
      const scale = Math.max(window.innerWidth / fw, window.innerHeight / fh) * 1.08;
      // 奥行きのある空間で、扉がこちらへ近づいてくる（近づくほど速く大きくなる）。PERSPECTIVE は styles.css の .splash の perspective と同じ
      const PERSPECTIVE = 900;
      const z = PERSPECTIVE * (1 - 1 / scale);
      setZoom({ transform: `translate3d(${window.innerWidth / 2 - cx}px, ${window.innerHeight / 2 - cy}px, ${z}px)`, origin: `${cx - b.left}px ${cy - b.top}px` });
    }
    setStep('grow');
  };
  useEffect(() => {
    const next = { grow: ['lit', GROW_MS], lit: ['role', LIT_MS], closing: [skipTalk ? 'traveler' : 'talk', CLOSE_MS] }[step];
    if (!next) return undefined;
    const timer = setTimeout(() => setStep(next[0]), next[1]);
    return () => clearTimeout(timer);
  }, [step, skipTalk]);

  // 最初の画面〜忍者との会話の間は、右下の忍者を出さない（会話が終わってから、右下へ来る）
  useEffect(() => {
    document.documentElement.dataset.intro = '1';
    return () => {
      delete document.documentElement.dataset.intro;
    };
  }, []);
  useEffect(() => {
    if (step === 'traveler') {
      delete document.documentElement.dataset.intro;
      window.dispatchEvent(new Event('jimoto-buddy-arrive'));
    }
  }, [step]);

  if (step === 'traveler') return children;
  if (step === 'talk') return <Onboarding onDone={() => setStep('traveler')} fromDoor />;
  // 質問とボタン（扉が開き始めたら、もう出しておく）
  const roleInner = (
    <div className="role-inner">
      <h1 className="center role-title">{t('role.title')}</h1>
      <button type="button" className="role-btn primary" onClick={() => setStep(skipTalk ? 'traveler' : 'talk')} autoFocus>
        <b>{t('role.traveler')}</b>
        <span>{t('role.travelerSub')}</span>
      </button>
      <button type="button" className="role-btn" onClick={() => navigate('/biz?welcome=1')} lang="ja">
        <b>{t('role.business')}</b>
        <span>
          日本語だけで店舗を登録し、予約を受けられます
          {/* 日本語の表示では同じ意味の文が2回になるので、ほかの言語のときだけ訳を添える */}
          {lang !== 'ja' && (
            <>
              <br />
              {t('role.businessSub')}
            </>
          )}
        </span>
      </button>
    </div>
  );
  if (step === 'role' || step === 'closing') {
    return (
      <div className={`role-pick izakaya${step === 'closing' ? ' leaving' : ''}`} role="dialog" aria-modal="true" aria-label={t('role.title')}>
        <img className="izakaya-photo" src="/scene/izakaya.webp" alt="" aria-hidden="true" draggable="false" />
        {roleInner}
      </div>
    );
  }
  return (
    <div className={`splash${step !== 'logo' ? ' opening' : ''}${step === 'lit' ? ' lit' : ''}${shown ? ' shown' : ''}`} onPointerDown={() => setShown(true)}>
      {/* 扉の向こうの居酒屋：扉が画面いっぱいになったら後ろに置いておき、開くとそのまま見える */}
      {step === 'lit' && <img className="izakaya-photo splash-room" src="/scene/izakaya.webp" alt="" aria-hidden="true" draggable="false" />}
      {/* 質問とボタンは扉のうしろに置いておき、扉が開くとすぐ見える */}
      {step === 'lit' && <div className="role-early">{roleInner}</div>}
      <div className="splash-door" ref={doorRef} style={zoom && step !== 'logo' ? { '--door-to': zoom.transform, transformOrigin: zoom.origin } : undefined}>
        <DoorLogo open={step === 'lit'} />
      </div>
      <span className="splash-logo">
        Local<span>Door</span>
      </span>
      <span className="splash-kana" aria-hidden="true">
        ローカルドア
      </span>
      <span className="splash-tagline" lang="en">
        <span>{TAGLINE_EN[0]}</span> <span>{TAGLINE_EN[1]}</span>
      </span>
      <div className="splash-langs" role="group" aria-label="Language">
        {LANGS.map((l) => (
          <button key={l} type="button" className={lang === l ? 'chip on' : 'chip'} lang={HTML_LANG[l]} aria-pressed={lang === l} onClick={() => setLang(l)}>
            {LANG_NAMES[l]}
          </button>
        ))}
      </div>
      <button type="button" className="btn primary splash-start" onClick={start} disabled={step !== 'logo'} autoFocus>
        Start ▶
      </button>
    </div>
  );
}

// 店の奥ののれんをくぐったあとの光。外（叢）の景色の上で、ふっと消える
export function OutsideLight() {
  return <div className="outside-light" aria-hidden="true" />;
}
