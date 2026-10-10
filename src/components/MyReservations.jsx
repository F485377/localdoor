import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { formatMoney, placeNames } from '../format.js';
import { useI18n } from '../i18n/index.jsx';
import StaffCard from './StaffCard.jsx';

function savedEmail() {
  try {
    return localStorage.getItem('reservationEmail') ?? '';
  } catch {
    return '';
  }
}

export default function MyReservations() {
  const { t, lang } = useI18n();
  const { user, mode } = useAuth();
  // 本物のログイン中は、アカウントに結びついた予約を出す（メール入力は不要）
  const byAccount = mode === 'firebase' && Boolean(user);
  const [email, setEmail] = useState(savedEmail);
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [confirmingId, setConfirmingId] = useState(null);

  const find = async (e) => {
    e?.preventDefault();
    setError('');
    try {
      setItems(await api.listReservations(byAccount ? '' : email));
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    if (byAccount || email) find();
    // 開いたとき（とログイン状態が変わったとき）に自動で探す
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [byAccount]);

  const cancel = async (r) => {
    setConfirmingId(null);
    try {
      const updated = await api.cancelReservation(r.id, email);
      setItems(items.map((i) => (i.id === r.id ? { ...i, ...updated } : i)));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="my-reservations">
      <h2>{t('myReservations')}</h2>
      {byAccount ? (
        <p className="small muted">{t('auth.signedIn', { name: user.name || user.email || user.phone || '' })}</p>
      ) : (
        <>
          <form className="lookup" onSubmit={find}>
            <input
              required
              type="email"
              placeholder={t('email')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button className="primary">{t('find')}</button>
          </form>
          <p className="small muted">{t('lookupHint')}</p>
        </>
      )}
      {error && <p className="error">{error}</p>}
      {items?.length === 0 && <p className="muted">{t('noReservations')}</p>}

      <ul className="reservation-list">
        {items?.map((r) => (
          <li key={r.id} className={r.status === 'CANCELLED' ? 'cancelled' : ''}>
            <div className="place-card-head">
              <strong>{placeNames(r.place, lang).primary}</strong>
              <span className={r.status === 'CANCELLED' ? 'badge ng' : 'badge ok'}>{t(`status.${r.status}`)}</span>
            </div>
            <div>
              {r.date} {r.time} · {t('people', { count: r.partySize })}
            </div>
            <div className="small">
              {t(`payment.${r.paymentStatus}`, { amount: formatMoney(r.depositAmount, r.currency, lang) })}
            </div>
            {r.status === 'CONFIRMED' && (
              <>
                <StaffCard reservation={r} place={r.place} />
                {confirmingId === r.id ? (
                  <div className="confirm-box">
                    <p className="small">{t('cancelConfirm')}</p>
                    <div className="actions">
                      <button className="danger" onClick={() => cancel(r)}>
                        {t('cancelYes')}
                      </button>
                      <button className="button" onClick={() => setConfirmingId(null)}>
                        {t('keep')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button className="danger" onClick={() => setConfirmingId(r.id)}>
                    {t('cancel')}
                  </button>
                )}
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
