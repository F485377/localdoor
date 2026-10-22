import { useEffect, useState } from 'react';
import { CURRENCIES } from '../../lib/domain.js';
import Character from '../components/Character.jsx';
import { useCurrency } from '../currency.jsx';
import { useI18n } from '../i18n/index.jsx';
import { navigate } from '../router.jsx';
import { store } from '../store.js';

// 旅行者の最初の会話（はじめて使う人だけ。最後まで進むか「あとで」で閉じたら OB_SEEN を覚え、2回目からは出さない。ログインしている人にも出さない）。
//   画面の上3分の2がキャラクター、下3分の1が言葉と選択肢。
//   忍者のリュウが、居酒屋の中で煙の中からドロンと出てきて、「こんにちは！」→ 自己紹介 → なぜいるのか → タップすれば話せること を話す。
//   そのあと 通貨 → アカウント作成のおすすめ（作る／もう持っている）。言語は最初の画面で選ぶので、ここでは聞かない。どこでも「あとで」で飛ばせる
//   しゃべっている間は、ポーズを変える（手を合わせる・構える）。出てくるときは跳んで出てくる
const WALK_MS = 900; // 草がゆれて、煙玉でドロン（この間は「walk」）
export const OB_SEEN = 'jimoto-ob-seen';
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

  // 煙は出しきったら消す（残すと、ぼかしの跡が残ることがある）
  const [smoke, setSmoke] = useState(true);
  const [vanish, setVanish] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSmoke(false), 2200);
    return () => clearTimeout(timer);
  }, []);
  const finish = (to) => {
    // 何も選ばずに進んでも、推定した言語・通貨で決めたことにする
    setLang(lang);
    setCurrency(currency);
    store.set(OB_SEEN, true);
    const done = () => {
      onDone();
      if (to) navigate(to, { smoke: false });
    };
    // ドロン：忍者のまわりに煙がのぼって忍者が消えたら、そのまま地図（最初の検索）かアカウントの画面へ（画面をおおう煙はなし）
    if (reduced()) return done();
    setVanish(true);
    setSmoke(true);
    setTimeout(done, 1000);
  };

  const LINES = { hello: t('ob.hello'), me: t('ob.me'), why: t('ob.why'), tapMe: t('ob.tapMe'), cur: t('ob.cur'), account: t('ob.account') };
  const NEXT = { hello: 'me', me: 'why', why: 'tapMe', tapMe: 'cur' };
  // ひとつ前の話へ戻る
  const PREV = { me: 'hello', why: 'me', tapMe: 'why', cur: 'tapMe', account: 'cur' };
  // しゃべることに合わせたポーズ
  const STANCE = { walk: 'jump', hello: 'sign', me: 'shuriken', why: 'sign', tapMe: 'shuriken', cur: 'sign', account: 'shuriken' };
  const talking = step !== 'walk';

  return (
    <div className="ob" role="dialog" aria-modal="true" aria-label={t('ob.hello')}>
      <div className="ob-stage" onClick={() => NEXT[step] && setStep(NEXT[step])}>
        <img className="izakaya-photo ob-room" src="/scene/izakaya.webp" alt="" aria-hidden="true" draggable="false" />
        <div className={`ob-walker${vanish ? ' doron-out' : ''}`}>
          <div className="ob-steps">
            <Character skipBirth={reduced()} talking={talking && NEXT[step] !== undefined} stance={STANCE[step]} />
          </div>
        </div>
        {!reduced() && smoke && <SmokeBomb key={vanish ? 'out' : 'in'} />}
      </div>

      <div className="ob-talk">
        {talking && (
          <>
            <p className={`ob-bubble${NEXT[step] ? ' more' : ''}`} key={step} aria-live="polite">
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
        <div className="ob-nav">
          {PREV[step] ? (
            <button type="button" className="link ob-back" onClick={() => setStep(PREV[step])}>
              ‹ {t('ob.back')}
            </button>
          ) : (
            <span />
          )}
          <button type="button" className="link ob-skip" onClick={() => finish()}>
            {t('ob.skip')}
          </button>
        </div>
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

// 白い煙：床からやわらかい煙の玉がいくつもふくらみ、まとまって上へのぼり、ほどけて消える。その中で忍者がドロン
const PUFFS = [
  [0, 0, 1.25, 0],
  [-34, -6, 1, 0.02],
  [36, -4, 1.05, 0.04],
  [-16, -40, 1.15, 0.07],
  [20, -46, 1.1, 0.09],
  [0, -82, 1.2, 0.12],
  [-44, -70, 0.95, 0.14],
  [46, -74, 0.95, 0.15],
  [-8, -118, 1.05, 0.18],
  [22, -128, 0.9, 0.2],
];
function SmokeBomb() {
  return (
    <div className="smoke-bomb" aria-hidden="true">
      {PUFFS.map(([x, y, s, d], i) => (
        <span key={i} className="soft-puff" style={{ '--x': `${x}%`, '--y': `${y}%`, '--s': s, '--d': `${d}s` }} />
      ))}
    </div>
  );
}
