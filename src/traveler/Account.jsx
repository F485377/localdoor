import { useState } from 'react';
import { api } from '../api.js';
import { useCurrency } from '../currency.jsx';
import { LANG_NAMES, useI18n } from '../i18n/index.jsx';
import { navigate } from '../router.jsx';
import { useSession } from '../session.jsx';
import { ErrorNote } from '../ui.jsx';

export default function Account({ onSettings }) {
  const { t, lang } = useI18n();
  const { user, setUser, logout } = useSession();
  const { currency } = useCurrency();
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
      <h1>{t('a.title')}</h1>
      <div className="card">
        <p className="muted small" style={{ margin: 0 }}>
          {t('a.loggedIn')}
        </p>
        <p>
          <b>{user.email}</b>
        </p>
        <form onSubmit={saveName}>
          <label className="field">
            <span className="field-label">{t('a.name')}</span>
            <input value={name} onChange={(e) => (setName(e.target.value), setSaved(false))} maxLength={60} />
            <span className="hint">{t('a.nameHint')}</span>
          </label>
          <ErrorNote error={error} />
          {saved && <p className="success">{t('a.saved')}</p>}
          <button className="btn" disabled={!name.trim() || name === user.name}>
            {t('a.saveName')}
          </button>
        </form>
      </div>
      <div className="card">
        <div className="status-line">
          <span style={{ flex: 1 }}>
            {LANG_NAMES[lang]} · <b>{currency}</b>
          </span>
          <button className="btn" onClick={onSettings}>
            {t('menu.settings')}
          </button>
        </div>
      </div>
      <button className="btn block" onClick={async () => (await logout(), navigate('/search'))}>
        {t('menu.logout')}
      </button>
      <DeleteAccount onDone={async () => (await logout(), navigate('/search'))} />
    </>
  );
}

function DeleteAccount({ onDone }) {
  const { t } = useI18n();
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
      if (err.code === 'upcoming') err.message = t('a.upcoming', { n: err.data.count });
      if (err.code === 'wrong') err.message = t('a.wrongPassword');
      setError(err);
    } finally {
      setBusy(false);
    }
  };
  if (!open) {
    return (
      <p className="center" style={{ marginTop: 16 }}>
        <button className="link muted small" onClick={() => setOpen(true)}>
          {t('a.delete')}
        </button>
      </p>
    );
  }
  return (
    <form className="card" style={{ marginTop: 16 }} onSubmit={submit}>
      <h2>{t('a.deleteTitle')}</h2>
      <p className="small">{t('a.deleteBody')}</p>
      <label className="field">
        <span className="field-label">{t('a.password')}</span>
        <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>
      <ErrorNote error={error} />
      <div className="btn-row">
        <button type="button" className="btn" onClick={() => setOpen(false)}>
          {t('a.keep')}
        </button>
        <button className="btn danger" disabled={!password || busy}>
          {t('a.deleteBtn')}
        </button>
      </div>
    </form>
  );
}
