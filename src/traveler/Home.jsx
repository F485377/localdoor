import { useState } from 'react';
import { FilterIcon } from '../icons.jsx';
import FilterScreen, { FILTER_PARAMS, filterCount } from './Filters.jsx';
import { MAX_PARTY, addDays, jstDate } from '../../lib/domain.js';
import JapanPicker from '../components/JapanPicker.jsx';
import { useI18n } from '../i18n/index.jsx';
import { navigate } from '../router.jsx';
import { lastSearch, saveSearch } from './bits.jsx';

// 最初の検索：キーワード・絞り込み・行先（日本列島のイラストから市区町村まで、または現在地）・日時・人数。
// キーワードと絞り込みは、ここで選んでもそのまま検索結果に持っていく
export default function Home() {
  const { t } = useI18n();
  const today = jstDate();
  const last = lastSearch();
  const [where, setWhere] = useState({ pref: last.pref ?? null, city: last.city ?? null });
  const [date, setDate] = useState(last.date && last.date >= today ? last.date : today);
  const [people, setPeople] = useState(last.people ?? 2);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState(false);
  const [kw, setKw] = useState(last.q ?? '');
  const [filters, setFilters] = useState(() => Object.fromEntries(FILTER_PARAMS.filter((k) => last.filters?.[k]).map((k) => [k, last.filters[k]])));
  const [filtering, setFiltering] = useState(false);
  const count = filterCount(filters);

  const go = (where, view) => {
    const keyword = kw.trim();
    saveSearch({ pref: where.pref ?? null, city: where.city ?? null, date, people, q: keyword, filters });
    const q = new URLSearchParams({
      date,
      people: String(people),
      ...(where.pref ? { pref: where.pref } : {}),
      ...(where.city ? { city: where.city } : {}),
      ...(where.near ? { near: where.near } : {}),
      ...(keyword ? { q: keyword } : {}),
      ...filters,
      ...(view ? { view } : {}),
    });
    navigate(`/search?${q}`);
  };

  const nearMe = (view) => {
    if (!navigator.geolocation) return setGeoError(true);
    setLocating(true);
    setGeoError(false);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        go({ near: `${pos.coords.latitude.toFixed(4)},${pos.coords.longitude.toFixed(4)}` }, view);
      },
      () => {
        setLocating(false);
        setGeoError(true);
      },
      { timeout: 10000, maximumAge: 300000 },
    );
  };

  return (
    <div className="search-form">
      <h1>{t('home.title')}</h1>

      {/* キーワードと絞り込み（地図で行先を選ぶ前でも使える） */}
      <form
        className="kw-form"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          go(where);
        }}
      >
        <input type="search" value={kw} maxLength={60} onChange={(e) => setKw(e.target.value)} placeholder={t('kw.placeholder')} aria-label={t('kw.placeholder')} enterKeyHint="search" />
        <button type="button" className={count ? 'btn filter-btn on' : 'btn filter-btn'} onClick={() => setFiltering(true)} aria-haspopup="dialog">
          <FilterIcon /> {t('f.filters')}
          {count > 0 && <span className="count">{count}</span>}
        </button>
      </form>
      <FilterScreen
        open={filtering}
        q={filters}
        onClose={() => setFiltering(false)}
        onApply={(patch) => {
          setFilters(Object.fromEntries(Object.entries(patch).filter(([, v]) => v != null && v !== '')));
          setFiltering(false);
        }}
      />

      <h2 className="section-title">{t('home.where')}</h2>
      <JapanPicker value={where} onChange={setWhere} allowAll />
      <button type="button" className="btn" style={{ marginTop: 10 }} onClick={() => nearMe()} disabled={locating}>
        {locating ? t('home.locating') : t('home.near')}
      </button>
      {geoError && <p className="notice small">{t('home.nearFail')}</p>}

      <div className="row when-who" style={{ marginTop: 8 }}>
        <label className="field">
          <span className="section-title" style={{ display: 'block', margin: '20px 0 10px' }}>
            {t('home.when')}
          </span>
          <input type="date" className="input" min={today} max={addDays(today, 90)} value={date} onChange={(e) => setDate(e.target.value || today)} />
        </label>
        <div className="field">
          <span className="section-title" style={{ display: 'block', margin: '20px 0 10px' }}>
            {t('home.who')}
          </span>
          <div className="stepper">
            <button type="button" className="btn" aria-label="−" disabled={people <= 1} onClick={() => setPeople(people - 1)}>
              −
            </button>
            <b aria-live="polite">{people}</b>
            <button type="button" className="btn" aria-label="+" disabled={people >= MAX_PARTY} onClick={() => setPeople(people + 1)}>
              +
            </button>
          </div>
        </div>
      </div>

      <button type="button" className="btn primary block" style={{ marginTop: 16 }} onClick={() => go(where)}>
        {t('home.search')}
      </button>
      <button type="button" className="btn block" style={{ marginTop: 8 }} onClick={() => go(where, 'map')}>
        {t('home.map')}
      </button>
    </div>
  );
}
