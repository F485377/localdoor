// 本物のログイン（Firebase Authentication）。VITE_FIREBASE_* が設定されているときだけ読み込まれる。
// 設定方法は docs/firebase-auth.md
import { initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  OAuthProvider,
  RecaptchaVerifier,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';

const app = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
});
const auth = getAuth(app);

const toUser = (u) =>
  u && {
    uid: u.uid,
    name: u.displayName,
    email: u.email,
    phone: u.phoneNumber,
    provider: u.providerData[0]?.providerId ?? 'unknown',
  };

export function watch(callback) {
  auth.useDeviceLanguage(); // SMS や確認画面をスマホの言語で出す
  return onAuthStateChanged(auth, (u) => callback(toUser(u)));
}

export async function google() {
  return toUser((await signInWithPopup(auth, new GoogleAuthProvider())).user);
}

export async function apple() {
  const provider = new OAuthProvider('apple.com');
  provider.addScope('email');
  provider.addScope('name');
  return toUser((await signInWithPopup(auth, provider)).user);
}

// メール：はじめてならアカウントを作り、すでにあればログインする
export async function email(address, password, name) {
  try {
    const { user } = await createUserWithEmailAndPassword(auth, address, password);
    if (name) await updateProfile(user, { displayName: name });
    return toUser(user);
  } catch (err) {
    if (err.code !== 'auth/email-already-in-use') throw err;
    return toUser((await signInWithEmailAndPassword(auth, address, password)).user);
  }
}

// 電話番号：SMSでコードを送り、confirm(code) で確認する
let verifier;
export async function sendPhoneCode(phoneNumber, buttonId) {
  verifier ??= new RecaptchaVerifier(auth, buttonId, { size: 'invisible' });
  const confirmation = await signInWithPhoneNumber(auth, phoneNumber, verifier);
  return async (code) => toUser((await confirmation.confirm(code)).user);
}

export const logout = () => signOut(auth);

export const idToken = () => auth.currentUser?.getIdToken() ?? Promise.resolve(null);
