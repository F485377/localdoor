// 地方・都道府県（画面とサーバーの両方で使う。小さいので画面にも含める）。
// 市区町村の一覧は大きいので、サーバーは lib/cities.js、画面は /data/cities.json を必要なときに読む。
// データは scripts/build_japan.py で作る（総務省の全国地方公共団体コードなど）
import data from './data/prefs.json' with { type: 'json' };

export const REGIONS = data.regions;
export const PREFS = data.prefs;
export const PREF_CODES = PREFS.map((p) => p.code);
export const prefOf = (code) => PREFS.find((p) => p.code === code);
export const regionOf = (id) => REGIONS.find((r) => r.id === id);
