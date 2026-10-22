import { Bars, DonutLegend, Scale } from './Reviews.jsx';
import { dishPhoto, frontPhoto } from '../stockPhotos.js';
import { useState } from 'react';
import { REPORT_REASONS, dayMark, jstDate, slotLabel } from '../../lib/domain.js';
import { api } from '../api.js';
import { PlaceMap } from '../components/Maps.jsx';
import DishArt, { dishSlides } from '../components/DishArt.jsx';
import PhotoCarousel from '../components/PhotoCarousel.jsx';
import PlaceArt from '../components/PlaceArt.jsx';
import { Gloss } from '../glossary.jsx';
import { Donut } from '../components/Charts.jsx';
import { Price, RateLine, RateNote, formatYen } from '../currency.jsx';
import { useI18n } from '../i18n/index.jsx';
import { WEEKDAYS, artInput, duration, label, options, placeWhere } from '../labels.js';
import { Link, navigate } from '../router.jsx';
import { store } from '../store.js';
import { Back, Chips, ErrorNote, Sheet, Spinner, useLoad } from '../ui.jsx';
import { Band, Facilities, Stars, lastSearch, paymentsText, saveSearch, yearsText } from './bits.jsx';
import { SaveButton } from './savedStore.jsx';

// 区切り（枠と色で分ける）。tone：local（緑）・price（赤）・schedule（青）・owner（黄）
// 口コミの欄（場所の下）：平均と星ごとの件数、新しい口コミ3件、「すべて見る・書く」
function ReviewsSection({ placeId }) {
  const { t, lang } = useI18n();
  const { data } = useLoad(() => api.reviews(placeId, lang), [placeId, lang]);
  if (!data) return null;
  const s = data.summary;
  return (
    <Section tone="review" title={t('rv.title')}>
      {s.count ? (
        <>
          <div className="rv-mini">
            <div className="rv-mini-score">
              <b>{s.average.toFixed(1)}</b>
              <Stars value={s.average} size="1.1rem" />
              <span className="small muted">{t('rv.count', { n: s.count })}</span>
            </div>
            <div className="rv-dist">
              {[5, 4, 3, 2, 1].map((n) => (
                <div key={n} className="rv-dist-row">
                  <span>{n}</span>
                  <span className="rv-bar">
                    <i style={{ width: `${(s.dist[n] / s.count) * 100}%` }} />
                  </span>
                  <span className="small">{s.dist[n]}</span>
                </div>
              ))}
            </div>
          </div>
          {/* 一人ひとりの口コミは出さず、誰と来たか・利用シーンのグラフと、お店の雰囲気を出す */}
          <h3 className="rv-mini-h">{t('rv.withChart')}</h3>
          <DonutLegend counts={s.withWhom} group="withWhom" />
          {s.people != null && <p className="small muted">{t('rv.avgPeople', { n: s.people })}</p>}
          <h3 className="rv-mini-h">{t('rv.occasionChart')}</h3>
          <Bars counts={s.occasion} group="occasion" />
          <h3 className="rv-mini-h">{t('rv.atmosphere')}</h3>
          <Scale left={t('rv.lively')} right={t('rv.calm')} value={s.calm} />
          <Scale left={t('rv.everyday')} right={t('rv.special')} value={s.special} />
        </>
      ) : (
        <p className="muted small" style={{ margin: 0 }}>
          {t('rv.none')}
        </p>
      )}
      <Link to={`/p/${placeId}/reviews`} className="btn block" style={{ marginTop: 14 }}>
        {s.count ? t('rv.seeAll', { n: s.count }) : t('rv.see')}
      </Link>
    </Section>
  );
}

function Section({ tone = '', title, children }) {
  return (
    <section className={`sec ${tone}`}>
      <h2 className="sec-head">{title}</h2>
      <div className="sec-body">{children}</div>
    </section>
  );
}

