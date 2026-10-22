import { useState } from 'react';
import { MAX_REVIEW, MAX_REVIEW_PEOPLE, OCCASIONS, RELIGIONS, WITH_WHOM } from '../../lib/domain.js';
import { api } from '../api.js';
import { useI18n } from '../i18n/index.jsx';
import { label } from '../labels.js';
import { Link } from '../router.jsx';
import { useSession } from '../session.jsx';
import { Back, Chips, ErrorNote, Sheet, Spinner, useLoad } from '../ui.jsx';
import { Stars } from './bits.jsx';
import { Donut } from '../components/Charts.jsx';

// 口コミ（/p/:id/reviews）：お店の総評（評点の平均・星ごとの件数・来店シーン・利用シーン・雰囲気・地元のお客さんの割合）。一人ひとりの口コミは出さない。
// 投稿もこの画面から（そのお店を予約して来店した旅行者だけ）
const COLORS = ['#e88ea0', '#e8a317', '#5aa469', '#6f95cf', '#b48ead', '#bdbdbd'];

export default function Reviews({ id }) {
  const { t, lang } = useI18n();
  const { user } = useSession();
  const place = useLoad(() => api.place(id, lang), [id, lang]);
  const { data, error, loading, reload } = useLoad(() => api.reviews(id, lang), [id, lang, user?.id]);
  const [writing, setWriting] = useState(false);
  const [posted, setPosted] = useState(false);
  if ((loading && !data) || (place.loading && !place.data)) return <Spinner kind="rows" />;
  if (error) return <ErrorNote error={error} onRetry={reload} />;

  const { summary: s, mine, canWrite } = data;

  return (
    <>
      <Back to={`/p/${id}`} label={place.data?.place.name ?? t('back')} />
      <h1 style={{ marginBottom: 4 }}>{t('rv.title')}</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        {place.data?.place.name}
      </p>

      {canWrite ? (
        <button type="button" className="btn block outline-primary" onClick={() => (setWriting(true), setPosted(false))}>
          {mine ? t('rv.edit') : t('rv.write')}
        </button>
      ) : user?.role === 'TRAVELER' ? (
        <p className="notice small">{t('rv.notVisited')}</p>
      ) : (
        <Link to={`/login?next=${encodeURIComponent(`/p/${id}/reviews`)}`} className="btn block outline-primary">
          {t('rv.login')}
        </Link>
      )}
      {posted && <p className="success small">{t('rv.posted')}</p>}

      <section className="rv-summary card">
        <h2>{t('rv.average')}</h2>
        <div className="rv-score">
          <div className="rv-big">
            <b>{s.average != null ? s.average.toFixed(1) : '—'}</b>
            <Stars value={s.average ?? 0} size="1.4rem" />
            <span className="small muted">{t('rv.basedOn', { n: s.count })}</span>
          </div>
          <div className="rv-dist">
            {[5, 4, 3, 2, 1].map((n) => (
              <div key={n} className="rv-dist-row">
                <span>{n}</span>
                <span className="rv-bar">
                  <i style={{ width: s.count ? `${(s.dist[n] / s.count) * 100}%` : 0 }} />
                </span>
                <span className="small">{s.dist[n]}</span>
              </div>
            ))}
          </div>
        </div>

        <h2>{t('rv.withChart')}</h2>
        <DonutLegend counts={s.withWhom} group="withWhom" />
        {s.people != null && <p className="small muted">{t('rv.avgPeople', { n: s.people })}</p>}

        <h2>{t('rv.occasionChart')}</h2>
        <Bars counts={s.occasion} group="occasion" />

        <h2>{t('rv.atmosphere')}</h2>
        <Scale left={t('rv.lively')} right={t('rv.calm')} value={s.calm} />
        <Scale left={t('rv.everyday')} right={t('rv.special')} value={s.special} />

        {s.localPct != null && (
          <>
            <h2>{t('rv.localShare')}</h2>
            <Donut
              parts={[
                { key: 'locals', label: t('rv.locals'), value: s.localPct, color: '#5aa469' },
                { key: 'visitors', label: t('rv.visitors'), value: 100 - s.localPct, color: '#bdbdbd' },
              ]}
              center={`${s.localPct}%`}
            />
            <p className="small muted">{t('rv.localNote')}</p>
          </>
        )}
      </section>

      {/* 一人ひとりの口コミは出さない（星の集計と、誰と・シーンのグラフだけ） */}
      <ReviewForm
        open={writing}
        placeId={id}
        mine={mine}
        onClose={() => setWriting(false)}
        onPosted={() => {
          setWriting(false);
          setPosted(true);
          reload();
          place.reload();
        }}
      />
    </>
  );
}

export function DonutLegend({ counts, group }) {
  const { t, lang } = useI18n();
  const parts = Object.entries(counts)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([k, n], i) => ({ key: k, label: label(group, k, lang), value: n, color: COLORS[i % COLORS.length] }));
  if (!parts.length) return <p className="small muted">{t('rv.noData')}</p>;
  return <Donut parts={parts} />;
}

// 横棒（利用シーン）
export function Bars({ counts, group }) {
  const { t, lang } = useI18n();
  const rows = Object.entries(counts)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);
  const total = rows.reduce((n, [, x]) => n + x, 0);
  if (!rows.length) return <p className="small muted">{t('rv.noData')}</p>;
  return (
    <div className="rv-bars">
      {rows.map(([k, n]) => (
        <div key={k} className="rv-dist-row wide">
          <span>{label(group, k, lang)}</span>
          <span className="rv-bar">
            <i style={{ width: `${(n / total) * 100}%` }} />
          </span>
          <span className="small">{Math.round((n / total) * 100)}%</span>
        </div>
      ))}
    </div>
  );
}

