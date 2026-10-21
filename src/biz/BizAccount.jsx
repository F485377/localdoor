import { useState } from 'react';
import { api } from '../api.js';
import { OPERATOR } from '../legal.jsx';
import { Link, navigate } from '../router.jsx';
import { useSession } from '../session.jsx';
import { ErrorNote } from '../ui.jsx';

export default function BizAccount() {
  const { user, setUser, logout } = useSession();
  const [name, setName] = useState(user.name);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  const saveName = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const d = await api.updateMe({ name });
      setUser(d.user);
      setSaved(true);
    } catch (err) {
      setError(err);
    }
  };

  return (
    <>
      <h1>アカウント</h1>
      <div className="card">
        <p className="muted small" style={{ margin: 0 }}>
          ログイン中のメールアドレス
        </p>
        <p>
          <b>{user.email}</b>
        </p>
        <p className="small muted">ご家族など、同じアカウントで複数のスマホからログインできます。</p>
        <form onSubmit={saveName}>
          <label className="field">
            <span className="field-label">お名前（担当者）</span>
            <input value={name} onChange={(e) => (setName(e.target.value), setSaved(false))} maxLength={60} />
          </label>
          <ErrorNote error={error} ja />
          {saved && <p className="success">保存しました。</p>}
          <button className="btn" disabled={!name.trim() || name === user.name}>
            名前を保存
          </button>
        </form>
      </div>
      <div className="card">
        <p className="small">
          <Link to="/biz/terms">利用規約</Link>・<Link to="/biz/privacy">プライバシーポリシー</Link>
          {OPERATOR.email && (
            <>
              <br />
              お問い合わせ：<a href={`mailto:${OPERATOR.email}`}>{OPERATOR.email}</a>
            </>
          )}
        </p>
        <button className="btn block" onClick={async () => (await logout(), navigate('/biz'))}>
          ログアウト
        </button>
      </div>
      <Withdraw onDone={async () => (await logout(), navigate('/biz'))} />
    </>
  );
}

function Withdraw({ onDone }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.withdraw(password);
      onDone();
    } catch (err) {
      if (err.code === 'upcoming') err.message = `これからの予約が${err.data.count}件あります。先に「予約」の画面でキャンセルしてください。`;
      if (err.code === 'wrong') err.message = 'パスワードが違います。';
      setError(err);
    } finally {
      setBusy(false);
    }
  };
  if (!open) {
    return (
      <p className="center">
        <button className="link muted small" onClick={() => setOpen(true)}>
          退会する
        </button>
      </p>
    );
  }
  return (
    <form className="card" onSubmit={submit}>
      <h2>退会</h2>
      <p className="small">退会すると掲載は非公開になり、このアカウントではログインできなくなります。同じメールアドレスで登録し直すことはできますが、これまでの予約とチャットは引き継がれません。</p>
      <label className="field">
        <span className="field-label">確認のため、パスワードを入力してください</span>
        <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>
      <ErrorNote error={error} ja />
      <div className="btn-row">
        <button type="button" className="btn" onClick={() => setOpen(false)}>
          やめる
        </button>
        <button className="btn danger" disabled={!password || busy}>
          退会する
        </button>
      </div>
    </form>
  );
}
