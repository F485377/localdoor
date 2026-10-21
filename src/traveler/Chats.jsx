import { api } from '../api.js';
import ChatView from '../components/ChatView.jsx';
import { useI18n } from '../i18n/index.jsx';
import { Link, navigate } from '../router.jsx';
import { Back, ErrorNote, Spinner, timeShort, useLoad } from '../ui.jsx';

// メッセージの一覧（店ごと）
export function ChatList() {
  const { t, lang } = useI18n();
  const { data, error, loading, reload } = useLoad(() => api.threads(), []);
  if (loading && !data) return <Spinner kind="rows" />;
  return (
    <>
      <h1>{t('c.title')}</h1>
      <ErrorNote error={error} onRetry={reload} />
      {data && !data.threads.length && (
        <div className="empty">
          <p>{t('c.none')}</p>
          <Link to="/search" className="btn primary">
            {t('explore')}
          </Link>
        </div>
      )}
      {data?.threads.map((th) => (
        <Link key={th.id} to={`/chats/${th.id}`} className={`thread-row${th.unread ? ' unread' : ''}`}>
          <div className="grow">
            <b>{th.placeName}</b>
            <div className="preview">{th.preview}</div>
          </div>
          <span className="small muted">{timeShort(th.lastMessageAt, lang)}</span>
          {th.unread && <span className="badge new">{t('mb.new')}</span>}
        </Link>
      ))}
    </>
  );
}

// 店の詳細から「質問する」。スレッドがまだなければ、最初のメッセージで作られる
export function PlaceChat({ placeId }) {
  const { t, lang } = useI18n();
  const place = useLoad(() => api.place(placeId, lang), [placeId, lang]);
  return (
    <>
      <Back to={`/p/${placeId}`} label={place.data?.place.name ?? t('back')} />
      <h1>{place.data ? t('c.ask', { name: place.data.place.name }) : t('d.ask')}</h1>
      <ErrorNote error={place.error} />
      {place.loading && !place.data ? <Spinner /> : <ChatView placeId={placeId} onThread={(id) => navigate(`/chats/${id}`, { replace: true })} />}
    </>
  );
}
