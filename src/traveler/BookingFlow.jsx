import { useEffect, useState } from 'react';
import { ALLERGIES, DIETS, MAX_MESSAGE, MAX_PARTY, addDays, dayMark, jstDate, slotLabel, weekday } from '../../lib/domain.js';
import { api } from '../api.js';
import { Price, RateNote } from '../currency.jsx';
import { useI18n } from '../i18n/index.jsx';
import { WEEKDAYS, label } from '../labels.js';
import { Link } from '../router.jsx';
import { store } from '../store.js';
import { Back, Chips, ErrorNote, Spinner, formatDate, shortDate, useLoad } from '../ui.jsx';
import { Band, lastSearch, paymentsText } from './bits.jsx';
import Manners from './Manners.jsx';
import { NinjaBody } from '../components/Ninja.jsx';

const WINDOW = 35; // カレンダーに一度に出す日数（5週間）
const MARK = { o: '〇', limited: '△', x: '✕', none: 'ー' }; // ー ＝ 日程がまだ決まっていない

// 現地で払う金額：料金があれば 料金 × 人数、なければ値段帯
function PayOnSite({ place, people }) {
  const { t } = useI18n();
  return place.price != null ? <Price yen={place.price * people} /> : <Band band={place.priceBand} suffix={t('perPerson')} />;
}

