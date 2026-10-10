import { useState } from 'react';
import { useAuth } from '../auth.jsx';
import { useI18n } from '../i18n/index.jsx';

// 今は電話番号とメールだけ出す（Google・Apple の仕組みは src/auth.jsx に残してあるので、ここに足せばまた出せる）
export const ACCOUNT_METHODS = ['phone', 'email'];

// Google / Apple は Onboarding の選択肢から直接ログインする。ここでは電話とメールの入力欄を出す

// よくある失敗は、わかる言葉で伝える。それ以外はまとめて「うまくいかなかった」
const KNOWN_ERRORS = {
  'auth/invalid-verification-code': 'auth.err.code',
  'auth/invalid-phone-number': 'auth.err.phone',
  'auth/wrong-password': 'auth.err.password',
  'auth/invalid-credential': 'auth.err.password',
  'auth/weak-password': 'auth.err.weak',
  'auth/invalid-email': 'auth.err.email',
};

// セリフ枠の中に出す、アカウント作りの入力欄
export default function AccountPanel({ method, name, onBack, onSignedIn }) {
  const { t } = useI18n();
  const auth = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [phone, setPhone] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const run = async (fn) => {
    setBusy(true);
    setError('');
    try {
      const result = await fn();
      return result;
    } catch (err) {
      setError(t(KNOWN_ERRORS[err.code] ?? 'auth.error'));
      return null;
    } finally {
      setBusy(false);
    }
  };

  const signIn = async (fn) => {
    const user = await run(fn);
    if (user) onSignedIn(user);
  };

  if (method === 'phone') {
    // 電話番号は国番号つき（+81...）で送る。空白やハイフンは取り除く
    const e164 = phone.replace(/[\s()-]/g, '');
    return (
      <div className="account-panel">
        {!confirm ? (
          <form
            className="ob-row"
            onSubmit={async (e) => {
              e.preventDefault();
              const fn = await run(() => auth.sendPhoneCode(e164, 'phone-send'));
              if (fn) setConfirm(() => fn);
            }}
          >
            <input
              id="auth-phone"
              type="tel"
              autoFocus
              autoComplete="tel"
              placeholder={t('auth.phoneNumber')}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <button id="phone-send" className="primary" disabled={busy || !/^\+\d{6,15}$/.test(e164)}>
              {t('auth.sendCode')}
            </button>
          </form>
        ) : (
          <form
            className="ob-row"
            onSubmit={(e) => {
              e.preventDefault();
              signIn(() => confirm(code.trim()));
            }}
          >
            <input
              id="auth-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              maxLength={6}
              placeholder={t('auth.code')}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            />
            <button className="primary" disabled={busy || code.length !== 6}>
              {t('auth.verify')}
            </button>
          </form>
        )}
        {auth.mode === 'demo' && confirm && (
          <p className="small muted">{t('auth.demoCode', { code: auth.demoCode })}</p>
        )}
        <Footer t={t} mode={auth.mode} error={error} onBack={onBack} />
      </div>
    );
  }

  return (
    <div className="account-panel">
      <form
        className="ob-col"
        onSubmit={(e) => {
          e.preventDefault();
          signIn(() => auth.email(email.trim(), password, name));
        }}
      >
        <input
          id="auth-email"
          type="email"
          autoFocus
          autoComplete="email"
          placeholder={t('email')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          id="auth-password"
          type="password"
          autoComplete="new-password"
          minLength={6}
          placeholder={t('auth.password')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button className="primary" disabled={busy || !email.includes('@') || password.length < 6}>
          {t('auth.create')}
        </button>
      </form>
      <Footer t={t} mode={auth.mode} error={error} onBack={onBack} />
    </div>
  );
}

function Footer({ t, mode, error, onBack }) {
  return (
    <>
      {error && <p className="error small">{error}</p>}
      {mode === 'demo' && <p className="small muted">{t('auth.demo')}</p>}
      <button type="button" className="link small" onClick={onBack}>
        ← {t('auth.otherWay')}
      </button>
    </>
  );
}
