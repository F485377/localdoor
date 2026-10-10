import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { citiesOf, flag } from '../format.js';
import { useI18n } from '../i18n/index.jsx';
import { cityLabel } from '../localize.js';
import { useProfile } from '../profile.jsx';
import AccountPanel, { ACCOUNT_METHODS } from './AccountPanel.jsx';
import CountryInput from './CountryInput.jsx';
import Heart3D from './Heart3D.jsx';

// ドキちゃんとの会話（ノベルゲーム風）。上にドキちゃん、下のセリフ枠に1文字ずつ文字が出る。
// 自己紹介まではスマホの言語で話し、そのあと言語を選んでもらう。
const SCRIPT = [
  { id: 'intro', lines: ['ob.hello', 'ob.intro1', 'ob.intro2', 'ob.intro3', 'ob.intro4'] },
  { id: 'language', lines: ['ob.language'] },
  { id: 'name', lines: ['ob.name'] },
  { id: 'home', lines: ['ob.home'] },
  { id: 'destination', lines: ['ob.destination'] },
  { id: 'diet', lines: ['ob.diet'] },
  { id: 'account', lines: ['ob.account1', 'ob.account'] },
  { id: 'done', lines: ['ob.done'] },
];
const STEP = Object.fromEntries(SCRIPT.map((s, i) => [s.id, i]));
const DIETS = ['vegetarian', 'halal'];
const TYPE_SPEED = 38; // 1文字あたりのミリ秒

