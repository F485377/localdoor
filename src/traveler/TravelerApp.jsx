import Credits from './Credits.jsx';
import { useEffect, useState } from 'react';
import AuthScreen from '../components/AuthScreen.jsx';
import ChatView from '../components/ChatView.jsx';
import { useI18n } from '../i18n/index.jsx';
import { LegalPage } from '../legal.jsx';
import { Link, navigate, usePath } from '../router.jsx';
import { useSession } from '../session.jsx';
import { Back, Spinner } from '../ui.jsx';
import Account from './Account.jsx';
import BookingFlow from './BookingFlow.jsx';
import Bookings from './Bookings.jsx';
import Buddy, { useBuddyChat } from './Buddy.jsx';
import BuddyChat from './BuddyChat.jsx';
import { ChatList, PlaceChat } from './Chats.jsx';
import Home from './Home.jsx';
import Menu from './Menu.jsx';
import PlaceDetail from './PlaceDetail.jsx';
import Results from './Results.jsx';
import Reviews from './Reviews.jsx';
import Saved from './Saved.jsx';
import SettingsSheet from './SettingsSheet.jsx';
import { SavedProvider } from './savedStore.jsx';
import Splash from './Splash.jsx';

// 旅行者画面（英語・簡体字・繁体字・韓国語）。閲覧はログインなし。チャット・予約・マイ予約はログインが必要。
// メニューは右上の三本線にまとめる（下のタブは使わない）
export default function TravelerApp() {
  const { pathname, params } = usePath();
  const { badges } = useSession();
  const { t, lang } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [chatOpen, closeChat] = useBuddyChat();

  useEffect(() => {
    document.title = 'LocalDoor';
    // どの画面からでも「言語と通貨」を開けるように（為替の欄の「自分の通貨で表示」など）
    const open = () => setSettingsOpen(true);
    window.addEventListener('jimoto-open-settings', open);
    return () => window.removeEventListener('jimoto-open-settings', open);
  }, []);

  const parts = pathname.split('/').filter(Boolean);
  const next = params.get('next') || undefined;
  const openSettings = () => setSettingsOpen(true);
  let page;
  // トップを開くたびに、まずロゴだけの画面（「変更」から戻ったときは出さない）
  if (!parts.length) page = params.get('edit') ? <Home onSettings={openSettings} /> : <Splash><Home onSettings={openSettings} /></Splash>;
  else if (parts[0] === 'search') page = <Results />;
  else if (parts[0] === 'p' && parts[1] && !parts[2]) page = <PlaceDetail id={parts[1]} />;
  else if (parts[0] === 'p' && parts[2] === 'reviews') page = <Reviews id={parts[1]} />;
  else if (parts[0] === 'p' && parts[2] === 'book') page = <RequireTraveler><BookingFlow id={parts[1]} /></RequireTraveler>;
  else if (parts[0] === 'p' && parts[2] === 'chat') page = <RequireTraveler><PlaceChat placeId={parts[1]} /></RequireTraveler>;
  else if (parts[0] === 'chats' && parts[1]) page = <RequireTraveler><Back to="/chats" label={t('c.title')} /><ChatView threadId={parts[1]} /></RequireTraveler>;
  else if (parts[0] === 'chats') page = <RequireTraveler><ChatList /></RequireTraveler>;
  else if (parts[0] === 'saved') page = <RequireTraveler><Saved /></RequireTraveler>;
  else if (parts[0] === 'bookings') page = <RequireTraveler><Bookings /></RequireTraveler>;
  else if (parts[0] === 'account') page = <RequireTraveler><Account onSettings={openSettings} /></RequireTraveler>;
  else if (['login', 'register', 'forgot'].includes(parts[0])) page = <AuthScreen mode={parts[0]} next={safeNext(next)} />;
  else if (parts[0] === 'reset') page = <AuthScreen mode="reset" token={params.get('token')} />;
  else if (parts[0] === 'terms') page = <LegalPage kind="terms" lang={lang} />;
  else if (parts[0] === 'privacy') page = <LegalPage kind="privacy" lang={lang} />;
  else if (parts[0] === 'credits') page = <Credits />;
  else page = <NotFound />;

  const unread = badges.messages + badges.bookings;
  return (
    <SavedProvider>
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <Link to="/search" className="logo">
            Local<span>Door</span>
            <span className="logo-ninja" aria-hidden="true">
              <span className="logo-throw" style={{ '--n': 0 }}><svg className="logo-item" viewBox="0 0 24 24"><circle cx="11" cy="14" r="8" fill="#2a2d31" /><circle cx="8.5" cy="11.5" r="2.2" fill="#ffffff" opacity="0.25" /><path d="M15 8 Q17 4 20 4" stroke="#8a5a2a" strokeWidth="1.8" fill="none" /><circle className="fuse" cx="20.5" cy="3.5" r="2" fill="#ffb02e" /></svg></span>
              <span className="logo-throw" style={{ '--n': 1 }}><svg className="logo-item" viewBox="0 0 24 24"><ellipse cx="12" cy="16" rx="9" ry="4.5" fill="#fbf7ea" stroke="#d9d2bf" strokeWidth="1" /><path d="M3.5 13 Q12 5 20.5 13 Q12 11 3.5 13 Z" fill="#f2724f" /><path d="M7 11.5 L9 9.5 M11 10.5 L13 8.5 M15 11 L17 9.5" stroke="#ffd0bf" strokeWidth="1.2" /><rect x="10.5" y="11.5" width="3" height="9" fill="#26332a" /></svg></span>
              <span className="logo-throw" style={{ '--n': 2 }}><svg className="logo-item" viewBox="0 0 24 24"><circle cx="11" cy="14" r="8" fill="#2a2d31" /><circle cx="8.5" cy="11.5" r="2.2" fill="#ffffff" opacity="0.25" /><path d="M15 8 Q17 4 20 4" stroke="#8a5a2a" strokeWidth="1.8" fill="none" /><circle className="fuse" cx="20.5" cy="3.5" r="2" fill="#ffb02e" /></svg></span>
              <span className="logo-throw" style={{ '--n': 3 }}><svg className="logo-item" viewBox="0 0 24 24"><path d="M2 11 H22 Q21 21 12 21 Q3 21 2 11 Z" fill="#d8452f" /><path d="M2 11 H22" stroke="#9a2a1a" strokeWidth="1.5" /><path d="M5 10 Q8 7 10 10 M10 10 Q13 7 15 10" stroke="#f2c14e" strokeWidth="1.6" fill="none" /><circle cx="17" cy="9" r="2.4" fill="#fff" /><circle cx="17" cy="9" r="1.1" fill="#f2b02e" /><path d="M14 2 L19 9 M17 2 L21 8" stroke="#8a5a2a" strokeWidth="1.3" /></svg></span>
              <span className="logo-throw" style={{ '--n': 4 }}><svg className="logo-item" viewBox="0 0 24 24"><circle cx="11" cy="14" r="8" fill="#2a2d31" /><circle cx="8.5" cy="11.5" r="2.2" fill="#ffffff" opacity="0.25" /><path d="M15 8 Q17 4 20 4" stroke="#8a5a2a" strokeWidth="1.8" fill="none" /><circle className="fuse" cx="20.5" cy="3.5" r="2" fill="#ffb02e" /></svg></span>
              <span className="logo-throw" style={{ '--n': 5 }}><svg className="logo-item" viewBox="0 0 24 24"><ellipse cx="12" cy="18" rx="10" ry="3.5" fill="#e6c98f" /><circle cx="7" cy="14" r="4" fill="#c47a32" /><circle cx="12.5" cy="12.5" r="4.2" fill="#b86a28" /><circle cx="17.5" cy="14.5" r="3.8" fill="#c47a32" /><path d="M4 12.5 Q7 11 10 13 M9.5 11 Q12.5 9 15.5 11.5 M15 13 Q17.5 12 20.5 13.5" stroke="#5a2e12" strokeWidth="1.2" fill="none" /><circle cx="8" cy="12.5" r="0.7" fill="#5aa64a" /><circle cx="13" cy="10.8" r="0.7" fill="#5aa64a" /><circle cx="18" cy="13" r="0.7" fill="#5aa64a" /></svg></span>
              <span className="logo-throw" style={{ '--n': 6 }}><svg className="logo-item" viewBox="0 0 24 24"><circle cx="11" cy="14" r="8" fill="#2a2d31" /><circle cx="8.5" cy="11.5" r="2.2" fill="#ffffff" opacity="0.25" /><path d="M15 8 Q17 4 20 4" stroke="#8a5a2a" strokeWidth="1.8" fill="none" /><circle className="fuse" cx="20.5" cy="3.5" r="2" fill="#ffb02e" /></svg></span>
            </span>
          </Link>
          <span className="spacer" />
          <button className="menu-btn" onClick={() => setMenuOpen(true)} aria-label={t('menu')} aria-haspopup="dialog">
            <span />
            <span />
            <span />
            {unread > 0 && <i className="dot" aria-hidden="true" />}
          </button>
        </div>
      </header>
      <main className="main" style={{ paddingBottom: 'calc(32px + env(safe-area-inset-bottom))' }}>
        {page}
      </main>
      {/* チャットの画面と、キャラクターとの会話を開いている間は出さない */}
      <Buddy at={pathname} hidden={chatOpen || parts[0] === 'chats' || (parts[0] === 'p' && parts[2] === 'chat')} />
      {/* キャラクターとの会話。キャラクターを隠していても、メニューの「キャラクターに質問する」から開ける */}
      <BuddyChat open={chatOpen} onClose={closeChat} page={buddyPage(parts)} />
      <Menu open={menuOpen} onClose={() => setMenuOpen(false)} onSettings={() => (setMenuOpen(false), openSettings())} />
      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
    </SavedProvider>
  );
}

