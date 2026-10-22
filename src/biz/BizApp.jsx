import { useEffect, useRef, useState } from 'react';
import AuthScreen from '../components/AuthScreen.jsx';
import ChatView from '../components/ChatView.jsx';
import { ChatIcon, ListIcon, ShopIcon, UserIcon } from '../icons.jsx';
import { LegalPage, OPERATOR } from '../legal.jsx';
import { Link, navigate, usePath } from '../router.jsx';
import { useSession } from '../session.jsx';
import { Back, Spinner, useLoad } from '../ui.jsx';
import { api } from '../api.js';
import BizAccount from './BizAccount.jsx';
import BizBookings from './BizBookings.jsx';
import BizCalendar from './BizCalendar.jsx';
import BizChats, { BlockButton } from './BizChats.jsx';
import PlaceEditor from './PlaceEditor.jsx';
import PlaceList from './PlaceList.jsx';
import { BizWelcome } from './BizGuide.jsx';
import NotifyGate from './NotifyGate.jsx';
import BizTour, { savedTour } from './BizTour.jsx';
import { armSound, chime, soundWanted } from './sound.js';

// 事業者画面（/biz、日本語、スマホファースト）
export default function BizApp() {
  const { pathname, params } = usePath();
  const { user, loading, badges, logout, refresh } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  // 最初の画面で「事業者」を選んで来たら、お礼 → 使い方ガイド。ガイドの途中で読み込み直したら、続きから
  const [help, setHelp] = useState(() => (new URLSearchParams(location.search).get('welcome') ? 'welcome' : savedTour() != null ? 'guide' : null));
  const [tourStart, setTourStart] = useState(() => savedTour() ?? 0);
  const startTour = () => (setTourStart(0), setHelp('guide'));
  useEffect(() => {
    // 読み込み直しで、お礼がまた出ないように
    if (help === 'welcome' && location.search.includes('welcome')) history.replaceState(null, '', location.pathname);
  }, [help]);

  // 事業者画面は15秒ごとに新着を確かめ、新しい予約が増えたら音を鳴らす（画面を開いている間だけ）
  const isBiz = user?.role === 'BUSINESS';
  useEffect(() => {
    if (!isBiz) return undefined;
    const timer = setInterval(() => document.visibilityState === 'visible' && refresh(), 15000);
    return () => clearInterval(timer);
  }, [isBiz, refresh]);
  const lastCount = useRef(null);
  useEffect(() => {
    if (!isBiz) return;
    if (lastCount.current != null && badges.bookings > lastCount.current && soundWanted()) chime();
    lastCount.current = badges.bookings;
  }, [isBiz, badges.bookings]);

  // 音をオンにしてあれば、最初のタップで音の準備をする（もう一度「オン」を押さなくていい）
  useEffect(() => armSound(), []);

  useEffect(() => {
    document.documentElement.lang = 'ja';
    document.title = 'LocalDoor 事業者';
    document.querySelector('link[rel="manifest"]')?.setAttribute('href', '/manifest-biz.webmanifest');
  }, []);

  const parts = pathname.split('/').filter(Boolean).slice(1); // "biz" を除く
  const publicPage = ['login', 'register', 'forgot', 'reset', 'terms', 'privacy'].includes(parts[0]);
  const next = params.get('next');
  const safeNext = next && next.startsWith('/biz') ? next : undefined;

  let page;
  if (parts[0] === 'terms') page = <LegalPage kind="terms" lang="ja" biz />;
  else if (parts[0] === 'privacy') page = <LegalPage kind="privacy" lang="ja" biz />;
  else if (parts[0] === 'reset') page = <AuthScreen mode="reset" lang="ja" role="BUSINESS" base="/biz" token={params.get('token')} />;
  else if (['login', 'register', 'forgot'].includes(parts[0])) page = <AuthScreen mode={parts[0]} lang="ja" role="BUSINESS" base="/biz" next={safeNext} />;
  else if (loading) page = <Spinner ja />;
  else if (!user) page = <Welcome />;
  else if (user.role !== 'BUSINESS') {
    page = (
      <div className="card">
        <p>旅行者のアカウントでログインしています。事業者の画面を使うには、ログアウトして事業者のアカウントでログインしてください。</p>
        <button className="btn" onClick={logout}>
          ログアウト
        </button>
      </div>
    );
  } else if (!parts[0]) page = <BizBookings />;
  else if (parts[0] === 'place' && parts[1] && parts[2] === 'calendar') page = <BizCalendar id={parts[1]} />;
  else if (parts[0] === 'place' && parts[1]) page = <PlaceEditor id={parts[1] === 'new' ? undefined : parts[1]} />;
  else if (parts[0] === 'place') page = <PlaceList />;
  // 前の「受付停止」「カレンダー」の画面は、店舗の一覧（ここから店舗ごとのカレンダーへ）
  else if (parts[0] === 'calendar' || parts[0] === 'closures') page = <PlaceList />;
  else if (parts[0] === 'chats' && parts[1]) page = <BizThread id={parts[1]} />;
  else if (parts[0] === 'chats') page = <BizChats />;
  else if (parts[0] === 'account') page = <BizAccount />;
  else page = <p className="empty">ページが見つかりません。</p>;

  const loggedIn = user?.role === 'BUSINESS';
  // 下のバー（毎日使う画面）。右上の三本線は、旅行者の画面へ・規約・ログアウトなど
  const tab = (to, label, Icon, count) => {
    const on = to === '/biz' ? pathname === '/biz' || pathname === '/biz/' : pathname.startsWith(to);
    return (
      <Link to={to} className={on ? 'tab on' : 'tab'} aria-current={on ? 'page' : undefined}>
        <Icon />
        {label}
        {count > 0 && <span className="dot" aria-label={`新着${count}件`}>{count}</span>}
      </Link>
    );
  };

  return (
    <div className="app biz" lang="ja">
      <header className="topbar">
        <div className="topbar-inner">
          <Link to="/biz" className="logo">
            Local<span>Door</span>
            <span className="logo-ninja" aria-hidden="true">
              <span className="logo-throw" style={{ '--n': 0 }}><svg className="logo-item" viewBox="0 0 24 24"><circle cx="11" cy="14" r="8" fill="#2a2d31" /><circle cx="8.5" cy="11.5" r="2.2" fill="#ffffff" opacity="0.25" /><path d="M15 8 Q17 4 20 4" stroke="#8a5a2a" strokeWidth="1.8" fill="none" /><circle className="fuse" cx="20.5" cy="3.5" r="2" fill="#ffb02e" /></svg></span>
              <span className="logo-throw" style={{ '--n': 1 }}><svg className="logo-item" viewBox="0 0 24 24"><ellipse cx="12" cy="16" rx="9" ry="4.5" fill="#fbf7ea" stroke="#d9d2bf" strokeWidth="1" /><path d="M3.5 13 Q12 5 20.5 13 Q12 11 3.5 13 Z" fill="#f2724f" /><path d="M7 11.5 L9 9.5 M11 10.5 L13 8.5 M15 11 L17 9.5" stroke="#ffd0bf" strokeWidth="1.2" /><rect x="10.5" y="11.5" width="3" height="9" fill="#26332a" /></svg></span>
              <span className="logo-throw" style={{ '--n': 2 }}><svg className="logo-item" viewBox="0 0 24 24"><circle cx="11" cy="14" r="8" fill="#2a2d31" /><circle cx="8.5" cy="11.5" r="2.2" fill="#ffffff" opacity="0.25" /><path d="M15 8 Q17 4 20 4" stroke="#8a5a2a" strokeWidth="1.8" fill="none" /><circle className="fuse" cx="20.5" cy="3.5" r="2" fill="#ffb02e" /></svg></span>
              <span className="logo-throw" style={{ '--n': 3 }}><svg className="logo-item" viewBox="0 0 24 24"><path d="M2 11 H22 Q21 21 12 21 Q3 21 2 11 Z" fill="#d8452f" /><path d="M2 11 H22" stroke="#9a2a1a" strokeWidth="1.5" /><path d="M5 10 Q8 7 10 10 M10 10 Q13 7 15 10" stroke="#f2c14e" strokeWidth="1.6" fill="none" /><circle cx="17" cy="9" r="2.4" fill="#fff" /><circle cx="17" cy="9" r="1.1" fill="#f2b02e" /><path d="M14 2 L19 9 M17 2 L21 8" stroke="#8a5a2a" strokeWidth="1.3" /></svg></span>
              <span className="logo-throw" style={{ '--n': 4 }}><svg className="logo-item" viewBox="0 0 24 24"><circle cx="11" cy="14" r="8" fill="#2a2d31" /><circle cx="8.5" cy="11.5" r="2.2" fill="#ffffff" opacity="0.25" /><path d="M15 8 Q17 4 20 4" stroke="#8a5a2a" strokeWidth="1.8" fill="none" /><circle className="fuse" cx="20.5" cy="3.5" r="2" fill="#ffb02e" /></svg></span>
              <span className="logo-throw" style={{ '--n': 5 }}><svg className="logo-item" viewBox="0 0 24 24"><ellipse cx="12" cy="18" rx="10" ry="3.5" fill="#e6c98f" /><circle cx="7" cy="14" r="4" fill="#c47a32" /><circle cx="12.5" cy="12.5" r="4.2" fill="#b86a28" /><circle cx="17.5" cy="14.5" r="3.8" fill="#c47a32" /><path d="M4 12.5 Q7 11 10 13 M9.5 11 Q12.5 9 15.5 11.5 M15 13 Q17.5 12 20.5 13.5" stroke="#5a2e12" strokeWidth="1.2" fill="none" /><circle cx="8" cy="12.5" r="0.7" fill="#5aa64a" /><circle cx="13" cy="10.8" r="0.7" fill="#5aa64a" /><circle cx="18" cy="13" r="0.7" fill="#5aa64a" /></svg></span>
              <span className="logo-throw" style={{ '--n': 6 }}><svg className="logo-item" viewBox="0 0 24 24"><circle cx="11" cy="14" r="8" fill="#2a2d31" /><circle cx="8.5" cy="11.5" r="2.2" fill="#ffffff" opacity="0.25" /><path d="M15 8 Q17 4 20 4" stroke="#8a5a2a" strokeWidth="1.8" fill="none" /><circle className="fuse" cx="20.5" cy="3.5" r="2" fill="#ffb02e" /></svg></span>
            </span> <small className="muted" style={{ fontWeight: 600, fontSize: '0.8rem' }}>事業者</small>
          </Link>
          <span className="spacer" />
          <button className="menu-btn" onClick={() => setMenuOpen(true)} aria-label="メニュー" aria-haspopup="dialog">
            <span />
            <span />
            <span />
          </button>
        </div>
      </header>
      <main className="main">{page}</main>
      {loggedIn && !publicPage && (
        <nav className="tabs" aria-label="メニュー">
          <div className="tabs-inner">
            {tab('/biz', '予約', ListIcon, badges.bookings)}
            {tab('/biz/chats', 'チャット', ChatIcon, badges.messages)}
            {tab('/biz/place', '店舗', ShopIcon)}
            {tab('/biz/account', 'アカウント', UserIcon)}
          </div>
        </nav>
      )}
      {menuOpen && <BizMenu loggedIn={loggedIn} onClose={() => setMenuOpen(false)} onGuide={() => (setMenuOpen(false), startTour())} onLogout={async () => (setMenuOpen(false), await logout(), navigate('/biz'))} />}
      {/* 通知がオンになるまで、事業者の画面は使えない */}
      {loggedIn && !publicPage && <NotifyGate />}
      {help === 'welcome' && <BizWelcome onGuide={startTour} onClose={() => setHelp(null)} />}
      {help === 'guide' && <BizTour key={tourStart} start={tourStart} onClose={() => setHelp(null)} />}
    </div>
  );
}