// 文字を1つずつ表示する。finish() で残りを一気に出す
function useTypewriter(text) {
  const [count, setCount] = useState(0);
  const reduce = useRef(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  const length = Array.from(text).length;

  useEffect(() => {
    if (reduce.current) {
      setCount(length);
      return undefined;
    }
    setCount(0);
    const timer = setInterval(() => {
      setCount((c) => {
        if (c >= length) clearInterval(timer);
        return Math.min(c + 1, length);
      });
    }, TYPE_SPEED);
    return () => clearInterval(timer);
  }, [text, length]);

  return {
    shown: Array.from(text).slice(0, count).join(''),
    done: count >= length,
    finish: () => setCount(length),
  };
}

export default function Onboarding({ onDone }) {
  const { t, lang, setLang, languages } = useI18n();
  const { profile, setProfile } = useProfile();
  const auth = useAuth();
  const { user } = auth;
  const [authError, setAuthError] = useState('');
  const editing = Boolean(profile);
  const firstStep = editing ? STEP.language : STEP.intro;
  const [step, setStep] = useState(firstStep);
  const [line, setLine] = useState(0);
  const [returning, setReturning] = useState(false); // 「アカウントをお持ちの方」から来たとき
  const [accountMethod, setAccountMethod] = useState(null);
  const [draft, setDraft] = useState({
    name: profile?.name ?? '',
    homeCountry: profile?.homeCountry ?? '',
    destination: profile?.destination ?? '',
    diet: profile?.diet ?? [],
  });
  const [cities, setCities] = useState([]);
  // ドキちゃんが光から生まれ終わるまで（約3秒）は、しゃべらずに待つ
  const [born, setBorn] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
  useEffect(() => {
    const timer = setTimeout(() => setBorn(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  const scene = SCRIPT[step];
  const isLastLine = line === scene.lines.length - 1;
  const signedInName = user?.name || user?.email || user?.phone || draft.name;

  let text = t(scene.lines[line], { name: draft.name });
  if (scene.id === 'account' && isLastLine && user) text = t('ob.accountDone', { name: signedInName });
  else if (scene.id === 'account' && returning) text = t('ob.signInAgain');
  const typing = useTypewriter(born ? text : '');

  useEffect(() => {
    api
      .listPlaces({})
      .then((places) => setCities(citiesOf(places)))
      .catch(() => setCities([]));
  }, []);

  const goTo = (id, startLine = 0) => {
    setStep(STEP[id]);
    setLine(startLine);
    setAccountMethod(null);
  };
  const next = () => goTo(SCRIPT[step + 1].id);
  const back = () => goTo(SCRIPT[Math.max(step - 1, firstStep)].id);

  // セリフ枠をタップ：文字の途中なら全部出す → 会話だけの行なら次の行へ
  const onBoxClick = (e) => {
    if (e.target.closest('input, button, select, ul, a, form')) return;
    if (!typing.done) return typing.finish();
    if (!isLastLine) return setLine((l) => l + 1);
    if (scene.id === 'intro') next();
  };

  const finish = () => {
    const saved = { ...draft, language: lang, completedAt: new Date().toISOString() };
    setProfile(saved);
    if (user) api.saveMe(saved).catch(() => {}); // ログイン中ならアカウントにも保存
    onDone(saved);
  };

  // ログインできたら：前にプロフィールを保存していれば復元して終わり、なければ質問へ
  const onSignedIn = async () => {
    if (!returning) return next();
    try {
      const saved = await api.getMe();
      const restored = { ...saved, completedAt: new Date().toISOString() };
      if (saved.language) setLang(saved.language);
      setProfile(restored);
      onDone(restored);
    } catch {
      setReturning(false);
      goTo('language');
    }
  };

  const showControls = typing.done && isLastLine;

  // 選択肢（セリフ枠の上に並ぶボタン）
  let choices = null;
  if (showControls) {
    if (scene.id === 'language') {
      choices = languages.map((l) => ({
        label: l.label,
        active: l.code === lang,
        onClick: () => {
          setLang(l.code);
          next();
        },
      }));
    } else if (scene.id === 'destination') {
      choices = [
        ...cities.map((c) => ({
          label: `${flag(c.country)} ${cityLabel(c, lang)}`,
          onClick: () => {
            setDraft({ ...draft, destination: c.name });
            next();
          },
        })),
        {
          label: t('ob.undecided'),
          ghost: true,
          onClick: () => {
            setDraft({ ...draft, destination: '' });
            next();
          },
        },
      ];
    } else if (scene.id === 'diet') {
      choices = DIETS.map((d) => ({
        label: t(d),
        active: draft.diet.includes(d),
        toggle: true,
        onClick: () =>
          setDraft({
            ...draft,
            diet: draft.diet.includes(d) ? draft.diet.filter((x) => x !== d) : [...draft.diet, d],
          }),
      }));
    } else if (scene.id === 'account' && !accountMethod) {
      choices = user
        ? [{ label: t('ob.next'), onClick: onSignedIn }]
        : [
            ...ACCOUNT_METHODS.map((m) => ({
              label: t(`auth.${m}`),
              // Google / Apple はボタンを押したその場でログイン画面を開く（後からだとポップアップが止められる）
              onClick:
                m === 'google' || m === 'apple'
                  ? async () => {
                      setAuthError('');
                      try {
                        await auth[m]();
                        onSignedIn();
                      } catch (err) {
                        if (err.code !== 'auth/popup-closed-by-user') setAuthError(t('auth.error'));
                      }
                    }
                  : () => setAccountMethod(m),
            })),
            returning
              ? { label: t('ob.newHere'), ghost: true, onClick: () => (setReturning(false), goTo('language')) }
              : { label: t('auth.later'), ghost: true, onClick: next },
          ];
    }
  }

  const tappable = !typing.done || !isLastLine || scene.id === 'intro';

  return (
    <div className="vn-page">
      <div className="vn">
        <div className="vn-stage">
          <div className="birth-light" aria-hidden="true" />
          <Heart3D talking={!typing.done} />
          {choices && (
            <div className={choices.length > 4 ? 'vn-choices many' : 'vn-choices'}>
              {choices.map((c) => (
                <button
                  key={c.label}
                  className={['vn-choice', c.active && 'active', c.ghost && 'ghost'].filter(Boolean).join(' ')}
                  aria-pressed={c.toggle ? Boolean(c.active) : undefined}
                  onClick={c.onClick}
                >
                  {c.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={tappable ? 'vn-box tappable' : 'vn-box'} onClick={onBoxClick}>
          <div className="vn-name">{t('doki.name')}</div>
          <p className="vn-text" aria-live="polite">
            {typing.shown}
          </p>

          {showControls && scene.id === 'name' && (
            <form
              className="ob-row"
              onSubmit={(e) => {
                e.preventDefault();
                if (draft.name.trim()) {
                  setDraft({ ...draft, name: draft.name.trim() });
                  next();
                }
              }}
            >
              <input
                id="ob-name"
                autoFocus
                maxLength={40}
                placeholder={t('yourName')}
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                autoComplete="given-name"
              />
              <button className="primary" disabled={!draft.name.trim()}>
                {t('ob.next')}
              </button>
            </form>
          )}

          {showControls && scene.id === 'home' && (
            <div className="ob-row">
              <CountryInput
                lang={lang}
                value={draft.homeCountry}
                placeholder={t('ob.typeCountry')}
                onChange={(code) => setDraft((d) => ({ ...d, homeCountry: code }))}
              />
              <button className="primary" onClick={next}>
                {draft.homeCountry ? t('ob.next') : t('ob.skip')}
              </button>
            </div>
          )}

          {showControls && scene.id === 'diet' && (
            <div className="ob-row end">
              <button className="primary" onClick={next}>
                {draft.diet.length ? t('ob.next') : t('ob.noDiet')}
              </button>
            </div>
          )}

          {showControls && scene.id === 'account' && !accountMethod && (authError || auth.mode === 'demo') && !user && (
            <>
              {authError && <p className="error small">{authError}</p>}
              {auth.mode === 'demo' && <p className="small muted">{t('auth.demo')}</p>}
            </>
          )}

          {showControls && scene.id === 'account' && accountMethod && (
            <AccountPanel
              method={accountMethod}
              name={draft.name}
              onBack={() => setAccountMethod(null)}
              onSignedIn={onSignedIn}
            />
          )}

          {showControls && scene.id === 'done' && (
            <div className="ob-row end">
              <button className="primary big" onClick={finish}>
                {t('ob.start')}
              </button>
            </div>
          )}

          <div className="vn-foot">
            {scene.id === 'intro' && (
              <button
                className="link small"
                onClick={() => {
                  setReturning(true);
                  goTo('account', 1);
                }}
              >
                {t('ob.haveAccount')}
              </button>
            )}
            {step > firstStep && scene.id !== 'done' && !(returning && scene.id === 'account') && (
              <button className="link small" onClick={back}>
                ← {t('back')}
              </button>
            )}
            {tappable && (
              <span className="vn-next" title={t('ob.tap')} aria-hidden="true">
                ▼
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
