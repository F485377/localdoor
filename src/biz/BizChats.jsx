import { useState } from 'react';
import { api } from '../api.js';
import ChatView from '../components/ChatView.jsx';
import { Link, navigate, usePath } from '../router.jsx';
import { Back, ErrorNote, Spinner, timeShort, useLoad } from '../ui.jsx';

// チャット一覧（お客様ごと）。?traveler= のときは、予約したお客様と新しくチャットを始める
export default function BizChats() {
  const { params } = usePath();
  const travelerId = params.get('traveler');
  const shop = params.get('shop') ?? undefined;
  const { data, error, loading, reload } = useLoad(() => api.threads(), []);

  if (travelerId) {
    return (
      <>
        <Back to="/biz" label="予約" />
        <h1>お客様にメッセージ</h1>
        <ChatView travelerId={travelerId} shop={shop} ja onThread={(id) => navigate(`/biz/chats/${id}`, { replace: true })} />
      </>
    );
  }
  if (loading && !data) return <Spinner ja kind="rows" />;
  // 店舗が複数あるときは、どの店舗へのメッセージかを出す
  const many = new Set(data?.threads.map((t) => t.placeId)).size > 1;
  return (
    <>
      <h1>チャット</h1>
      <p className="small muted">お客様のメッセージは日本語に翻訳して表示します。日本語で返信すれば、お客様の言語（英語・中国語・韓国語）に翻訳して届きます。</p>
      <ErrorNote error={error?.status === 404 ? null : error} ja onRetry={reload} />
      {(error?.status === 404 || (data && !data.threads.length)) && <p className="empty">まだメッセージはありません。</p>}
      {data?.threads.map((t) => (
        <Link key={t.id} to={`/biz/chats/${t.id}`} className={`thread-row${t.unread ? ' unread' : ''}`}>
          <div className="grow">
            <b>{t.travelerLeft ? '退会したお客様' : `${t.travelerName} 様`}</b>
            {t.blocked && <span className="badge" style={{ marginLeft: 6 }}>ブロック中</span>}
            {many && <div className="place-tag">店舗：{t.placeNameJa}</div>}
            <div className="preview">{t.preview}</div>
          </div>
          <span className="small muted">{timeShort(t.lastMessageAt, 'ja')}</span>
          {t.unread && <span className="badge new">新着</span>}
        </Link>
      ))}
    </>
  );
}

// 嫌がらせなどがあれば、お客様をブロックする（メッセージと予約が届かなくなる）
export function BlockButton({ thread }) {
  const [blocked, setBlocked] = useState(thread.blocked);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState(null);
  const toggle = async () => {
    try {
      await api.block(thread.id, !blocked);
      setBlocked(!blocked);
      setConfirming(false);
      window.location.reload();
    } catch (err) {
      setError(err);
    }
  };
  if (blocked) {
    return (
      <button className="btn" onClick={toggle}>
        ブロックを解除
      </button>
    );
  }
  return (
    <>
      {confirming ? (
        <span className="btn-row">
          <button className="btn" onClick={() => setConfirming(false)}>
            やめる
          </button>
          <button className="btn danger" onClick={toggle}>
            ブロックする
          </button>
        </span>
      ) : (
        <button className="btn" onClick={() => setConfirming(true)}>
          ブロック
        </button>
      )}
      {confirming && <p className="small muted" style={{ width: '100%' }}>ブロックすると、このお客様からのメッセージと新しい予約が届かなくなります。</p>}
      <ErrorNote error={error} ja />
    </>
  );
}
