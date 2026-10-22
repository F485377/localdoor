import { useEffect, useState } from 'react';
import { CURRENCIES } from '../../lib/domain.js';
import Character from '../components/Character.jsx';
import { useCurrency } from '../currency.jsx';
import { useI18n } from '../i18n/index.jsx';
import { navigate } from '../router.jsx';
import { OutsideLight } from './Splash.jsx';

// 旅行者の最初の会話（ログインしていなければ毎回）。
//   画面の上3分の2がキャラクター、下3分の1が言葉と選択肢。
//   忍者のリュウが、叢（くさむら）から煙玉でドロンと出てきて、「こんにちは！」→ 自己紹介 → なぜいるのか → タップすれば話せること を話す。
//   そのあと 通貨 → アカウント作成のおすすめ（作る／もう持っている）。言語は最初の画面で選ぶので、ここでは聞かない。どこでも「あとで」で飛ばせる
//   しゃべっている間は、ポーズを変える（手を合わせる・構える）。出てくるときは跳んで出てくる
const WALK_MS = 1400; // 草がゆれて、煙玉でドロン（この間は「walk」）
const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// fromDoor：最初の画面の居酒屋の奥へ進んできたとき。のれんの向こうの光がふっと消えて、外（叢）の景色になる
export default function Onboarding({ onDone, fromDoor = false }) {
  const { t, lang, setLang } = useI18n();
  const { currency, setCurrency } = useCurrency();
  // walk → hello → me → why → tapMe → cur → account
  const [step, setStep] = useState(() => (reduced() ? 'hello' : 'walk'));

  // 出てきたら、あいさつ
  useEffect(() => {
    if (step !== 'walk') return undefined;
    const timer = setTimeout(() => setStep('hello'), WALK_MS);
    return () => clearTimeout(timer);
  }, [step]);

  const [leaving, setLeaving] = useState(false);
  // 煙は出しきったら消す（残すと、ぼかしの跡が残ることがある）
  const [smoke, setSmoke] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setSmoke(false), 2200);
    return () => clearTimeout(timer);
  }, []);
  const finish = (to) => {
    // 何も選ばずに進んでも、推定した言語・通貨で決めたことにする
    setLang(lang);
    setCurrency(currency);
    const done = () => {
      onDone();
      if (to) navigate(to);
    };
    // 忍者が右下へ飛んでいって、右下のボタンになる
    if (reduced()) return done();
    setLeaving(true);
    setTimeout(done, 900);
  };

  const LINES = { hello: t('ob.hello'), me: t('ob.me'), why: t('ob.why'), tapMe: t('ob.tapMe'), cur: t('ob.cur'), account: t('ob.account') };
  const NEXT = { hello: 'me', me: 'why', why: 'tapMe', tapMe: 'cur' };
  // しゃべることに合わせたポーズ
  const STANCE = { walk: 'jump', hello: 'sign', me: 'shuriken', why: 'sign', tapMe: 'shuriken', cur: 'sign', account: 'shuriken' };
  const talking = step !== 'walk';

  return (
    <div className="ob" role="dialog" aria-modal="true" aria-label={t('ob.hello')}>
      <div className="ob-stage" onClick={() => NEXT[step] && setStep(NEXT[step])}>
        <div className={`ob-walker${leaving ? ' to-corner' : ''}`}>
          <div className="ob-steps">
            <Character skipBirth={reduced()} talking={talking && NEXT[step] !== undefined} stance={STANCE[step]} />
          </div>
        </div>
        <Thicket rustle={step === 'walk'} />
        {!reduced() && smoke && <SmokeBomb />}
        {fromDoor && <OutsideLight />}
      </div>

      <div className="ob-talk">
        {talking && (
          <>
            <p className="ob-bubble" key={step} aria-live="polite">
              {lines(LINES[step])}
            </p>
            {NEXT[step] && (
              <button type="button" className="btn primary block" onClick={() => setStep(NEXT[step])}>
                {t('ob.next')} ▶
              </button>
            )}
            {step === 'cur' && (
              <div className="ob-choices">
                {CURRENCIES.map((c) => (
                  <button key={c} type="button" className={currency === c ? 'chip on' : 'chip'} onClick={() => (setCurrency(c), setStep('account'))}>
                    {c === 'JPY' ? '円 JPY' : c}
                  </button>
                ))}
              </div>
            )}
            {step === 'account' && (
              <div className="ob-choices col">
                <button type="button" className="btn primary block" onClick={() => finish('/register?next=%2F%3Fedit%3D1')}>
                  {t('ob.create')}
                </button>
                <button type="button" className="btn block" onClick={() => finish('/login?next=%2F%3Fedit%3D1')}>
                  {t('ob.login')}
                </button>
              </div>
            )}
          </>
        )}
        <button type="button" className="link ob-skip" onClick={() => finish()}>
          {t('ob.skip')}
        </button>
      </div>
    </div>
  );
}

