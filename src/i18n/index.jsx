import { createContext, useContext, useEffect, useState } from 'react';
import { LANGS } from '../../lib/domain.js';
import { api } from '../api.js';
import { useSession } from '../session.jsx';
import { store } from '../store.js';
import en from './en.js';
import ja from './ja.js';
import ko from './ko.js';
import zh from './zh.js';
import zt from './zt.js';

// 旅行者画面の言語（英語・簡体字・繁体字・韓国語・日本語）。
// ログイン中はアカウントの言語、ログインしていなければ端末に保存した言語、どちらもなければ端末の設定から推定する
const DICTS = { en, zh, zt, ko, ja };
export const LANG_NAMES = { en: 'English', zh: '简体中文', zt: '繁體中文', ko: '한국어', ja: '日本語' };
export const HTML_LANG = { en: 'en', zh: 'zh-Hans', zt: 'zh-Hant', ko: 'ko', ja: 'ja' };
const LOCALE = { en: 'en-US', zh: 'zh-CN', zt: 'zh-TW', ko: 'ko-KR', ja: 'ja-JP' };
const KEY = 'jimoto-lang';

export function guessLang() {
  const langs = navigator.languages ?? [navigator.language ?? 'en'];
  for (const l of langs.map((x) => x.toLowerCase())) {
    if (l.startsWith('ko')) return 'ko';
    if (l.startsWith('ja')) return 'ja';
    if (l === 'zh-tw' || l === 'zh-hk' || l === 'zh-mo' || l.startsWith('zh-hant')) return 'zt';
    if (l.startsWith('zh')) return 'zh';
    if (l.startsWith('en')) return 'en';
  }
  return 'en';
}

const Ctx = createContext(null);

export function I18nProvider({ children }) {
  const { user, setUser } = useSession();
  const [local, setLocal] = useState(() => store.get(KEY));
  const account = user?.role === 'TRAVELER' ? user.lang : null;
  const lang = LANGS.includes(account) ? account : LANGS.includes(local) ? local : guessLang();
  const chosen = Boolean(account || local);

  useEffect(() => {
    if (!location.pathname.startsWith('/biz')) document.documentElement.lang = HTML_LANG[lang];
  }, [lang]);

  const setLang = async (l) => {
    if (!LANGS.includes(l)) return;
    store.set(KEY, l);
    setLocal(l);
    if (user?.role === 'TRAVELER') {
      setUser({ ...user, lang: l });
      await api.updateMe({ lang: l }).catch(() => {});
    }
  };

  const dict = DICTS[lang];
  const t = (key, vars) => {
    let s = dict[key] ?? en[key] ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
    return s;
  };
  return <Ctx.Provider value={{ lang, setLang, chosen, t, locale: LOCALE[lang] }}>{children}</Ctx.Provider>;
}

export const useI18n = () => useContext(Ctx);
