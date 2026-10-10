import L from 'leaflet';
import { Component, Suspense, lazy, useEffect, useState } from 'react';
import { GeoJSON, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import { isDemo } from '../api.js';
import { formatPriceRange, placeNames } from '../format.js';
import { DualPrice } from '../currency.jsx';
import { useI18n } from '../i18n/index.jsx';
import { placeCity } from '../localize.js';

// .env.local に VITE_GOOGLE_MAPS_API_KEY があれば Google マップを使う（docs/google-maps.md）
const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const GoogleMapView = lazy(() => import('./GoogleMapView.jsx'));

// バンドラー経由だとLeafletのデフォルト画像パスが壊れるので、CSSだけのピンを使う
const pin = (active) =>
  L.divIcon({
    className: '',
    html: `<div class="pin${active ? ' pin-active' : ''}"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24],
  });

const label = (text) => L.divIcon({ className: '', html: `<span class="map-label">${text}</span>`, iconSize: null });

// 一覧が変わったら、すべてのお店が入るように表示範囲を合わせる
function FitAll({ places, active }) {
  const map = useMap();
  const key = places.map((p) => p.id).join();
  useEffect(() => {
    if (active || places.length === 0) return;
    map.fitBounds(
      places.map((p) => [p.lat, p.lng]),
      { padding: [40, 40], maxZoom: 15 },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, active, map]);
  return null;
}

function FlyTo({ place }) {
  const map = useMap();
  useEffect(() => {
    if (place) map.flyTo([place.lat, place.lng], 16, { duration: 0.6 });
  }, [place, map]);
  return null;
}

// デモ版は外部の地図画像を読めないので、同梱した国境線データ（Natural Earth）を描く
function DemoBaseMap({ places }) {
  const { lang } = useI18n();
  const [world, setWorld] = useState(null);
  useEffect(() => {
    Promise.all([import('world-atlas/countries-110m.json'), import('topojson-client')]).then(([atlas, topo]) => {
      const data = atlas.default ?? atlas;
      setWorld(topo.feature(data, data.objects.countries));
    });
  }, []);

  // 都市名のラベル（お店のある都市の中心）
  const cities = Object.values(
    places.reduce((acc, p) => {
      (acc[p.city] ??= { name: p.city, label: placeCity(p, lang), lat: 0, lng: 0, n: 0 }).n++;
      acc[p.city].lat += p.lat;
      acc[p.city].lng += p.lng;
      return acc;
    }, {}),
  );

  return (
    <>
      {world && <GeoJSON data={world} style={{ className: 'land' }} interactive={false} />}
      {cities.map((c) => (
        <Marker key={c.name} position={[c.lat / c.n + 0.004, c.lng / c.n]} icon={label(c.label)} interactive={false} />
      ))}
    </>
  );
}

function LeafletMapView({ places, selectedId, onSelect }) {
  const { t, lang } = useI18n();
  const selected = places.find((p) => p.id === selectedId);

  return (
    <MapContainer
      center={[20, 10]}
      zoom={2}
      worldCopyJump
      className={isDemo ? 'leaflet-root demo-map' : 'leaflet-root'}
    >
      {isDemo ? (
        <DemoBaseMap places={places} />
      ) : (
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
      )}
      {places.map((p) => (
        <Marker
          key={p.id}
          position={[p.lat, p.lng]}
          icon={pin(p.id === selectedId)}
          eventHandlers={{ click: () => onSelect(p.id) }}
        >
          <Popup>
            <strong>{placeNames(p, lang).primary}</strong>
            <br />
            {t(`category.${p.category}`)}
            {formatPriceRange(p, lang) && <DualPrice min={p.priceMin} max={p.priceMax} currency={p.currency} />}
          </Popup>
        </Marker>
      ))}
      <FitAll places={places} active={Boolean(selected)} />
      <FlyTo place={selected} />
    </MapContainer>
  );
}

// Google マップが読み込めないとき（キーの制限・通信エラー・無料枠の上限など）に、
// アプリ全体を止めずに OpenStreetMap の地図へ切り替える
class GoogleMapFallback extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.warn('Google Maps failed, falling back to OpenStreetMap:', error?.message);
  }

  componentDidMount() {
    // キーの制限などで読み込めないとき、Google はエラーを投げずに gm_authFailure を呼ぶ（灰色のエラー画面になる）
    window.gm_authFailure = () => {
      console.warn('Google Maps key was rejected for this site, falling back to OpenStreetMap');
      this.setState({ failed: true });
    };
  }

  componentWillUnmount() {
    delete window.gm_authFailure;
  }

  render() {
    return this.state.failed ? <LeafletMapView {...this.props.mapProps} /> : this.props.children;
  }
}

export default function MapView(props) {
  if (GOOGLE_KEY && !isDemo) {
    return (
      <GoogleMapFallback mapProps={props}>
        <Suspense fallback={null}>
          <GoogleMapView apiKey={GOOGLE_KEY} {...props} />
        </Suspense>
      </GoogleMapFallback>
    );
  }
  return <LeafletMapView {...props} />;
}
