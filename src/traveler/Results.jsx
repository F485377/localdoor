import { frontPhoto } from '../stockPhotos.js';
import { useCallback, useEffect, useState } from 'react';
import { jstDate } from '../../lib/domain.js';
import { prefOf } from '../../lib/japan.js';
import { api } from '../api.js';
import { useCity } from '../components/JapanPicker.jsx';
import { PlacesMap } from '../components/Maps.jsx';
import PlaceArt from '../components/PlaceArt.jsx';
import { RateLine, RateNote } from '../currency.jsx';
import { useI18n } from '../i18n/index.jsx';
import { artInput, cityName, label, placeWhere, prefName } from '../labels.js';
import { FilterIcon, SearchIcon } from '../icons.jsx';
import { Link, navigate, usePath } from '../router.jsx';
import { ErrorNote, Spinner, shortDate, useLoad } from '../ui.jsx';
import { Band, Facilities, LocalBar, MapLegend, Stars, WeekMarks, saveResults, yearsText } from './bits.jsx';
import { SaveButton } from './savedStore.jsx';
import FilterScreen, { FILTER_PARAMS, filterCount, filterName } from './Filters.jsx';

// 検索結果（一覧と地図）。条件はすべて URL に持つ（戻る・共有で同じ結果になる）
export default function Results() {
  const { params } = usePath();
  const { t, lang } = useI18n();
  const q = Object.fromEntries(params);
  const view = q.view === 'map' ? 'map' : 'list';
  const date = q.date ?? jstDate();
  const people = Number(q.people) || 2;
  const [filtering, setFiltering] = useState(false);
  const [bounds, setBounds] = useState(null);
  const [selected, setSelected] = useState(null);

  const query = { ...q, lang, date, people };
  delete query.view;
  // 一覧は20件ずつ。地図は全部のピンを出す
  if (view === 'map') query.page = 'all';
  const { data, error, loading, reload } = useLoad(() => api.places(query), [JSON.stringify(query)]);
  // メニューの「探す」で、この画面（同じ条件）に戻れるように覚えておく
  const here = `/search?${params}`;
  useEffect(() => saveResults(here), [here]);

  const update = (patch) => {
    const next = new URLSearchParams(params);
    // 条件を変えたら1ページ目から
    if (!('page' in patch)) next.delete('page');
    for (const [k, v] of Object.entries(patch)) (v == null || v === '' ? next.delete(k) : next.set(k, v));
    navigate(`/search?${next}`, { replace: true });
  };
  const onMove = useCallback((b) => setBounds(b), []);

  const near = q.near ? q.near.split(',').map(Number) : null;
  const city = useCity(q.city);
  const where = q.bounds ? t('res.mapArea') : near ? t('res.nearYou') : q.city ? cityName(city, lang) || '…' : q.pref ? prefName(q.pref, lang) : t('home.anyArea');
  const prefCenter = prefOf(q.pref);
  const center = near ? { lat: near[0], lng: near[1] } : city ?? (prefCenter ? { lat: prefCenter.lat, lng: prefCenter.lng } : { lat: 36.2, lng: 138.3 });
  const zoom = near ? 14 : q.city ? 12 : q.pref ? 9 : 5;
  const count = filterCount(q);
  const places = data?.places ?? [];

  return (
    <>
      <div className="search-summary">
        <span>
          {t('res.summary', { where, date: shortDate(date, lang), n: people })}
          <br />
          <RateLine />
        </span>
        <button className="icon-btn search-edit" onClick={() => navigate('/?edit=1')} aria-label={t('res.change')} title={t('res.change')}>
          <SearchIcon />
        </button>
      </div>


      <div className="status-line" style={{ marginBottom: 10 }}>
        <h1 style={{ margin: 0, flex: 1 }}>{t('res.title')}</h1>
        <div className="view-toggle" role="group">
          <button className={view === 'list' ? 'on' : ''} aria-pressed={view === 'list'} onClick={() => update({ view: null })}>
            {t('res.list')}
          </button>
          <button className={view === 'map' ? 'on' : ''} aria-pressed={view === 'map'} onClick={() => update({ view: 'map' })}>
            {t('res.map')}
          </button>
        </div>
      </div>

      <KeywordBar value={q.q ?? ''} onSearch={(kw) => update({ q: kw || null })} />

      {/* 絞り込みは1つのボタンにまとめる。押すと条件の一覧が出る */}
      <div className="filter-bar">
        <button type="button" className={count ? 'btn filter-btn on' : 'btn filter-btn'} onClick={() => setFiltering(true)} aria-haspopup="dialog">
          <FilterIcon /> {t('f.filters')}
          {count > 0 && <span className="count">{count}</span>}
        </button>
        {q.sort === 'rating' && <span className="small muted">{t('f.sortRating')}</span>}
        {count > 0 && (
          <button type="button" className="link small" onClick={() => update(Object.fromEntries(FILTER_PARAMS.filter((k) => k !== 'sort').map((k) => [k, null])))}>
            {t('res.clear')}
          </button>
        )}
      </div>

      <ErrorNote error={error} onRetry={reload} />
      {loading && !data && <Spinner kind="cards" />}

      {view === 'map' ? (
        <>
          <PlacesMap key={`${q.pref}-${q.city}-${q.near}`} places={places} center={center} zoom={zoom} fit={!bounds} onMove={onMove} onSelect={setSelected} labels me={near ? { lat: near[0], lng: near[1] } : null}>
            {bounds && (
              <div className="map-overlay">
                <button
                  className="btn primary"
                  onClick={() => {
                    update({ bounds: bounds.join(','), pref: null, city: null, near: null });
                    setBounds(null);
                  }}
                >
                  {t('res.thisArea')}
                </button>
              </div>
            )}
            {selected && (
              <div className="map-card">
                <PlaceCard place={selected} date={date} compact />
              </div>
            )}
          </PlacesMap>
          <MapLegend />
          {places.some((p) => p.lat == null) && <p className="small muted">{t('res.noLocation')}</p>}
        </>
      ) : (
        <>
          {data && !places.length && <NoResults q={q} city={city} suggestions={data.suggestions} onRemove={(k) => update({ [k]: null, ...(PARTNER[k] ? { [PARTNER[k]]: null } : {}), ...(k === 'pref' ? { city: null } : {}) })} />}
          {places.length > 0 && (
            <p className="small muted">
              {t('res.count', { n: data.total })}
              {data.pages > 1 && ` · ${t('res.page', { page: data.page, pages: data.pages })}`}
              <br />
              {t('res.legend')}
            </p>
          )}
          <div className="card-grid">
            {places.map((p) => (
              <PlaceCard key={p.id} place={p} date={date} />
            ))}
          </div>
          {data?.pages > 1 && <Pager page={data.page} pages={data.pages} onGo={(n) => (update({ page: n > 1 ? String(n) : null }), window.scrollTo(0, 0))} />}
          {places.length > 0 && <RateNote />}
        </>
      )}

      <FilterScreen
        open={filtering}
        q={q}
        onClose={() => setFiltering(false)}
        onApply={(patch) => {
          update(patch);
          setFiltering(false);
          window.scrollTo(0, 0);
        }}
      />
    </>
  );
}

