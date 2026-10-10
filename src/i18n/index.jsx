import { createContext, useContext, useEffect, useState } from 'react';
import { LANGUAGES, messages } from './messages.js';

const I18nContext = createContext(null);

function detectLanguage() {
  try {
    const saved = localStorage.getItem('lang');
    if (saved && messages[saved]) return saved;
  } catch {
    // ストレージが使えない環境では無視
  }
  const browser = (navigator.language || 'en').slice(0, 2);
  return messages[browser] ? browser : 'en';
}

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(detectLanguage);

  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      localStorage.setItem('lang', lang);
    } catch {
      // ignore
    }
  }, [lang]);

  const t = (key, vars = {}) => {
    const template = messages[lang][key] ?? messages.en[key] ?? key;
    return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
  };

  return <I18nContext.Provider value={{ lang, setLang, t, languages: LANGUAGES }}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);