// 右上の三本線のメニュー（事業者）。毎日使う画面は下のバー。ここは旅行者の画面へ（ログアウトせずに行き来できる）・規約・ログアウト
function BizMenu({ loggedIn, onClose, onGuide, onLogout }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const item = (to, label) => (
    <Link to={to} onClick={onClose}>
      {label}
    </Link>
  );
  return (
    <div className="drawer-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <nav className="drawer" role="dialog" aria-modal="true" aria-label="メニュー" lang="ja">
        <div className="drawer-head">
          <b>メニュー</b>
          <button className="icon-btn" onClick={onClose} aria-label="閉じる">
            ✕
          </button>
        </div>
        <button type="button" className="btn primary block drawer-guide" onClick={onGuide}>
          使い方を見る
          <small>画面を押しながら、順に案内します</small>
        </button>
        {!loggedIn && (
          <>
            {item('/biz/login', 'ログイン')}
            {item('/biz/register', 'アカウント登録')}
            <hr />
          </>
        )}
        <a href="/search">旅行者の画面へ</a>
        {item('/biz/terms', '利用規約')}
        {item('/biz/privacy', 'プライバシーポリシー')}
        {OPERATOR.email && <a href={`mailto:${OPERATOR.email}`}>お問い合わせ</a>}
        {loggedIn && (
          <>
            <hr />
            <button className="drawer-item" onClick={onLogout}>
              ログアウト
            </button>
          </>
        )}
      </nav>
    </div>
  );
}