// ページ送り：前へ・ページ番号（今のページの前後と最初・最後）・次へ
function Pager({ page, pages, onGo }) {
  const { t } = useI18n();
  const nums = [...new Set([1, page - 1, page, page + 1, pages])].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  return (
    <nav className="pager" aria-label={t('res.page', { page, pages })}>
      <button type="button" className="btn" disabled={page <= 1} onClick={() => onGo(page - 1)}>
        ← {t('res.prev')}
      </button>
      <span className="pager-nums">
        {nums.map((n, i) => (
          <span key={n}>
            {i > 0 && n - nums[i - 1] > 1 && <span className="muted">…</span>}
            <button type="button" className={n === page ? 'pager-num on' : 'pager-num'} aria-current={n === page ? 'page' : undefined} onClick={() => n !== page && onGo(n)}>
              {n}
            </button>
          </span>
        ))}
      </span>
      <button type="button" className="btn" disabled={page >= pages} onClick={() => onGo(page + 1)}>
        {t('res.next')} →
      </button>
    </nav>
  );
}

// キーワード検索（ラーメン・うどん・和菓子づくり など）
function KeywordBar({ value, onSearch }) {
  const { t } = useI18n();
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return (
    <div className="kw">
      <form
        className="kw-form"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          onSearch(text.trim());
        }}
      >
        <input type="search" value={text} maxLength={60} onChange={(e) => setText(e.target.value)} placeholder={t('kw.placeholder')} aria-label={t('kw.placeholder')} enterKeyHint="search" />
        <button className="btn primary">{t('kw.search')}</button>
      </form>
    </div>
  );
}

