import { useEffect, useState } from 'react';
import { CURRENCIES, LANGS } from '../../lib/domain.js';
import Character from '../components/Character.jsx';
import { useCurrency } from '../currency.jsx';
import { HTML_LANG, LANG_NAMES, useI18n } from '../i18n/index.jsx';
import { navigate } from '../router.jsx';

// 旅行者の最初の会話（ログインしていなければ毎回）。
//   画面の上3分の2がキャラクター、下3分の1が言葉と選択肢。
//   忍者のリュウが、叢（くさむら）から煙玉でドロンと出てきて、「こんにちは！」→ 自己紹介 → なぜいるのか → タップすれば話せること を話す。
//   そのあと 言語 → 通貨 → アカウント作成のおすすめ（作る／もう持っている）。どこでも「あとで」で飛ばせる
const WALK_MS = 1900; // 草がゆれて、煙玉でドロン（この間は「walk」）
const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export default function Onboarding({ onDone }) {
  const { t, lang, setLang } = useI18n();
  const { currency, setCurrency } = useCurrency();
  // walk → hello → me → why → tapMe → lang → cur → account
  const [step, setStep] = useState(() => (reduced() ? 'hello' : 'walk'));

  // 出てきたら、あいさつ
  useEffect(() => {
    if (step !== 'walk') return undefined;
    const timer = setTimeout(() => setStep('hello'), WALK_MS);
    return () => clearTimeout(timer);
  }, [step]);

  const finish = (to) => {
    // 何も選ばずに進んでも、推定した言語・通貨で決めたことにする
    setLang(lang);
    setCurrency(currency);
    onDone();
    if (to) navigate(to);
  };

  const LINES = { hello: t('ob.hello'), me: t('ob.me'), why: t('ob.why'), tapMe: t('ob.tapMe'), lang: t('ob.lang'), cur: t('ob.cur'), account: t('ob.account') };
  const NEXT = { hello: 'me', me: 'why', why: 'tapMe', tapMe: 'lang' };
  const talking = step !== 'walk';

  return (
    <div className="ob" role="dialog" aria-modal="true" aria-label={t('ob.hello')}>
      <div className="ob-stage" onClick={() => NEXT[step] && setStep(NEXT[step])}>
        <div className="ob-walker">
          <div className="ob-steps">
            <Character skipBirth={reduced()} talking={talking && NEXT[step] !== undefined} />
          </div>
        </div>
        <Thicket rustle={step === 'walk'} />
      </div>

      <div className="ob-talk">
        {talking && (
          <>
            <p className="ob-bubble" key={step} aria-live="polite">
              {LINES[step]}
            </p>
            {NEXT[step] && (
              <button type="button" className="btn primary block" onClick={() => setStep(NEXT[step])}>
                {t('ob.next')} ▶
              </button>
            )}
            {step === 'lang' && (
              <div className="ob-choices">
                {LANGS.map((l) => (
                  <button key={l} type="button" className={lang === l ? 'chip on' : 'chip'} lang={HTML_LANG[l]} onClick={() => (setLang(l), setStep('cur'))}>
                    {LANG_NAMES[l]}
                  </button>
                ))}
              </div>
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

// 叢（くさむら）。忍者の足元を隠す。登場のときだけガサガサゆれる
const BLADES = Array.from({ length: 22 }, (_, i) => {
  const x = 4 + i * 4.4 + ((i * 37) % 7) * 0.4;
  const h = 18 + ((i * 53) % 11);
  const bend = ((i * 29) % 9) - 4;
  return { x, h, bend, c: ['#5e9152', '#4c7e44', '#77a866'][i % 3], d: (i % 5) * 0.06 };
});
function Thicket({ rustle }) {
  return (
    <svg className={`ob-thicket${rustle ? ' rustle' : ''}`} viewBox="0 0 100 34" preserveAspectRatio="none" aria-hidden="true">
      <rect x="0" y="28" width="100" height="6" fill="#8db77e" />
      {BLADES.map((b) => (
        <path
          key={b.x}
          d={`M${b.x - 2.2} 34 Q${b.x - 1 + b.bend * 0.3} ${34 - b.h * 0.6} ${b.x + b.bend} ${34 - b.h} Q${b.x + 1 + b.bend * 0.3} ${34 - b.h * 0.5} ${b.x + 2.2} 34 Z`}
          fill={b.c}
          style={{ transformOrigin: `${b.x}px 34px`, animationDelay: `${b.d}s` }}
        />
      ))}
    </svg>
  );
}