// キャラクターの一言を、どの画面の言葉にするか
function buddyPage(parts) {
  if (!parts.length) return 'home';
  if (parts[0] === 'search') return 'results';
  if (parts[0] === 'p') return parts[2] === 'book' ? 'book' : parts[2] ? 'default' : 'detail';
  return 'default';
}

// ログイン後の戻り先は、このサイトの中のパスだけ
const safeNext = (next) => (next && next.startsWith('/') && !next.startsWith('//') ? next : undefined);

// ログインが必要な画面。ログインしていなければログイン画面へ（終わったらこの画面に戻る）
function RequireTraveler({ children }) {
  const { user, loading, logout } = useSession();
  const { t } = useI18n();
  const here = location.pathname + location.search;
  useEffect(() => {
    if (!loading && !user) navigate(`/login?next=${encodeURIComponent(here)}`, { replace: true });
  }, [loading, user, here]);
  if (loading || !user) return <Spinner />;
  if (user.role !== 'TRAVELER') {
    return (
      <div className="card">
        <p>{t('bizAccount')}</p>
        <div className="btn-row">
          <a className="btn" href="/biz">
            {t('goBiz')}
          </a>
          <button className="btn" onClick={logout}>
            {t('menu.logout')}
          </button>
        </div>
      </div>
    );
  }
  return children;
}

function NotFound() {
  const { t } = useI18n();
  return (
    <div className="empty">
      <p>{t('notFound')}</p>
      <Link to="/search" className="btn primary">
        {t('explore')}
      </Link>
    </div>
  );
}
