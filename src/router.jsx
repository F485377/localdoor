import { useEffect, useState } from 'react';

// 小さなルーター（パスだけで画面を切り替える）。Vercel 側は vercel.json で index.html に戻している
const listeners = new Set();

function go(to, replace) {
  history[replace ? 'replaceState' : 'pushState'](null, '', to);
  listeners.forEach((fn) => fn());
  window.scrollTo(0, 0);
}

// アカウント登録・ログインの画面へ移るときは、忍者の煙をゆったり出してから移る（動きを減らす設定ではすぐ移る）
const SMOKE_TO = /^\/(biz\/)?(register|login)(\?|$)/;
const SMOKE_IN_MS = 1900;
function smokeThen(fn) {
  const veil = document.createElement('div');
  veil.className = 'smoke-veil';
  veil.setAttribute('aria-hidden', 'true');
  veil.innerHTML = '<span></span>'.repeat(9);
  document.body.appendChild(veil);
  setTimeout(() => {
    fn();
    veil.classList.add('clearing');
  }, SMOKE_IN_MS);
  setTimeout(() => veil.remove(), SMOKE_IN_MS + 2400);
}

export function navigate(to, { replace = false } = {}) {
  if (to === location.pathname + location.search) return;
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (SMOKE_TO.test(to) && !SMOKE_TO.test(location.pathname) && !reduce) return smokeThen(() => go(to, replace));
  go(to, replace);
}

export function usePath() {
  const [path, setPath] = useState(() => location.pathname + location.search);
  useEffect(() => {
    const update = () => setPath(location.pathname + location.search);
    listeners.add(update);
    window.addEventListener('popstate', update);
    return () => {
      listeners.delete(update);
      window.removeEventListener('popstate', update);
    };
  }, []);
  const url = new URL(path, location.origin);
  return { pathname: url.pathname, params: url.searchParams };
}

export function Link({ to, children, ...rest }) {
  return (
    <a
      href={to}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        navigate(to);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}
