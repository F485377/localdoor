// 全国の市区町村（サーバー用）。id は全国地方公共団体コードの上5桁
import cities from './data/cities.json' with { type: 'json' };

const byId = new Map(cities.map((c) => [c.id, c]));
export const cityOf = (id) => byId.get(id);
export const citiesIn = (pref) => cities.filter((c) => c.pref === pref);
export { cities };
