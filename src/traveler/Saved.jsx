import { useState } from 'react';
import { api } from '../api.js';
import { PlacesMap } from '../components/Maps.jsx';
import { useI18n } from '../i18n/index.jsx';
import { Link, navigate, usePath } from '../router.jsx';
import { ErrorNote, Spinner, useLoad } from '../ui.jsx';
import { PlaceCard } from './Results.jsx';
import { MapLegend, lastSearch } from './bits.jsx';

// 保存したお店。旅程の候補として見返して、予約に進める。
// 一覧と地図で見られる（?view=map）。地図では保存したお店がピンで出て、タップするとカードが出る
export default function Saved() {
  const { t, lang } = useI18n();
  const { params } = usePath();
  const view = params.get('view') === 'map' ? 'map' : 'list';
  const { data, error, loading, reload } = useLoad(() => api.saved(lang), [lang]);
  const [selected, setSelected] = useState(null);
  if (loading && !data) return <Spinner kind="cards" />;
  const places = data?.places ?? [];
  const date = lastSearch().date;

  return (
    <>
      <div className="status-line" style={{ marginBottom: 10 }}>
        <h1 style={{ margin: 0, flex: 1 }}>{t('save.title')}</h1>
        {places.length > 0 && (
          <div className="view-toggle" role="group">
            <button className={view === 'list' ? 'on' : ''} aria-pressed={view === 'list'} onClick={() => navigate('/saved', { replace: true })}>
              {t('res.list')}
            </button>
            <button className={view === 'map' ? 'on' : ''} aria-pressed={view === 'map'} onClick={() => navigate('/saved?view=map', { replace: true })}>
              {t('res.map')}
            </button>
          </div>
        )}
      </div>
      <ErrorNote error={error} onRetry={reload} />
      {data && !places.length && (
        <div className="empty">
          <p>{t('save.none')}</p>
          <Link to="/search" className="btn primary">
            {t('explore')}
          </Link>
        </div>
      )}
      {places.length > 0 && view === 'map' && (
        <>
          <PlacesMap places={places} center={{ lat: 36.2, lng: 138.3 }} zoom={5} onSelect={setSelected} labels>
            {selected && (
              <div className="map-card">
                <PlaceCard place={selected} date={date} compact />
              </div>
            )}
          </PlacesMap>
          <MapLegend />
          {places.some((p) => p.lat == null) && <p className="small muted">{t('res.noLocation')}</p>}
        </>
      )}
      {view === 'list' && (
        <div className="card-grid">
          {places.map((p) => (
            <PlaceCard key={p.id} place={p} date={date} />
          ))}
        </div>
      )}
    </>
  );
}