// 範囲の条件は、上と下をまとめて外す
const PARTNER = { bmin: 'bmax', lmin: 'lmax', ymin: 'ymax', tfrom: 'tto' };

function NoResults({ q, city, suggestions, onRemove }) {
  const { t, lang } = useI18n();
  const filtered = filterCount(q) > 0 || q.q || q.pref || q.city || q.bounds;
  if (!filtered) {
    return (
      <div className="empty">
        <p>
          <b>{t('res.empty')}</b>
        </p>
        <p>{t('res.emptyBody')}</p>
      </div>
    );
  }
  const nameOf = (key) => (key === 'city' ? cityName(city, lang) : key === 'pref' ? prefName(q.pref, lang) : key === 'q' ? `“${q.q}”` : filterName(key, q, t, lang));
  return (
    <div className="empty">
      <p>
        <b>{t('res.noMatch')}</b>
      </p>
      {suggestions?.length ? (
        <>
          <p>{t('res.tryRemove')}</p>
          <div className="chips" style={{ justifyContent: 'center' }}>
            {suggestions.map((s) => (
              <button key={s.remove} type="button" className="chip" onClick={() => onRemove(s.remove)}>
                {t('res.remove', { label: nameOf(s.remove), n: s.count })}
              </button>
            ))}
          </div>
        </>
      ) : (
        <p>{t('res.fewer')}</p>
      )}
    </div>
  );
}

// 一覧のカード：写真、値段帯、1週間の〇△✕、地元の割合、設備のマーク、特典
export function PlaceCard({ place: p, date, compact = false }) {
  const { t, lang } = useI18n();
  return (
    <Link to={`/p/${p.id}`} className="place-card v">
      {!compact && (
        <div className="place-card-photo">
          {p.photo ? <img src={p.photo} alt="" loading="lazy" /> : frontPhoto(p) ? <img src={frontPhoto(p)} alt="" loading="lazy" /> : <PlaceArt place={artInput(p)} />}
          {p.hasPerk && <span className="perk-flag">{t('f.perk')}</span>}
          {p.sample && (
            <span className="badge sample" style={{ position: 'absolute', bottom: 10, left: 10 }}>
              {t('sample')}
            </span>
          )}
          <SaveButton placeId={p.id} className="on-photo" />
        </div>
      )}
      <div className="place-card-body">
        <span className="eyebrow">
          {label('category', p.category, lang)} · {placeWhere(p, lang)}
          {p.km != null && ` · ${t('res.kmAway', { km: p.km.toFixed(1) })}`}
        </span>
        <h3>{p.name}</h3>
        {p.rating && (
          <div className="card-rating small">
            <Stars value={p.rating.average} /> <b>{p.rating.average.toFixed(1)}</b> <span className="muted">({p.rating.count})</span>
          </div>
        )}
        <Band band={p.priceBand} suffix={t('perPerson')} />
        {!p.translated && <div className="small muted">{t('res.japanese')}</div>}
        {!compact && (
          <>
            <WeekMarks week={p.week} chosen={date} />
            {p.dateMark === 'x' && <p className="small muted" style={{ margin: '4px 0 0' }}>{t('res.noneOnDate')}</p>}
            <LocalBar pct={p.localPct} compact />
            <div className="facts">
              {p.foundedYear && <span>{yearsText(p, t)}</span>}
              <span>
                {p.station} {p.stationKm} km
              </span>
            </div>
            <Facilities place={p} />
          </>
        )}
      </div>
    </Link>
  );
}
