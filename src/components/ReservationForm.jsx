import { useState } from 'react';
import { api } from '../api.js';
import { todayIn } from '../../lib/placeFilters.js';
import { formatMoney } from '../format.js';
import { DualPrice } from '../currency.jsx';
import { useI18n } from '../i18n/index.jsx';
import { useProfile } from '../profile.jsx';
import StaffCard from './StaffCard.jsx';

export default function ReservationForm({ place }) {
  const { t, lang } = useI18n();
  const { profile } = useProfile();
  const today = todayIn(place.timeZone);
  const deposit = formatMoney(place.deposit, place.currency, lang);
  const [form, setForm] = useState({
    name: profile?.name ?? '',
    email: '',
    date: today,
    time: '19:00',
    partySize: 2,
    note: '',
  });
  const [state, setState] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [reservation, setReservation] = useState(null);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setState('sending');
    try {
      const r = await api.createReservation({
        ...form,
        partySize: Number(form.partySize),
        placeId: place.id,
        language: lang,
      });
      try {
        localStorage.setItem('reservationEmail', form.email);
      } catch {
        // ignore
      }
      setReservation(r);
      setState('done');
    } catch (err) {
      setErrorMsg(err.message);
      setState('error');
    }
  };

  if (reservation) {
    return (
      <div className="confirmed">
        <p className="success">{t('reservationConfirmed')}</p>
        <StaffCard reservation={reservation} place={place} />
        <p className="small">{t('payment.AUTHORIZED', { amount: deposit })}</p>
      </div>
    );
  }

  return (
    <form className="form" onSubmit={submit}>
      <h3>{t('reserve')}</h3>
      <p className="small muted">
        {place.openingHours} · {t('localTime', { tz: place.timeZone })}
      </p>
      <label>
        {t('name')}
        <input required maxLength={100} value={form.name} onChange={set('name')} autoComplete="name" />
      </label>
      <label>
        {t('email')}
        <input required type="email" value={form.email} onChange={set('email')} autoComplete="email" />
      </label>
      <div className="row">
        <label>
          {t('date')}
          <input required type="date" min={today} value={form.date} onChange={set('date')} />
        </label>
        <label>
          {t('time')}
          <input required type="time" value={form.time} onChange={set('time')} />
        </label>
        <label>
          {t('partySize')}
          <input required type="number" min={1} max={20} value={form.partySize} onChange={set('partySize')} />
        </label>
      </div>
      <label>
        {t('note')}
        <textarea maxLength={500} rows={2} value={form.note} onChange={set('note')} />
      </label>

      <div className="deposit">
        <strong>{t('deposit')}</strong>
        <DualPrice amount={place.deposit} currency={place.currency} />
        <p className="small">{t('depositExplain', { amount: deposit })}</p>
        <p className="small muted">{t('demoNotice')}</p>
      </div>

      <button className="primary" disabled={state === 'sending'}>
        {t('confirmReservation')}
      </button>
      {state === 'error' && <p className="error">{errorMsg || t('error')}</p>}
    </form>
  );
}