export default function PlaceDetail({ id }) {
  const { t, lang } = useI18n();
  const { data, error, loading, reload } = useLoad(() => api.place(id, lang), [id, lang]);
  const [reporting, setReporting] = useState(false);
  if (loading && !data) return <Spinner kind="detail" />;
  if (error) {
    return (
      <>
        <Back to="/search" label={t('back')} />
        <ErrorNote error={error} onRetry={error.status === 404 ? undefined : reload} />
      </>
    );
  }
  const p = data.place;
  const closed = p.closedWeekdays?.length ? p.closedWeekdays.map((d) => WEEKDAYS[lang][d]).join(', ') : null;

  return (
    <>
      <Back to="/search" label={t('back')} />
      {/* パソコンでは、左に写真・右に絵巻 */}
      <div className="detail-grid">
      {/* 一番上に写真をスライドで。写真がないお店は、料理・体験の写真風イラスト（「イメージ」と出す）とお店の絵 */}
      <PhotoCarousel
        label={p.name}
        photos={
          p.photos.length
            ? p.photos
            : [
                // イメージ写真（無料で使える写真）。その種類の写真がなければ、写真風のイラスト
                ...dishSlides(p, lang).map((d, i) => ({
                  key: d.kind,
                  node: dishPhoto(d.kind, i) ? <img className="stock-photo" src={dishPhoto(d.kind, i)} alt="" loading={i === 0 ? 'eager' : 'lazy'} /> : <DishArt kind={d.kind} seed={i} />,
                  caption: d.caption,
                  note: t('d.imageNote'),
                })),
                { key: 'place', node: frontPhoto(p) ? <img className="stock-photo" src={frontPhoto(p)} alt="" loading="lazy" /> : <PlaceArt place={artInput(p)} />, note: t('d.imageNote') },
              ]
        }
      />
      {/* 写真の下は巻物のように：上の軸から下へ、お店の情報がひらいていく */}
      <div className="emaki">
        {/* 上：軸（両はしに軸先）・金襴の表紙・紐 */}
        <div className="emaki-top" aria-hidden="true">
          <span className="emaki-rod" />
          <span className="emaki-cover" />
          <span className="emaki-cord" />
        </div>
        <div className="scroll-paper">
      <span className="eyebrow">
        {label('category', p.category, lang)} · {placeWhere(p, lang)}
      </span>
      {p.sample && (
        <span className="badge sample" style={{ marginLeft: 8 }}>
          {t('sample')}
        </span>
      )}
      <div className="status-line" style={{ alignItems: 'flex-start', marginTop: 4 }}>
        <h1 style={{ flex: 1, margin: 0 }}>{p.name}</h1>
        <SaveButton placeId={p.id} />
      </div>
      {p.translated && p.nameJa !== p.name && (
        <p className="muted" lang="ja">
          {p.nameJa}
        </p>
      )}
      {!p.translated && <p className="notice">{t('d.notTranslated')}</p>}
      <Link to={`/p/${p.id}/reviews`} className="rating-link">
        {p.rating ? (
          <>
            <Stars value={p.rating.average} /> <b>{p.rating.average.toFixed(1)}</b> <span className="muted">({t('rv.count', { n: p.rating.count })})</span>
          </>
        ) : (
          <span className="muted">{t('rv.title')}: 0</span>
        )}
        <span className="rating-more">{t('rv.see')} ›</span>
      </Link>

      {p.perk && (
        <div className="perk-box">
          <b>{t('d.perk')}</b>
          <div>
            <Gloss text={p.perk} />
          </div>
        </div>
      )}

      <Section tone="local" title={t('d.sectionLocal')}>
        {p.localPct != null && (
          <>
            <Donut
              parts={[
                { key: 'locals', label: t('rv.locals'), value: p.localPct, color: '#5aa469' },
                { key: 'visitors', label: t('rv.visitors'), value: 100 - p.localPct, color: '#bdbdbd' },
              ]}
              center={`${p.localPct}%`}
            />
            <p className="small muted" style={{ margin: '6px 0 10px' }}>
              {t('rv.localNote')}
            </p>
          </>
        )}
        <div className="local-facts" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 0 }}>
          <div className="local-fact">
            <b>{p.foundedYear ? yearsText(p, t) : '—'}</b>
            <span>{t('d.inBusiness')}</span>
          </div>
          <div className="local-fact">
            <b>{p.stationKm} km</b>
            <span>{t('d.fromStation', { station: p.station })}</span>
          </div>
        </div>
        <p className="small muted" style={{ margin: '8px 0 0' }}>
          {t('d.factsNote')}
        </p>
      </Section>

      <Section tone="price" title={t('d.sectionPrice')}>
        <span className="small muted">{t('d.priceRange')}</span>
        <div>
          <Band band={p.priceBand} suffix={t('perPerson')} />
        </div>
        {p.price != null && (
          <div style={{ marginTop: 6 }}>
            <Price yen={p.price} suffix={t('perPerson')} />
          </div>
        )}
        <p className="small muted" style={{ margin: '4px 0 0' }}>
          {t('pay.list', { list: paymentsText(p, lang) || '—' })}
        </p>
        <RateLine />
        <RateNote />
      </Section>

      {p.bookable && (
        <Section tone="schedule" title={t('d.schedule')}>
          <Schedule place={p} />
        </Section>
      )}

      <h2>{t('d.about')}</h2>
      <p className="desc" lang={p.translated ? undefined : 'ja'}>
        <Gloss text={p.description} />
      </p>

      {p.menu?.length > 0 && (
        <Section tone="price" title={t('d.menuTable')}>
          <table className="menu-table">
            <thead>
              <tr>
                <th>{t('d.menuItem')}</th>
                <th>{t('d.menuAmount')}</th>
                <th className="num">{t('d.menuPrice')}</th>
              </tr>
            </thead>
            <tbody>
              {p.menu.map((m, i) => (
                <tr key={i}>
                  <td>
                    <b>
                      <Gloss text={m.name} />
                    </b>
                    {p.translated && m.nameJa !== m.name && (
                      <div className="small muted" lang="ja">
                        {m.nameJa}
                      </div>
                    )}
                    {m.note && (
                      <div className="small muted">
                        <Gloss text={m.note} />
                      </div>
                    )}
                  </td>
                  <td className="small">{m.amount || '—'}</td>
                  <td className="num">{m.price != null ? <Price yen={m.price} /> : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {(p.popular || p.ownerPick || p.kodawari) && (
        <Section tone="owner" title={t('d.kodawari')}>
          {p.kodawari && (
            <>
              {p.kodawariPhoto && <img src={p.kodawariPhoto} alt="" loading="lazy" style={{ width: '100%', borderRadius: 10, marginBottom: 8 }} />}
              <p className="desc">
                <Gloss text={p.kodawari} />
              </p>
            </>
          )}
          <div style={{ display: 'grid', gap: 14 }}>
            {[
              ['d.popular', p.popular],
              ['d.ownerPick', p.ownerPick],
            ]
              .filter(([, item]) => item)
              .map(([k, item]) => (
                <div className="feature" key={k}>
                  {item.photo && <img src={item.photo} alt="" loading="lazy" />}
                  <div>
                    <div className="feature-label">{t(k)}</div>
                    <b>{item.name}</b>
                    {item.price != null && <div className="small">{formatYen(item.price, lang)}</div>}
                    {item.note && (
                      <div className="small muted">
                        <Gloss text={item.note} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </Section>
      )}

      <Section title={t('d.sectionInfo')}>
        <Facilities place={p} />
        <dl className="info-list" style={{ marginTop: 10 }}>
          {p.durationMin ? (
            <>
              <dt>{t('d.duration')}</dt>
              <dd>{duration(p.durationMin, lang)}</dd>
            </>
          ) : null}
          {p.category === 'experience' && p.minPeople ? (
            <>
              <dt>{t('d.minGroup')}</dt>
              <dd>{t('d.minGroupN', { n: p.minPeople })}</dd>
            </>
          ) : null}
          {p.category === 'experience' && p.belongings ? (
            <>
              <dt>{t('d.bring')}</dt>
              <dd>
                <Gloss text={p.belongings} />
              </dd>
            </>
          ) : null}
          {p.category === 'restaurant' && p.menuStyle ? (
            <>
              <dt>{t('d.menu')}</dt>
              <dd>{label('menuStyle', p.menuStyle, lang)}</dd>
            </>
          ) : null}
          {p.category === 'restaurant' && p.dietSupport?.length ? (
            <>
              <dt>{t('d.diet')}</dt>
              <dd>{p.dietSupport.map((d) => label('dietSupport', d, lang)).join(', ')}</dd>
            </>
          ) : null}
          <dt>{t('d.station')}</dt>
          <dd>
            {p.station} · {p.stationKm} km
          </dd>
          <dt>{t('d.address')}</dt>
          <dd>
            {p.address}
            {p.translated && p.addressJa !== p.address && (
              <div className="small muted" lang="ja">
                {p.addressJa}
              </div>
            )}
          </dd>
          <dt>{t('d.booking')}</dt>
          <dd>
            {t(`d.lead${p.leadDays ?? 1}`)}
            {closed && <div className="small muted">{t('d.closedOn', { days: closed })}</div>}
          </dd>
          {p.link && (
            <>
              <dt>{t('d.website')}</dt>
              <dd>
                <a href={p.link} target="_blank" rel="noopener noreferrer nofollow">
                  {new URL(p.link).hostname} ↗
                </a>
                <div className="small muted">{t('d.external')}</div>
              </dd>
            </>
          )}
        </dl>
      </Section>

      {p.lat != null && (
        <Section title={t('d.location')}>
          <PlaceMap lat={p.lat} lng={p.lng} title={p.name} />
          <a className="btn block" style={{ marginTop: 10 }} href={googleMapsUrl(p)} target="_blank" rel="noopener noreferrer">
            {t('d.googleMaps')} ↗
          </a>
        </Section>
      )}

      <ReviewsSection placeId={p.id} />

      <p className="small" style={{ marginTop: 12 }}>
        <button className="link muted" onClick={() => setReporting(true)}>
          {t('d.report')}
        </button>
      </p>
        </div>
        {/* まだ巻いてある部分。ひらくにつれて下へ転がる */}
        <span className="emaki-roll" aria-hidden="true" />
      </div>
      </div>

      <div className="sticky-actions" style={{ bottom: 'env(safe-area-inset-bottom)' }}>
        <Link to={`/p/${p.id}/chat`} className="btn">
          {t('d.ask')}
        </Link>
        {p.bookable ? (
          <Link to={`/p/${p.id}/book`} className="btn primary">
            {t('d.book')}
          </Link>
        ) : (
          <span className="btn" aria-disabled="true" style={{ opacity: 0.6 }}>
            {t('d.askToBook')}
          </span>
        )}
      </div>
      <ReportSheet open={reporting} onClose={() => setReporting(false)} placeId={p.id} />
    </>
  );
}

// Google マップで開く（スマホではアプリがあればアプリで開く）。登録された位置（緯度経度）で開く
export const googleMapsUrl = (p) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${p.lat},${p.lng}`)}`;

const MARK = { o: '〇', limited: '△', x: '✕', none: 'ー' }; // ー ＝ 日程がまだ決まっていない
const DAYS = 14;

// 空き状況：今日から2週間の〇△✕。日を押すと、その日の時間枠（何時から何時・残り何名）と「この時間で予約」
function Schedule({ place }) {
  const { t, lang } = useI18n();
  const people = lastSearch().people ?? 2;
  const { data, error, reload } = useLoad(() => api.availability(place.id, jstDate(), DAYS), [place.id]);
  const days = data?.days ?? [];
  const [chosen, setChosen] = useState(null);
  const day = days.find((d) => d.date === chosen) ?? null;

  const book = (slot) => {
    // 予約の画面に、選んだ日・時間・人数を入れておく
    saveSearch({ ...lastSearch(), date: day.date, people });
    store.set(`jimoto-book:${place.id}`, { ...store.get(`jimoto-book:${place.id}`, {}), date: day.date, time: slot.time, partySize: Math.min(people, slot.left) });
    navigate(`/p/${place.id}/book`);
  };

  return (
    <>
      <ErrorNote error={error} onRetry={reload} />
      {!data && !error && <Spinner />}
      <p className="small muted" style={{ marginTop: 0 }}>
        {t('d.scheduleNote')} {t('res.legend')}
      </p>
      <div className="sched" role="list">
        {days.map((d) => {
          const mark = dayMark(d, people);
          const wd = WEEKDAYS[lang][new Date(`${d.date}T00:00:00Z`).getUTCDay()];
          return (
            <button
              key={d.date}
              type="button"
              role="listitem"
              className={`sched-day ${mark}${chosen === d.date ? ' on' : ''}`}
              disabled={mark === 'x' || mark === 'none'}
              aria-pressed={chosen === d.date}
              aria-label={`${d.date} ${MARK[mark]}`}
              onClick={() => setChosen(d.date)}
            >
              {Number(d.date.slice(8))} {wd}
              <b>{MARK[mark]}</b>
            </button>
          );
        })}
      </div>
      {day && (
        <div className="sched-slots">
          {day.slots.filter((s) => s.left > 0).length === 0 && <p className="small muted">{t('d.noSlots')}</p>}
          {day.slots
            .filter((s) => s.left > 0)
            .map((s) => (
              <div className="sched-slot" key={s.time}>
                <span>
                  <b>{slotLabel(s)}</b> <span className="small muted">{t('b.left', { n: s.left })}</span>
                </span>
                <button type="button" className="btn primary" onClick={() => book(s)}>
                  {t('d.bookThis')}
                </button>
              </div>
            ))}
        </div>
      )}
    </>
  );
}

function ReportSheet({ open, onClose, placeId }) {
  const { t, lang } = useI18n();
  const [reason, setReason] = useState(null);
  const [note, setNote] = useState('');
  const [state, setState] = useState({ busy: false, done: false, error: null });
  const submit = async () => {
    setState({ busy: true, done: false, error: null });
    try {
      await api.report({ placeId, reason, note });
      setState({ busy: false, done: true, error: null });
    } catch (error) {
      setState({ busy: false, done: false, error });
    }
  };
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('rep.title')}
      closeLabel={t('close')}
      footer={
        !state.done && (
          <button className="btn primary block" disabled={!reason || state.busy} onClick={submit}>
            {t('rep.send')}
          </button>
        )
      }
    >
      {state.done ? (
        <p className="success">{t('rep.thanks')}</p>
      ) : (
        <>
          <p className="muted">{t('rep.intro')}</p>
          <Chips multi={false} options={options('report', REPORT_REASONS, lang)} value={reason} onChange={setReason} label={t('rep.reason')} />
          <label className="field" style={{ marginTop: 12 }}>
            <span className="field-label">{t('rep.details')}</span>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
          </label>
          <ErrorNote error={state.error} />
        </>
      )}
    </Sheet>
  );
}
