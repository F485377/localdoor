import L from 'leaflet';
import { useEffect, useRef } from 'react';

// 地図（Leaflet ＋ OpenStreetMap。無料で使える。画面に出典の表示が必要）
const TILES = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>';
const pinIcon = L.divIcon({ className: '', html: '<div class="pin"></div>', iconSize: [28, 28], iconAnchor: [14, 28] });
// 店名などは利用者が入力した文字なので、地図に出すときは HTML として解釈させない
const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
// カテゴリで色を分けたピン（体験・飲食店）
const catIcon = (category) =>
  L.divIcon({ className: '', html: `<div class="pin cat-${category === 'experience' ? 'experience' : 'restaurant'}"></div>`, iconSize: [28, 28], iconAnchor: [14, 28], tooltipAnchor: [0, -30] });
const LABEL_ZOOM = 13; // ここまで近づいたら、ピンの上に店名を出す

function useMap(ref, center, zoom) {
  const map = useRef(null);
  useEffect(() => {
    const m = L.map(ref.current, { zoomControl: true, attributionControl: true }).setView([center.lat, center.lng], zoom);
    L.tileLayer(TILES, { attribution: ATTRIBUTION, maxZoom: 19 }).addTo(m);
    map.current = m;
    return () => m.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return map;
}

// 店のピンを並べる。onMove は地図を動かしたとき（範囲 [南, 西, 北, 東]）、onSelect はピンを押したとき。
// labels を付けると、ピンをカテゴリの色で分け、近づくと店名も出す
export function PlacesMap({ places, center, zoom = 13, fit = true, onSelect, onMove, me, labels = false, children }) {
  const ref = useRef(null);
  const map = useMap(ref, center, zoom);
  const layer = useRef(null);

  useEffect(() => {
    const m = map.current;
    layer.current?.remove();
    const group = L.layerGroup().addTo(m);
    const pts = [];
    for (const p of places) {
      if (p.lat == null || p.lng == null) continue;
      const marker = L.marker([p.lat, p.lng], { icon: labels ? catIcon(p.category) : pinIcon, title: p.name, keyboard: true }).addTo(group).on('click', () => onSelect?.(p));
      if (labels) marker.bindTooltip(escapeHtml(p.name), { permanent: true, direction: 'top', className: 'pin-label' });
      pts.push([p.lat, p.lng]);
    }
    if (me) L.circleMarker([me.lat, me.lng], { radius: 8, color: '#1f5fd1', fillOpacity: 0.8 }).addTo(group);
    layer.current = group;
    // 検索結果のお店がすべて入るように寄せる。地図の大きさが決まってから寄せる（一覧から切り替えた直後は大きさが 0 のことがある）
    let timer;
    if (fit && pts.length) {
      const fitNow = () => {
        m.invalidateSize();
        m.fitBounds(pts, { padding: [48, 48], maxZoom: 15 });
      };
      fitNow();
      timer = setTimeout(fitNow, 120);
    }
    // 画面を離れたら、遅れて寄せる処理を止める（消えた地図を動かそうとしてエラーになるので）
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [places]);

  // 近づいたときだけ店名を出す（遠いと重なって読めないので）
  useEffect(() => {
    const m = map.current;
    const update = () => m.getContainer().classList.toggle('show-labels', m.getZoom() >= LABEL_ZOOM);
    update();
    m.on('zoomend', update);
    return () => m.off('zoomend', update);
  }, [map]);

  useEffect(() => {
    const m = map.current;
    if (!onMove) return undefined;
    const handler = () => {
      const b = m.getBounds();
      onMove([b.getSouth(), b.getWest(), b.getNorth(), b.getEast()].map((x) => Math.round(x * 10000) / 10000));
    };
    m.on('moveend', handler);
    return () => m.off('moveend', handler);
  }, [map, onMove]);

  return (
    <div className="map">
      <div ref={ref} style={{ height: '100%' }} />
      {children}
    </div>
  );
}

// 1つの場所を見せる（詳細ページ）
export function PlaceMap({ lat, lng, title }) {
  const ref = useRef(null);
  const map = useMap(ref, { lat, lng }, 16);
  useEffect(() => {
    const marker = L.marker([lat, lng], { icon: pinIcon, title }).addTo(map.current);
    return () => marker.remove();
  }, [map, lat, lng, title]);
  return <div className="map-small" ref={ref} />;
}

// 事業者がピンで位置を合わせる。地図をタップするか、ピンを動かす
export function PinPicker({ value, center, onChange }) {
  const ref = useRef(null);
  const start = value?.lat != null ? value : center;
  const map = useMap(ref, start, value?.lat != null ? 17 : 14);
  const marker = useRef(null);

  useEffect(() => {
    const m = map.current;
    const place = (latlng) => {
      if (!marker.current) {
        marker.current = L.marker(latlng, { icon: pinIcon, draggable: true }).addTo(m);
        marker.current.on('dragend', () => {
          const p = marker.current.getLatLng();
          onChange({ lat: round(p.lat), lng: round(p.lng) });
        });
      } else marker.current.setLatLng(latlng);
    };
    if (value?.lat != null) place([value.lat, value.lng]);
    const onClick = (e) => {
      place(e.latlng);
      onChange({ lat: round(e.latlng.lat), lng: round(e.latlng.lng) });
    };
    m.on('click', onClick);
    return () => m.off('click', onClick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  // エリアを選び直したら、その中心に移す（まだピンがないとき）
  useEffect(() => {
    if (value?.lat == null) map.current.setView([center.lat, center.lng], 14);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center.lat, center.lng]);

  return <div className="map-small" style={{ height: 280 }} ref={ref} />;
}

const round = (x) => Math.round(x * 1e6) / 1e6;
