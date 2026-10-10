// 検索の履歴。この端末に、新しい順で最大10件まで残す
const KEY = 'haisai-search-history';
const MAX = 10;

export function loadHistory() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function save(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // 保存できなくても検索はできる
  }
  return list;
}

export function addHistory(query) {
  const q = query.trim();
  if (q.length < 2) return loadHistory();
  return save([q, ...loadHistory().filter((h) => h.toLowerCase() !== q.toLowerCase())].slice(0, MAX));
}

export const removeHistory = (query) => save(loadHistory().filter((h) => h !== query));
export const clearHistory = () => save([]);