// 煙玉：草むらに転がった玉から、灰色の煙がもくもくと出て、その中から忍者が現れる（煙は流れて消える）
// 文ごとに改行して読みやすく（。！？ と . ! ? のあと）
function lines(text) {
  const parts = String(text ?? '')
    .split(/(?<=[。！？])|(?<=[.!?])\s+/)
    .map((x) => x.trim())
    .filter(Boolean);
  return parts.map((x, i) => (
    <span key={i} className="ob-line">
      {x}
    </span>
  ));
}

// 大きな白い煙ひとつ：草むらの下から上へ、もくもくとのぼって消える。その途中で忍者がドロンと出る
function SmokeBomb() {
  return (
    <svg className="smoke-bomb" viewBox="0 0 400 500" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <radialGradient id="smk-fill" cx="0.5" cy="0.5" r="0.5" fx="0.4" fy="0.32">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.65" stopColor="#f3f4f5" />
          <stop offset="1" stopColor="#d4d7dc" />
        </radialGradient>
        <filter id="smk-billow" x="-30%" y="-30%" width="160%" height="160%">
          <feTurbulence type="fractalNoise" baseFrequency="0.025" numOctaves="3" seed="7" />
          <feDisplacementMap in="SourceGraphic" scale="34" xChannelSelector="R" yChannelSelector="G" />
          <feGaussianBlur stdDeviation="2" />
        </filter>
      </defs>
      <g className="smoke-cloud" filter="url(#smk-billow)">
        <ellipse cx="200" cy="330" rx="150" ry="120" fill="url(#smk-fill)" />
        <circle cx="120" cy="300" r="90" fill="url(#smk-fill)" />
        <circle cx="285" cy="300" r="92" fill="url(#smk-fill)" />
        <circle cx="200" cy="220" r="105" fill="url(#smk-fill)" />
        <circle cx="140" cy="390" r="80" fill="url(#smk-fill)" />
        <circle cx="270" cy="395" r="84" fill="url(#smk-fill)" />
      </g>
    </svg>
  );
}

// 叢（くさむら）。ふつうの草の絵。忍者の足元を隠す。登場のときだけガサガサゆれる
const BLADES = Array.from({ length: 26 }, (_, i) => {
  const x = 2 + i * 3.8 + ((i * 37) % 7) * 0.35;
  const h = 18 + ((i * 53) % 13);
  const bend = ((i * 29) % 9) - 4;
  return { x, h, bend, c: ['#5e9152', '#4c7e44', '#77a866', '#6a9a5a'][i % 4], d: (i % 5) * 0.05 };
});
function Thicket({ rustle }) {
  return (
    <svg className={`ob-thicket${rustle ? ' rustle' : ''}`} viewBox="0 0 100 34" preserveAspectRatio="none" aria-hidden="true">
      <rect x="0" y="29" width="100" height="5" fill="#7fae6f" />
      {BLADES.map((b) => (
        <path
          key={b.x}
          d={`M${b.x - 2.4} 34 Q${b.x - 1 + b.bend * 0.3} ${34 - b.h * 0.6} ${b.x + b.bend} ${34 - b.h} Q${b.x + 1 + b.bend * 0.3} ${34 - b.h * 0.5} ${b.x + 2.4} 34 Z`}
          fill={b.c}
          style={{ transformOrigin: `${b.x}px 34px`, animationDelay: `${b.d}s` }}
        />
      ))}
    </svg>
  );
}
