import { DoorMark } from '../components/Logo.jsx';
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
  else page = <NotFound />;

  const unread = badges.messages + badges.bookings;
  return (
    <SavedProvider>
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <Link to="/search" className="logo">
            <DoorMark />
            Local<span>Door</span>
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
