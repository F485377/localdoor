import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api.js';
import { useI18n } from '../i18n/index.jsx';
import { navigate } from '../router.jsx';
import { useSession } from '../session.jsx';

// 保存したお店（お気に入り）。ログインが必要。保存した id をまとめて持ち、♡ の表示に使う
const Ctx = createContext(null);

export function SavedProvider({ children }) {
  const { user } = useSession();
  const [ids, setIds] = useState(() => new Set());
  const traveler = user?.role === 'TRAVELER';

  useEffect(() => {
    if (!traveler) return setIds(new Set());
    api
      .savedIds()
      .then((d) => setIds(new Set(d.ids)))
      .catch(() => {});
  }, [traveler, user?.id]);

  const toggle = async (placeId) => {
    // ログインしていなければ、ログインしてからこの画面に戻る
    if (!traveler) return navigate(`/login?next=${encodeURIComponent(location.pathname + location.search)}`);
    const next = !ids.has(placeId);
    const flip = (on) =>
      setIds((s) => {
        const n = new Set(s);
        if (on) n.add(placeId);
        else n.delete(placeId);
        return n;
      });
    flip(next);
    try {
      await api.save(placeId, next);
    } catch {
      flip(!next); // 失敗したら元に戻す
    }
  };

  return <Ctx.Provider value={{ ids, toggle }}>{children}</Ctx.Provider>;
}

export const useSaved = () => useContext(Ctx);

// ♡ ボタン。リンクの中に置いても、押したときに店のページへ移らないようにする
export function SaveButton({ placeId, className = '' }) {
  const { t } = useI18n();
  const { ids, toggle } = useSaved();
  const on = ids.has(placeId);
  return (
    <button
      type="button"
      className={`save-btn${on ? ' on' : ''} ${className}`}
      aria-pressed={on}
      aria-label={on ? t('save.saved') : t('save.save')}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(placeId);
      }}
    >
      {on ? '♥' : '♡'}
    </button>
  );
}
