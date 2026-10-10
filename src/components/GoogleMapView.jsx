import { APIProvider, AdvancedMarker, InfoWindow, Map, Pin, useMap } from '@vis.gl/react-google-maps';
import { useEffect, useState } from 'react';
import { formatPriceRange, placeNames } from '../format.js';
import { DualPrice } from '../currency.jsx';
import { useI18n } from '../i18n/index.jsx';

// Google マップ版の地図。VITE_GOOGLE_MAPS_API_KEY が設定されているときだけ使われる。
// 設定方法は docs/google-maps.md
const MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID';

function FitAll({ places, active }) {
  const map = useMap();
  const key = places.map((p) => p.id).join();
  useEffect(() => {
    if (!map || active || places.length === 0) return;
    const bounds = new window.google.maps.LatLngBounds();
    places.forEach((p) => bounds.extend({ lat: p.lat, lng: p.lng }));
    map.fitBounds(bounds, 60);
    if (places.length === 1) map.setZoom(15);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key, active]);
  return null;
}

function FlyTo({ place }) {
  const map = useMap();
  useEffect(() => {
    if (!map || !place) return;
    map.panTo({ lat: place.lat, lng: place.lng });
    map.setZoom(16);
  }, [map, place]);
  return null;
}

export default function GoogleMapView({ apiKey, places, selectedId, onSelect }) {
  const { t, lang } = useI18n();
  const [popupId, setPopupId] = useState(null);
  const selected = places.find((p) => p.id === selectedId);
  const popup = places.find((p) => p.id === popupId);

  return (
    <APIProvider apiKey={apiKey} language={lang}>
      <Map
        mapId={MAP_ID}
        defaultCenter={{ lat: 20, lng: 10 }}
        defaultZoom={2}
        gestureHandling="greedy"
        className="leaflet-root"
      >
        {places.map((p) => {
          const active = p.id === selectedId;
          return (
            <AdvancedMarker
              key={p.id}
              position={{ lat: p.lat, lng: p.lng }}
              title={p.name}
              onClick={() => {
                onSelect(p.id);
                setPopupId(p.id);
              }}
            >
              <Pin
                background={active ? '#ff4f9a' : '#ff9142'}
                borderColor="#ffffff"
                glyphColor="#ffffff"
                scale={active ? 1.25 : 1}
              />
            </AdvancedMarker>
          );
        })}
        {popup && (
          <InfoWindow position={{ lat: popup.lat, lng: popup.lng }} onCloseClick={() => setPopupId(null)}>
            <strong>{placeNames(popup, lang).primary}</strong>
            <br />
            {t(`category.${popup.category}`)}
            {formatPriceRange(popup, lang) && (
              <DualPrice min={popup.priceMin} max={popup.priceMax} currency={popup.currency} />
            )}
          </InfoWindow>
        )}
        <FitAll places={places} active={Boolean(selected)} />
        <FlyTo place={selected} />
      </Map>
    </APIProvider>
  );
}