// 雰囲気：左右の言葉のあいだの、どのあたりか（1〜5 の平均）
export function Scale({ left, right, value }) {
  const { t } = useI18n();
  return (
    <div className="rv-scale">
      <span>{left}</span>
      <span className="rv-scale-line">
        {[0, 1, 2, 3, 4].map((i) => (
          <i key={i} className="tick" style={{ left: `${i * 25}%` }} />
        ))}
        {value && <b className="dot" style={{ left: `${((value.value - 1) / 4) * 100}%` }} title={String(value.value)} />}
      </span>
      <span>{right}</span>
      {!value && <span className="small muted rv-scale-none">{t('rv.noData')}</span>}
    </div>
  );
}

// 口コミを書く。星（必須）・誰と／何人で（必須）・どんな時に・宗教・雰囲気・文章（任意）
function ReviewForm({ open, placeId, mine, onClose, onPosted }) {
  const { t, lang } = useI18n();
  const [f, setF] = useState(() => ({
    rating: mine?.rating ?? 0,
    withWhom: mine?.withWhom ?? null,
    people: mine?.people ?? 2,
    occasion: mine?.occasion ?? null,
    religion: mine?.religion ?? null,
    calm: mine?.calm ?? null,
    special: mine?.special ?? null,
    comment: mine?.original ?? '',
  }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!f.rating) return setError({ message: t('rv.rateNeeded') });
    if (!f.withWhom || !f.people) return setError({ message: t('rv.sceneNeeded') });
    setBusy(true);
    setError(null);
    try {
      await api.writeReview({ placeId, ...f });
      onPosted();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };
  const req = <span className="req">{t('rv.required')}</span>;
  const opt = <span className="opt">{t('rv.optional')}</span>;

  return (
    <Sheet open={open} onClose={onClose} title={mine ? t('rv.edit') : t('rv.write')} closeLabel={t('close')} className="tall-sheet">
      <form onSubmit={submit} className="rv-form">
        <div className="field">
          <span className="field-label">
            {t('rv.rating')}
            {req}
          </span>
          <div className="star-input" role="radiogroup" aria-label={t('rv.rating')}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" role="radio" aria-checked={f.rating === n} aria-label={t('rv.stars', { n })} className={n <= f.rating ? 'on' : ''} onClick={() => set('rating')(n)}>
                ★
              </button>
            ))}
          </div>
        </div>

        <h3 className="section-title">{t('rv.scene')}</h3>
        <div className="field">
          <span className="field-label">
            {t('rv.withWhom')}
            {req}
          </span>
          <Chips multi={false} options={WITH_WHOM.map((k) => ({ value: k, label: label('withWhom', k, lang) }))} value={f.withWhom} onChange={set('withWhom')} label={t('rv.withWhom')} />
        </div>
        <div className="field">
          <span className="field-label">
            {t('rv.people')}
            {req}
          </span>
          <div className="stepper">
            <button type="button" className="btn" aria-label="−" disabled={f.people <= 1} onClick={() => set('people')(f.people - 1)}>
              −
            </button>
            <b aria-live="polite">{t('rv.peopleN', { n: f.people })}</b>
            <button type="button" className="btn" aria-label="+" disabled={f.people >= MAX_REVIEW_PEOPLE} onClick={() => set('people')(f.people + 1)}>
              +
            </button>
          </div>
        </div>
        <div className="field">
          <span className="field-label">
            {t('rv.occasion')}
            {opt}
          </span>
          <Chips multi={false} options={OCCASIONS.map((k) => ({ value: k, label: label('occasion', k, lang) }))} value={f.occasion} onChange={set('occasion')} label={t('rv.occasion')} />
        </div>

        <div className="field">
          <span className="field-label">
            {t('rv.religion')}
            {opt}
          </span>
          <Chips multi={false} options={RELIGIONS.map((k) => ({ value: k, label: label('religion', k, lang) }))} value={f.religion} onChange={set('religion')} label={t('rv.religion')} />
          <span className="hint">{t('rv.religionNote')}</span>
        </div>

        <div className="field">
          <span className="field-label">
            {t('rv.atmosphere')}
            {opt}
          </span>
          <ScaleInput left={t('rv.lively')} right={t('rv.calm')} value={f.calm} onChange={set('calm')} />
          <ScaleInput left={t('rv.everyday')} right={t('rv.special')} value={f.special} onChange={set('special')} />
        </div>

        <label className="field">
          <span className="field-label">
            {t('rv.comment')}
            {opt}
          </span>
          <textarea rows={5} maxLength={MAX_REVIEW} value={f.comment} onChange={(e) => set('comment')(e.target.value)} />
          <span className="hint">
            {f.comment.length} / {MAX_REVIEW}
          </span>
        </label>

        <ErrorNote error={error} />
        <div className="btn-row">
          <button type="button" className="btn" onClick={onClose}>
            {t('rv.cancel')}
          </button>
          <button className="btn primary" disabled={busy}>
            {busy ? t('rv.posting') : t('rv.post')}
          </button>
        </div>
      </form>
    </Sheet>
  );
}

// 5段階をタップで選ぶ（もう一度押すと外す）
function ScaleInput({ left, right, value, onChange }) {
  return (
    <div className="scale-input">
      <span className="small">{left}</span>
      <span className="scale-dots" role="radiogroup" aria-label={`${left} – ${right}`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={String(n)} className={value === n ? 'on' : ''} onClick={() => onChange(value === n ? null : n)} />
        ))}
      </span>
      <span className="small">{right}</span>
    </div>
  );
}
