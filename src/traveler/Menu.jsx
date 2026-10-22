import { useEffect } from 'react';
import { useI18n } from '../i18n/index.jsx';
import { OPERATOR } from '../legal.jsx';
import { Link, navigate } from '../router.jsx';
import { useSession } from '../session.jsx';
import { openBuddyChat, useBuddyHidden } from './Buddy.jsx';
import { lastResults } from './bits.jsx';

// 右上の三本線のメニュー：予約の確認、メッセージ、アカウント、設定（言語・通貨）、規約など
export default function Menu({ open, onClose, onSettings }) {
  const { t } = useI18n();
  const { user, badges, logout } = useSession();
  const [buddyHidden, setBuddyHidden] = useBuddyHidden();
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;

  const item = (to, label, count) => (
    <Link to={to} onClick={onClose}>
      {label}
      {count > 0 && <span className="count">{count}</span>}
    </Link>
  );
  return (
    <div className="drawer-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <nav className="drawer" role="dialog" aria-modal="true" aria-label={t('menu')}>
        <div className="drawer-head">
          <b>{user?.role === 'TRAVELER' ? user.name : t('menu')}</b>
          <button className="icon-btn" onClick={onClose} aria-label={t('close')}>
            ✕
          </button>
        </div>
        {/* 探す：前に探した条件の検索結果に戻る（まだ探していなければ、検索の画面） */}
        {item(lastResults() ?? '/?edit=1', t('menu.search'))}
        {item('/saved', t('menu.saved'))}
        {item('/bookings', t('menu.bookings'), badges.bookings)}
        {item('/chats', t('menu.messages'), badges.messages)}
        {user ? item('/account', t('menu.account')) : item('/login', t('menu.login'))}
        <button className="drawer-item" onClick={onSettings}>
          {t('menu.settings')}
        </button>
        <button className="drawer-item" onClick={() => (onClose(), openBuddyChat())}>
          {t('menu.askBuddy')}
        </button>
        <button className="drawer-item" role="switch" aria-checked={!buddyHidden} onClick={() => setBuddyHidden(!buddyHidden)}>
          {t('buddy.show')}
          <span className={buddyHidden ? 'badge' : 'badge ok'}>{buddyHidden ? 'OFF' : 'ON'}</span>
        </button>
        <hr />
        {item('/terms', t('menu.terms'))}
        {item('/privacy', t('menu.privacy'))}
        {item('/credits', t('menu.credits'))}
        {OPERATOR.email && <a href={`mailto:${OPERATOR.email}`}>{t('menu.contact')}</a>}
        <a href="/biz">{t('menu.business')}</a>
        {user && (
          <>
            <hr />
            <button
              className="drawer-item"
              onClick={async () => {
                onClose();
                await logout();
                navigate('/search');
              }}
            >
              {t('menu.logout')}
            </button>
          </>
        )}
      </nav>
    </div>
  );
}
