// PlaceArt の確認用シート（一時ファイル）。主題ごとに1件ずつ + データにない主題の見本。
import { createRoot } from 'react-dom/client';
import { useEffect, useState } from 'react';
import PlaceArt, { artKinds, placeSubject } from '../src/components/PlaceArt.jsx?v=6';

const mk = (id, category, name, area = '', dishes = []) => ({ id, category, name, area, dishes: dishes.map((n) => ({ name: n })), i18n: { en: { name } } });
const EXTRA = [
  mk('x10', 'experience', '琉球 三線教室', '沖縄・那覇'), mk('x16', 'tour', '小樽運河と港めぐり', '北海道・小樽'),
  mk('x17', 'tour', '上高地 ハイキング', '長野'), mk('x6', 'restaurant', '天ぷら はなぶさ', '東京'), mk('x20', 'experience', 'ふしぎ工房 ものづくり体験', '岐阜'),
];
function Sheet() {
  const [places, setPlaces] = useState([]);
  useEffect(() => {
    fetch('/api/places').then((r) => r.json()).then((j) => {
      const seen = new Set();
      const sel = [];
      for (const p of j.results ?? []) {
        const s = placeSubject(p);
        const k = s.cat + ':' + s.main;
        if (!seen.has(k)) { seen.add(k); sel.push(p); }
      }
      setPlaces([...sel, ...EXTRA]);
    });
  }, []);
  return places.map((p) => (
    <div className="row" key={p.id}>
      <div className="lab"><b>{placeSubject(p).cat} / {placeSubject(p).main}</b><br />{p.name}<br />{p.area}</div>
      {artKinds(p).map((k) => <div className="cell" key={k}><PlaceArt place={p} kind={k} /></div>)}
    </div>
  ));
}
createRoot(document.getElementById('root')).render(<Sheet />);
