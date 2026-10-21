import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, setSide } from './api.js';
import { usePath } from './router.jsx';

// ログイン中のユーザーと、画面上の新着の数（未読バッジ）。
// 旅行者と事業者でログインを分けて持ち（Cookie も別）、ログアウトせずに両方の画面を行き来できる。
// 今どちらの画面か（/biz かどうか）で、使うログインを切り替える。
// 新着は、ログイン中は30秒ごとと、画面に戻ってきたときに取り直す（MVP はメール通知なし）
const SessionContext = createContext(null);
const EMPTY = { user: null, badges: { messages: 0, bookings: 0 }, loading: true };

export const sideOf = (pathname) => (pathname === '/biz' || pathname.startsWith('/biz/') ? 'business' : 'traveler');

export function SessionProvider({ children }) {
  const { pathname } = usePath();
  const side = sideOf(pathname);
  setSide(side); // この後の API の呼び出しは、この立場のログインを使う
  const [states, setStates] = useState({ traveler: EMPTY, business: EMPTY });
  const state = states[side];
  const put = useCallback((s, next) => setStates((all) => ({ ...all, [s]: typeof next === 'function' ? next(all[s]) : next })), []);

  const refresh = useCallback(async () => {
    const s = side;
    try {
      const d = await api.me(s);
      put(s, { user: d.user, badges: d.badges ?? { messages: 0, bookings: 0 }, loading: false });
    } catch {
      put(s, (cur) => ({ ...cur, loading: false }));
    }
  }, [side, put]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!state.user) return undefined;
    const timer = setInterval(() => document.visibilityState === 'visible' && refresh(), 30000);
    const onVisible = () => document.visibilityState === 'visible' && refresh();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [state.user, refresh]);

  const value = {
    ...state,
    side,
    refresh,
    setSession: (d) => put(side, { user: d.user, badges: d.badges ?? { messages: 0, bookings: 0 }, loading: false }),
    setUser: (user) => put(side, (cur) => ({ ...cur, user })),
    logout: async () => {
      await api.logout(side).catch(() => {});
      put(side, { ...EMPTY, loading: false });
    },
  };
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export const useSession = () => useContext(SessionContext);
