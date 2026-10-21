import { useState } from 'react';
import { slotLabel } from '../../lib/domain.js';
import { api } from '../api.js';
import { Price } from '../currency.jsx';
import { useI18n } from '../i18n/index.jsx';
import { label } from '../labels.js';
import { Link } from '../router.jsx';
import { useSession } from '../session.jsx';
import { ErrorNote, Spinner, formatDate, useLoad } from '../ui.jsx';
import { Band } from './bits.jsx';
import Manners from './Manners.jsx';

const BADGE = { CONFIRMED: 'ok', COMPLETED: '', CANCELLED_BY_TRAVELER: '', CANCELLED_BY_BUSINESS: 'ng' };

// マイ予約。開いた時点で、事業者のキャンセルの新着は「見た」になる
export default function Bookings() {
  const { t } = useI18n();
  const { refresh } = useSession();
  const { data, error, loading, reload, setData } = useLoad(() => api.bookings().finally(refresh), []);
  if (loading && !data) return <Spinner kind="rows" />;
  const list = data?.bookings ?? [];
  const upcoming = list.filter((b) => b.status === 'CONFIRMED');
  const past = list.filter((b) => b.status !== 'CONFIRMED').reverse();
  const replace = (b) => setData({ bookings: list.map((x) => (x.id === b.id ? b : x)) });

  return (
    <>
      <h1>{t('mb.title')}</h1>
      <ErrorNote error={error} onRetry={reload} />
      {data && !list.length && (
        <div className="empty">
          <p>{t('mb.none')}</p>
          <Link to="/search" className="btn primary">
            {t('explore')}
          </Link>
        </div>
      )}
      {upcoming.length > 0 && <h2 className="section-title">{t('mb.upcoming')}</h2>}
      {upcoming.map((b) => (
        <BookingRow key={b.id} b={b} onChange={replace} />
      ))}
      {past.length > 0 && <h2 className="section-title">{t('mb.past')}</h2>}
      {past.map((b) => (
        <BookingRow key={b.id} b={b} onChange={replace} />
      ))}
    </>
  );
}

function BookingRow({ b, onChange }) {
  const { t, lang } = useI18n();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const cancel = async () => {
    setBusy(true);
    setError(null);
    try {
      const d = await api.cancelBooking(b.id);
      onChange(d.booking);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  };
  return (
    <div className={`booking-row${b.status.startsWith('CANCELLED') ? ' cancelled' : ''}`}>
      <div className="booking-head">
        <div>
          <div className="booking-when">
            {formatDate(b.date, lang)} · {slotLabel({ time: b.time, end: b.endTime })}
          </div>
          <Link to={`/p/${b.place.id}`}>{b.place.name}</Link>
        </div>
        <span className={`badge ${BADGE[b.status]}`}>
          {b.fresh && `${t('mb.new')} · `}
          {t(`st.${b.status}`)}
        </span>
      </div>
      <p className="small" style={{ margin: '8px 0 4px' }}>
        {b.partySize} {b.partySize === 1 ? t('person') : t('people')} · {t('b.pay')}{' '}
        {b.place.price != null ? <Price yen={b.place.price * b.partySize} /> : <Band band={b.place.priceBand} suffix={t('perPerson')} />}
      </p>
      <p className="small muted" style={{ margin: 0 }}>
        {b.place.address}
      </p>
      {b.diets.length > 0 && <p className="small muted">{t('mb.diet', { list: b.diets.map((d) => label('diet', d, lang)).join(', ') })}</p>}
      {b.place.perk && b.status === 'CONFIRMED' && <p className="small">{t('b.perk')}: {b.place.perk}</p>}
      {/* これからの予約には「お店に行く前に」（開いて読む） */}
      {b.status === 'CONFIRMED' && <Manners booking={b} defaultOpen={false} />}
      {b.status === 'CANCELLED_BY_BUSINESS' && (
        <p className="notice small">
          {t('mb.reason', { reason: label('cancelReason', b.cancelReason, lang) })}
          {b.cancelNote && (
            <>
              <br />“{b.cancelNote}”{b.cancelNoteTranslated === false && ` ${t('mb.originalJa')}`}
            </>
          )}
        </p>
      )}
      <ErrorNote error={error} />
      <div className="btn-row" style={{ marginTop: 8 }}>
        <Link to={`/p/${b.place.id}/chat`} className="btn">
          {t('mb.message')}
        </Link>
        {b.status === 'CONFIRMED' &&
          (confirming ? (
            <button className="btn danger" disabled={busy} onClick={cancel}>
              {busy ? t('mb.cancelling') : t('mb.yesCancel')}
            </button>
          ) : (
            <button className="btn" onClick={() => setConfirming(true)}>
              {t('mb.cancel')}
            </button>
          ))}
      </div>
      {confirming && <p className="small muted">{t('mb.cancelNote')}</p>}
    </div>
  );
}
