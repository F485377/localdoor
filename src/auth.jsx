import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { setTokenGetter } from './api.js';

// アカウント（ログイン）。Firebase の設定があれば本物、なければデモ動作。
// デモ動作では実際のアカウントは作らず、この端末に「ログインした」という印だけ残す。
// （import.meta.env をここで直接見るのは、デモ版ビルドで Firebase のコードを丸ごと外すため）
const DEMO_BUILD = import.meta.env.VITE_DEMO === '1';
export const authMode = import.meta.env.VITE_FIREBASE_API_KEY && !DEMO_BUILD ? 'firebase' : 'demo';

const DEMO_KEY = 'haisai-demo-user';
const DEMO_CODE = '123456';
const AuthContext = createContext(null);

function loadDemoUser() {
  try {
    return JSON.parse(localStorage.getItem(DEMO_KEY));
  } catch {
    return null;
  }
}

function saveDemoUser(user) {
  try {
    if (user) localStorage.setItem(DEMO_KEY, JSON.stringify(user));
    else localStorage.removeItem(DEMO_KEY);
  } catch {
    // ignore
  }
}

const demoBackend = {
  watch: (cb) => {
    cb(loadDemoUser());
    return () => {};
  },
  signIn: (provider, info = {}) => {
    const user = { uid: `demo-${provider}`, provider, name: info.name ?? null, email: info.email ?? null, phone: info.phone ?? null };
    saveDemoUser(user);
    return Promise.resolve(user);
  },
};

// Firebase のコードは大きいので、使うときだけ読み込む
const loadFirebase = DEMO_BUILD ? () => Promise.reject(new Error('demo')) : () => import('./firebaseAuth.js');

export function AuthProvider({ children }) {
  const [user, setUser] = useState(authMode === 'demo' ? loadDemoUser() : null);

  useEffect(() => {
    if (authMode === 'demo') return demoBackend.watch(setUser);
    let unsubscribe = () => {};
    loadFirebase().then((fb) => (unsubscribe = fb.watch(setUser)));
    return () => unsubscribe();
  }, []);

  const value = useMemo(() => {
    const done = (u) => {
      setUser(u);
      return u;
    };
    if (authMode === 'demo') {
      return {
        user,
        mode: authMode,
        demoCode: DEMO_CODE,
        google: () => demoBackend.signIn('google.com').then(done),
        apple: () => demoBackend.signIn('apple.com').then(done),
        email: (address, _password, name) => demoBackend.signIn('password', { email: address, name }).then(done),
        sendPhoneCode: (phone) =>
          Promise.resolve((code) =>
            code === DEMO_CODE
              ? demoBackend.signIn('phone', { phone }).then(done)
              : Promise.reject(Object.assign(new Error('Wrong code'), { code: 'auth/invalid-verification-code' })),
          ),
        logout: () => {
          saveDemoUser(null);
          setUser(null);
          return Promise.resolve();
        },
        idToken: () => Promise.resolve(null),
      };
    }
    return {
      user,
      mode: authMode,
      google: () => loadFirebase().then((fb) => fb.google()).then(done),
      apple: () => loadFirebase().then((fb) => fb.apple()).then(done),
      email: (address, password, name) => loadFirebase().then((fb) => fb.email(address, password, name)).then(done),
      sendPhoneCode: (phone, buttonId) =>
        loadFirebase().then(async (fb) => {
          const confirm = await fb.sendPhoneCode(phone, buttonId);
          return (code) => confirm(code).then(done);
        }),
      logout: () => loadFirebase().then((fb) => fb.logout()),
      idToken: () => loadFirebase().then((fb) => fb.idToken()),
    };
  }, [user]);

  useEffect(() => {
    setTokenGetter(value.idToken);
  }, [value]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
