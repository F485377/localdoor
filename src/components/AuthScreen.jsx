import { Fragment, useState } from 'react';
import { PASSWORD_MIN } from '../../lib/domain.js';
import { api } from '../api.js';
import { useCurrency } from '../currency.jsx';
import { useI18n } from '../i18n/index.jsx';
import { Link, navigate } from '../router.jsx';
import { useSession } from '../session.jsx';
import { ErrorNote } from '../ui.jsx';

// ログイン・登録・パスワード再設定（旅行者はその人の言語、事業者は日本語）
//   mode: login | register | forgot | reset
//   base: 旅行者 "" / 事業者 "/biz"
const JA = {
  login: 'ログイン',
  register: 'アカウント登録',
  forgot: 'パスワードの再設定',
  reset: '新しいパスワードを設定',
  email: 'メールアドレス',
  password: 'パスワード',
  newPassword: '新しいパスワード',
  passwordHint: '{n}文字以上',
  name: 'お名前（担当者）',
  nameHint: 'お客様には表示されません',
  agree: '{terms}と{privacy}に同意します。',
  terms: '利用規約',
  privacy: 'プライバシーポリシー',
  submitLogin: 'ログイン',
  submitRegister: '登録する',
  submitForgot: '再設定のメールを送る',
  submitReset: '新しいパスワードを保存',
  toRegister: 'はじめての方：アカウント登録',
  toLogin: 'アカウントをお持ちの方：ログイン',
  toForgot: 'パスワードを忘れた方',
  sent: 'このメールアドレスが登録されていれば、パスワード再設定のリンクを送りました。メール（迷惑メールのフォルダも）をご確認ください。',
  why: '海外からのお客様の予約とチャットを、日本語だけで受けられます。',
  wrongRole: 'このメールアドレスは旅行者のアカウントです。事業者用のアカウントを別のメールアドレスで登録してください。',
  show: '表示',
  hide: '隠す',
  'e.email': '正しいメールアドレスを入力してください',
  'e.password': 'パスワードは{n}文字以上にしてください',
  'e.name': 'お名前を入力してください',
  'e.agree': '利用規約とプライバシーポリシーへの同意が必要です',
  'e.taken': 'このメールアドレスはすでに登録されています',
  'e.wrong': 'メールアドレスかパスワードが違います',
  'e.throttle': '試行回数が多すぎます。15分ほど待ってから、もう一度お試しください',
  'e.expired': 'このリンクは期限が切れています。もう一度、再設定のメールを送ってください',
};

const KNOWN_ERRORS = ['email', 'password', 'name', 'agree', 'taken', 'wrong', 'throttle', 'expired'];

// "{terms}と{privacy}に同意します" のような文に、リンクを差し込む
function withLinks(text, links) {
  return text.split(/(\{terms\}|\{privacy\})/).map((part, i) => <Fragment key={i}>{part === '{terms}' ? links.terms : part === '{privacy}' ? links.privacy : part}</Fragment>);
}

export default function AuthScreen({ mode, lang, role = 'TRAVELER', base = '', next, token }) {
  const i18n = useI18n();
  const ja = lang === 'ja';
  const t = (key, vars) => {
    if (!ja) return i18n.t(`auth.${key}`, vars);
    let s = JA[key] ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
    return s;
  };
  const { setSession } = useSession();
  const { currency, chosen: currencyChosen } = useCurrency();
  const [form, setForm] = useState({ email: '', password: '', name: '', agree: false });
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const q = next ? `?next=${encodeURIComponent(next)}` : '';
  const done = next || base || '/';

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === 'forgot') {
        await api.forgot(form.email);
        setSent(true);
      } else {
        const d =
          mode === 'register'
            ? await api.register({ ...form, role, currency, lang: ja ? undefined : i18n.lang })
            : mode === 'reset'
              ? await api.reset(token, form.password)
              : await api.login({ email: form.email, password: form.password, role });
        if (d.user.role !== role) {
          await api.logout(role === 'BUSINESS' ? 'business' : 'traveler');
          throw Object.assign(new Error(t('wrongRole')), { code: 'role' });
        }
        // この端末で選んだ言語・通貨があれば、アカウントにもそれを使う（最初の会話で選んでからログインしたときなど）
        if (!ja && (i18n.chosen || currencyChosen) && (d.user.lang !== i18n.lang || d.user.currency !== currency)) {
          const u = await api.updateMe({ lang: i18n.lang, currency }).catch(() => null);
          if (u) d.user = u.user;
        }
        setSession(d);
        navigate(done, { replace: true });
      }
    } catch (err) {
      if (err.code === 'role') err.message = t('wrongRole');
      else if (KNOWN_ERRORS.includes(err.code)) err.message = t(`e.${err.code}`, { n: PASSWORD_MIN });
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const links = {
    terms: (
      <a href={`${base}/terms`} target="_blank" rel="noreferrer">
        {t('terms')}
      </a>
    ),
    privacy: (
      <a href={`${base}/privacy`} target="_blank" rel="noreferrer">
        {t('privacy')}
      </a>
    ),
  };

  return (
    <div className="card auth-emaki" style={{ maxWidth: 440, margin: '8px auto' }}>
      <h1>{t(mode)}</h1>
      {(mode === 'login' || mode === 'register') && <p className="muted small">{t('why')}</p>}
      {sent ? (
        <p className="success">{t('sent')}</p>
      ) : (
        <form onSubmit={submit} noValidate>
          {mode !== 'reset' && (
            <label className="field">
              <span className="field-label">{t('email')}</span>
              <input type="email" autoComplete="email" inputMode="email" value={form.email} onChange={set('email')} required />
            </label>
          )}
          {mode === 'register' && (
            <label className="field">
              <span className="field-label">{t('name')}</span>
              <input autoComplete="name" value={form.name} onChange={set('name')} maxLength={60} required />
              <span className="hint">{t('nameHint')}</span>
            </label>
          )}
          {mode !== 'forgot' && (
            <label className="field">
              <span className="field-label">{mode === 'reset' ? t('newPassword') : t('password')}</span>
              <div className="row" style={{ alignItems: 'center' }}>
                <input
                  type={show ? 'text' : 'password'}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  value={form.password}
                  onChange={set('password')}
                  minLength={mode === 'login' ? undefined : PASSWORD_MIN}
                  maxLength={200}
                  required
                  style={{ flex: 1 }}
                />
                <button type="button" className="btn" style={{ flex: 'none' }} onClick={() => setShow((s) => !s)}>
                  {show ? t('hide') : t('show')}
                </button>
              </div>
              {mode !== 'login' && <span className="hint">{t('passwordHint', { n: PASSWORD_MIN })}</span>}
            </label>
          )}
          {mode === 'register' && (
            <label className="check">
              <input type="checkbox" checked={form.agree} onChange={set('agree')} />
              <span>{withLinks(t('agree'), links)}</span>
            </label>
          )}
          <ErrorNote error={error} ja={ja} />
          <button className="btn primary block" disabled={busy || (mode === 'register' && !form.agree)}>
            {t(`submit${mode[0].toUpperCase()}${mode.slice(1)}`)}
          </button>
        </form>
      )}
      <div style={{ marginTop: 16, display: 'grid', gap: 8 }} className="small">
        {mode !== 'register' && <Link to={`${base}/register${q}`}>{t('toRegister')}</Link>}
        {mode !== 'login' && <Link to={`${base}/login${q}`}>{t('toLogin')}</Link>}
        {mode === 'login' && <Link to={`${base}/forgot`}>{t('toForgot')}</Link>}
      </div>
    </div>
  );
}
