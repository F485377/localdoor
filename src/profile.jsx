import { createContext, useContext, useState } from 'react';

// 旅行者のプロフィール（名前・出身国・行き先・食事の制限）。
// 今はこの端末の localStorage に保存する。ログイン機能を作ったらDBに移す。
const STORAGE_KEY = 'haisai-profile';
const ProfileContext = createContext(null);

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? null;
  } catch {
    return null;
  }
}

export function ProfileProvider({ children }) {
  const [profile, setProfileState] = useState(load);

  const setProfile = (next) => {
    setProfileState(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // 保存できなくても、このセッションの間は使える
    }
  };

  return <ProfileContext.Provider value={{ profile, setProfile }}>{children}</ProfileContext.Provider>;
}

export const useProfile = () => useContext(ProfileContext);
