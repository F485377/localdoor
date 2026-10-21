// 全国の市区町村の一覧（約1,700件）。大きいので、地図から選ぶときに一度だけ読む（public/data/cities.json）
let loading = null;
export function loadCities() {
  loading ??= fetch('/data/cities.json')
    .then((r) => {
      if (!r.ok) throw new Error('cities');
      return r.json();
    })
    .catch((err) => {
      loading = null;
      throw err;
    });
  return loading;
}

let mapLoading = null;
export function loadJapanMap() {
  mapLoading ??= fetch('/data/japan-map.json')
    .then((r) => {
      if (!r.ok) throw new Error('map');
      return r.json();
    })
    .catch((err) => {
      mapLoading = null;
      throw err;
    });
  return mapLoading;
}