export default function BookingFlow({ id }) {
  const { t, lang } = useI18n();
  const draftKey = `jimoto-book:${id}`;
  const place = useLoad(() => api.place(id, lang), [id, lang]);
  const today = jstDate();
  // 入力の途中なら続きから。なければ最初の検索で選んだ日付と人数を入れておく
  const [form, setForm] = useState(() => {
    const s = lastSearch();
    return {
      date: s.date && s.date >= today ? s.date : null,
      time: null,
      partySize: s.people ?? 2,
      diets: [],
      message: '',
      ...store.get(draftKey, {}),
    };
  });
  const [from, setFrom] = useState(() => (form.date && form.date > addDays(today, WINDOW - 7) ? addDays(form.date, -7) : today));
  const avail = useLoad(() => api.availability(id, from, WINDOW), [id, from]);
  const [showAllergies, setShowAllergies] = useState(() => form.diets.some((d) => d.startsWith('allergy_')));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);

  // 入力の途中で閉じても、次に開いたときに続きから（端末に保存）
  useEffect(() => {
    if (!done) store.set(draftKey, form);
  }, [draftKey, form, done]);

  if (done) return <Confirmed booking={done} />;
  if (place.loading && !place.data) return <Spinner />;
  if (place.error) return <ErrorNote error={place.error} />;
  const p = place.data.place;
  if (!p.bookable) {
    return (
      <>
        <Back to={`/p/${id}`} label={p.name} />
        <p className="notice">{t('b.notBookable')}</p>
        <Link to={`/p/${id}/chat`} className="btn primary">
          {t('d.ask')}
        </Link>
      </>
    );
  }

  const days = avail.data?.days ?? [];
  const day = days.find((d) => d.date === form.date);
  const slot = day?.slots.find((s) => s.time === form.time);
  const maxParty = Math.min(slot?.left ?? MAX_PARTY, MAX_PARTY);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const missing = [!form.date && t('b.missDate'), !slot && t('b.missTime'), !(form.partySize >= 1) && t('b.missPeople')].filter(Boolean);
  const tooMany = slot && form.partySize > slot.left;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const d = await api.book({ placeId: id, ...form });
      store.remove(draftKey);
      setDone(d.booking);
      window.scrollTo(0, 0);
    } catch (err) {
      setError(err);
      if (['full', 'unavailable'].includes(err.code)) avail.reload();
    } finally {
      setBusy(false);
    }
  };

  const lead = days.length ? weekday(days[0].date) : 0;

  return (
    <>
      <Back to={`/p/${id}`} label={p.name} />
      <h1>{t('b.title', { name: p.name })}</h1>
      <p className="muted small">{t('b.instant')}</p>

      <h2 className="section-title">{t('b.s1')}</h2>
      <p className="small muted" style={{ marginTop: -4 }}>
        {t('res.legend')}
      </p>
      <div className="cal-nav">
        <button className="btn" disabled={from <= today} onClick={() => setFrom(addDays(from, -WINDOW) < today ? today : addDays(from, -WINDOW))}>
          {t('b.earlier')}
        </button>
        <span className="small muted">{days.length ? `${shortDate(days[0].date, lang)} – ${shortDate(days[days.length - 1].date, lang)}` : ''}</span>
        <button className="btn" onClick={() => setFrom(addDays(from, WINDOW))} disabled={addDays(from, WINDOW) > addDays(today, 90)}>
          {t('b.later')}
        </button>
      </div>
      <ErrorNote error={avail.error} onRetry={avail.reload} />
      <div className="calendar" role="grid" aria-label={t('b.chooseDate')}>
        {WEEKDAYS[lang].map((w) => (
          <div key={w} className="cal-wd">
            {w}
          </div>
        ))}
        {Array.from({ length: lead }, (_, i) => (
          <div key={`pad${i}`} />
        ))}
        {days.map((d, i) => {
          const free = d.open && d.slots.some((s) => s.left > 0);
          // 〇△✕は、選んでいる人数で入れるかで決める
          const mark = free ? dayMark(d, form.partySize || 1) : d.undecided ? 'none' : 'x';
          return (
            <button
              key={d.date}
              type="button"
              className={`cal-day mark-${mark}${form.date === d.date ? ' on' : ''}${!d.open ? ' closed' : ''}`}
              disabled={!free}
              aria-pressed={form.date === d.date}
              aria-label={`${formatDate(d.date, lang)}${free ? '' : `, ${d.open ? t('b.fullyBooked') : d.undecided ? t('b.undecided') : t('b.notAvailable')}`}`}
              onClick={() => set({ date: d.date, time: null })}
            >
              <span className="cal-num">
                {d.date.endsWith('-01') || i === 0 ? `${Number(d.date.slice(5, 7))}/` : ''}
                {Number(d.date.slice(8))}
              </span>
              <span className="cal-mark" aria-hidden="true">
                {MARK[mark]}
              </span>
            </button>
          );
        })}
      </div>
      {avail.data && !days.some((d) => d.open && d.slots.some((s) => s.left > 0)) && <p className="notice">{t('b.noOpen')}</p>}

      {day && (
        <>
          <h2 className="section-title">{t('b.s2', { date: formatDate(day.date, lang) })}</h2>
          <div className="slots">
            {day.slots.map((s) => (
              <button
                key={s.time}
                type="button"
                className={form.time === s.time ? 'slot on' : 'slot'}
                disabled={s.left === 0}
                aria-pressed={form.time === s.time}
                onClick={() => set({ time: s.time, partySize: Math.min(form.partySize, s.left) || 1 })}
              >
                <b>{slotLabel(s)}</b>
                <span>{s.left === 0 ? t('b.full') : t('b.left', { n: s.left })}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {slot && (
        <>
          <h2 className="section-title">{t('b.s3')}</h2>
          <div className="stepper">
            <button type="button" className="btn" aria-label={t('b.fewer')} disabled={form.partySize <= 1} onClick={() => set({ partySize: form.partySize - 1 })}>
              −
            </button>
            <b aria-live="polite">{form.partySize}</b>
            <button type="button" className="btn" aria-label={t('b.more')} disabled={form.partySize >= maxParty} onClick={() => set({ partySize: form.partySize + 1 })}>
              +
            </button>
          </div>
          <p className="small muted">
            {t('b.upTo', { n: maxParty })}
            {p.minPeople ? ` ${t('b.minPeople', { n: p.minPeople })}` : ''}
          </p>
          {tooMany && <p className="error">{t('b.onlyLeft', { n: slot.left })}</p>}

          <h2 className="section-title">{t('b.s4')}</h2>
          <Chips options={DIETS.map((d) => ({ value: d, label: label('diet', d, lang) }))} value={form.diets} onChange={(diets) => set({ diets })} label={t('b.s4')} />
          {showAllergies ? (
            <>
              <p className="small muted" style={{ margin: '12px 0 6px' }}>
                {t('b.allergies')}
              </p>
              <Chips options={ALLERGIES.map((a) => ({ value: `allergy_${a}`, label: label('diet', `allergy_${a}`, lang) }))} value={form.diets} onChange={(diets) => set({ diets })} label={t('b.allergies')} />
            </>
          ) : (
            <button type="button" className="link small" style={{ marginTop: 8 }} onClick={() => setShowAllergies(true)}>
              {t('b.addAllergies')}
            </button>
          )}

          <h2 className="section-title">{t('b.s5')}</h2>
          <label className="field">
            <span className="field-label">{t('b.messageLabel')}</span>
            <textarea value={form.message} onChange={(e) => set({ message: e.target.value.slice(0, MAX_MESSAGE) })} maxLength={MAX_MESSAGE} />
            <span className="hint">
              {form.message.length}/{MAX_MESSAGE}
            </span>
          </label>
        </>
      )}

      <div className="card" style={{ marginTop: 16 }}>
        <h2>{t('b.summary')}</h2>
        <dl className="summary">
          <dt>{t('b.date')}</dt>
          <dd>{form.date ? formatDate(form.date, lang) : '—'}</dd>
          <dt>{t('b.time')}</dt>
          <dd>{slot ? slotLabel(slot) : '—'}</dd>
          <dt>{t('b.people')}</dt>
          <dd>{slot ? form.partySize : '—'}</dd>
          <dt>{t('b.pay')}</dt>
          <dd>{slot ? <PayOnSite place={p} people={form.partySize} /> : '—'}</dd>
        </dl>
        <RateNote />
        {p.perk && (
          <p className="small">
            <b>{t('b.perk')}:</b> {p.perk}
          </p>
        )}
        <p className="small muted">{t('b.free')}</p>
        <ErrorNote error={error} />
        {missing.length > 0 && <p className="small muted">{t('b.toBook', { list: missing.join(', ') })}</p>}
        <button className="btn primary block" disabled={missing.length > 0 || tooMany || busy} onClick={submit}>
          {busy ? t('b.booking') : t('b.confirm')}
        </button>
      </div>
    </>
  );
}

function Confirmed({ booking: b }) {
  const { t, lang } = useI18n();
  const p = b.place;
  // 予約できたら、画面いっぱいで忍者がよろこぶ（ボタンで閉じて「お店に行く前に」へ）
  const [celebrate, setCelebrate] = useState(() => !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  return (
    <>
      {celebrate && (
        <div className="booked-overlay" role="dialog" aria-modal="true" aria-label={t('b.done')}>
          <div className="booked-fx" aria-hidden="true">
            {Array.from({ length: 28 }, (_, i) => (
              <span key={i} className={`booked-spark c${i % 3}`} style={{ '--i': i, '--x': `${(i * 37) % 100}%` }} />
            ))}
            {[0, 1, 2].map((i) => (
              <svg key={i} className={`booked-shuriken s${i}`} viewBox="0 0 24 24">
                <path d="M12 1 L14.6 9.4 L23 12 L14.6 14.6 L12 23 L9.4 14.6 L1 12 L9.4 9.4 Z" fill="#4a5462" />
                <path d="M12 1 L14.6 9.4 L12 12 Z M23 12 L14.6 14.6 L12 12 Z" fill="#a6afba" />
                <circle cx="12" cy="12" r="2.6" fill="#ffffff" />
              </svg>
            ))}
          </div>
          <span className="booked-jump" aria-hidden="true">
            <NinjaBody pose="jump" />
          </span>
          <div className="booked-text">
            <h1>{t('b.celebrateTitle')}</h1>
            <p>{t('b.celebrateThanks', { name: p.name })}</p>
            <p className="booked-next">{t('b.celebrateRead')}</p>
            <button
              type="button"
              className="btn primary block"
              autoFocus
              onClick={() => {
                setCelebrate(false);
                window.dispatchEvent(new Event('ld-open-manners'));
                setTimeout(() => document.querySelector('.manners')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
              }}
            >
              {t('b.celebrateGo')}
            </button>
          </div>
        </div>
      )}
      <div className="success" role="status">
        <h1 style={{ marginBottom: 4 }}>{t('b.done')}</h1>
        <p style={{ margin: 0 }}>{t('b.doneBody', { name: p.name })}</p>
      </div>
      {p.perk && (
        <div className="perk-box">
          <b>{t('b.perk')}</b>
          <div>{p.perk}</div>
        </div>
      )}
      <div className="card">
        <dl className="summary">
          <dt>{t('b.date')}</dt>
          <dd>{formatDate(b.date, lang)}</dd>
          <dt>{t('b.time')}</dt>
          <dd>{slotLabel({ time: b.time, end: b.endTime })}</dd>
          <dt>{t('b.people')}</dt>
          <dd>{b.partySize}</dd>
          <dt>{t('d.address')}</dt>
          <dd>
            {p.address}
            {p.addressJa !== p.address && (
              <div className="small muted" lang="ja">
                {p.addressJa}
              </div>
            )}
          </dd>
          <dt>{t('b.pay')}</dt>
          <dd>
            <PayOnSite place={p} people={b.partySize} />
            <div className="small muted">{paymentsText(p, lang)}</div>
          </dd>
        </dl>
        <RateNote />
      </div>
      {/* お店への入り方・マナー・使える日本語 */}
      <Manners booking={b} />
      <p className="muted small">{t('b.after')}</p>
      <div className="btn-row">
        <Link to="/bookings" className="btn primary">
          {t('b.myBookings')}
        </Link>
        <Link to={`/p/${p.id}/chat`} className="btn">
          {t('b.message')}
        </Link>
      </div>
    </>
  );
}
