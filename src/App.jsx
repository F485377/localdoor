import { Suspense, lazy, useEffect, useState } from 'react';
import { api, isDemo } from './api.js';
import { useI18n } from './i18n/index.jsx';
import { citiesOf } from './format.js';
import { useProfile } from './profile.jsx';
import { EMPTY_FILTERS, FilterBar, FilterSheet } from './components/Filters.jsx';
import MapView from './components/MapView.jsx';
import MyPage from './components/MyPage.jsx';
import MyReservations from './components/MyReservations.jsx';
import PlaceDetail from './components/PlaceDetail.jsx';
import PlaceList from './components/PlaceList.jsx';

// 3Dキャラクター（three.js）は大きいので、会話画面を開くときだけ読み込む
const Onboarding = lazy(() => import('./components/Onboarding.jsx'));
// 画面の隅にいる、旅のおとものドキちゃん（three.js を使うので、あとから読み込む）
const Buddy = lazy(() => import('./components/Buddy.jsx'));

const filtersFromProfile = (profile) => ({
  ...EMPTY_FILTERS,
  cities: profile?.destination ? [profile.destination] : [],
  features: profile?.diet ?? [],
});

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        d="M12 21s-7.5-4.6-9.6-9.3C.9 8.2 3 4.5 6.6 4.5c2.1 0 3.6 1.2 5.4 3.1 1.8-1.9 3.3-3.1 5.4-3.1 3.6 0 5.7 3.7 4.2 7.2C19.5 16.4 12 21 12 21z"
        fill="var(--pink)"
      />
    </svg>
  );
}

export default function App() {
  const { t, lang, setLang, languages } = useI18n();
  const { profile } = useProfile();
  const [onboarding, setOnboarding] = useState(!profile);
  const [tab, setTab] = useState('explore');
  const [filters, setFilters] = useState(() => filtersFromProfile(profile));
  const [sheetOpen, setSheetOpen] = useState(false);
  const [places, setPlaces] = useState([]);
  const [cities, setCities] = useState([]);
  const [allPlaces, setAllPlaces] = useState([]);
  const [status, setStatus] = useState('loading');
  const [selectedId, setSelectedId] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    api
      .listPlaces({})
      .then((all) => {
        setAllPlaces(all);
        setCities(citiesOf(all));
      })
      .catch(() => setCities([]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    const timer = setTimeout(() => {
      api
        .listPlaces(filters)
        .then((data) => {
          if (cancelled) return;
          setPlaces(data);
          setStatus('ready');
        })
        .catch(() => !cancelled && setStatus('error'));
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [filters, reloadKey]);

  // 価格帯の記号は「選んでいる国」の通貨にする：フィルターの都市（通貨がそろっていれば）→ 行き先 → $
  const currencyOf = (name) => cities.find((c) => c.name === name)?.currency;
  const filterCurrencies = [...new Set(filters.cities.map(currencyOf).filter(Boolean))];
  const priceCurrency =
    (filterCurrencies.length === 1 && filterCurrencies[0]) || currencyOf(profile?.destination) || 'USD';

  // 価格帯（1〜4）ごとの、その国のお店の実際の値段の幅。フィルターで「だいたいいくら」を出すのに使う
  const levelRanges = {};
  for (const p of allPlaces) {
    if (p.currency !== priceCurrency || !p.priceLevel || p.priceMin == null || p.priceMax == null) continue;
    const r = (levelRanges[p.priceLevel] ??= [p.priceMin, p.priceMax]);
    r[0] = Math.min(r[0], p.priceMin);
    r[1] = Math.max(r[1], p.priceMax);
  }

  if (onboarding) {
    return (
      <Suspense fallback={<div className="vn-page" />}>
        <Onboarding
          onDone={(next) => {
            setOnboarding(false);
            setFilters(filtersFromProfile(next));
            setSelectedId(null);
            setTab('explore');
          }}
        />
      </Suspense>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <span className="logo">Haisai</span>
        <nav className="tabs">
          <button className={tab === 'explore' ? 'active' : ''} onClick={() => setTab('explore')}>
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M16 16l4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            {t('explore')}
          </button>
          <button className={tab === 'reservations' ? 'active' : ''} onClick={() => setTab('reservations')}>
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <rect x="4" y="5" width="16" height="15" rx="2.5" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M4 10h16M9 3v4M15 3v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            {t('myReservations')}
          </button>
          <button className={tab === 'profile' ? 'active' : ''} onClick={() => setTab('profile')}>
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <circle cx="12" cy="8.5" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
              <path
                d="M4.5 20c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            {t('my.title')}
          </button>
        </nav>
        <select id="lang" className="lang" value={lang} onChange={(e) => setLang(e.target.value)} aria-label="Language">
          {languages.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>
        <button className="profile-button" onClick={() => setTab('profile')} title={t('my.title')}>
          <HeartIcon />
          <span>{profile?.name}</span>
        </button>
      </header>
      {isDemo && <div className="demo-banner">{t('demoBanner')}</div>}
      <Suspense fallback={null}>
        <Buddy tab={tab} place={tab === 'explore' ? places.find((p) => p.id === selectedId) : null} />
      </Suspense>

      {tab === 'explore' ? (
        <main className="explore">
          <section className="sidebar">
            {selectedId ? (
              <PlaceDetail
                id={selectedId}
                onBack={() => setSelectedId(null)}
                onChanged={() => setReloadKey((k) => k + 1)}
              />
            ) : (
              <>
                <FilterBar
                  filters={filters}
                  onChange={setFilters}
                  onOpen={() => setSheetOpen(true)}
                  cities={cities}
                  priceCurrency={priceCurrency}
                />
                <PlaceList places={places} status={status} onSelect={setSelectedId} />
              </>
            )}
          </section>
          <section className="map">
            <MapView places={places} selectedId={selectedId} onSelect={setSelectedId} />
          </section>
          <FilterSheet
            open={sheetOpen}
            filters={filters}
            onChange={setFilters}
            onClose={() => setSheetOpen(false)}
            cities={cities}
            priceCurrency={priceCurrency}
            levelRanges={levelRanges}
            resultCount={places.length}
          />
        </main>
      ) : tab === 'profile' ? (
        <main className="page">
          <MyPage
            onEditProfile={() => setOnboarding(true)}
            onOpenPlace={(id) => {
              setSelectedId(id);
              setTab('explore');
            }}
            onSearch={(q) => {
              setFilters((f) => ({ ...f, q }));
              setSelectedId(null);
              setTab('explore');
            }}
          />
        </main>
      ) : (
        <main className="page">
          <MyReservations />
        </main>
      )}
    </div>
  );
}