function Welcome() {
  return (
    <div className="card" style={{ maxWidth: 440, margin: '8px auto' }}>
      <h1>海外のお客様の予約を、日本語だけで。</h1>
      <p>お店の情報を日本語で書くだけで、英語・中国語・韓国語に自動で翻訳して掲載します。予約は設定した人数の内なら自動で確定し、お客様からの質問も日本語で読んで返せます。</p>
      <ul className="small">
        <li>掲載・利用は無料です（代金は当日、現地で受け取ります）</li>
        <li>写真と、HPやInstagramのリンクを載せられます</li>
      </ul>
      <div className="btn-row" data-guide="start">
        <Link to="/biz/register" className="btn primary">
          アカウント登録
        </Link>
        <Link to="/biz/login" className="btn">
          ログイン
        </Link>
      </div>
    </div>
  );
}

function BizThread({ id }) {
  const { data } = useLoad(() => api.thread(id), [id]);
  const t = data?.thread;
  return (
    <>
      <Back to="/biz/chats" label="チャット一覧" />
      {t && (
        <div className="status-line" style={{ marginBottom: 8 }}>
          <h1 style={{ margin: 0, flex: 1 }}>{t.travelerLeft ? '退会したお客様' : `${t.travelerName} 様`}</h1>
          {!t.travelerLeft && <BlockButton thread={t} />}
        </div>
      )}
      {t && <div className="place-tag" style={{ marginBottom: 8 }}>店舗：{t.placeNameJa}</div>}
      <ChatView threadId={id} ja />
    </>
  );
}
