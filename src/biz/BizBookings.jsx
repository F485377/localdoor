import { useEffect, useState } from 'react';
import { enableSound, soundReady, soundWanted } from './sound.js';
import { CANCEL_REASONS, slotLabel } from '../../lib/domain.js';
import { api } from '../api.js';
import { label, options } from '../labels.js';
import { Link } from '../router.jsx';
import { useSession } from '../session.jsx';
import { Chips, ErrorNote, Spinner, formatDate, useLoad } from '../ui.jsx';

const STATUS = {
  CONFIRMED: { text: '確定', cls: 'ok' },
  COMPLETED: { text: '完了', cls: '' },
  CANCELLED_BY_TRAVELER: { text: 'お客様がキャンセル', cls: 'ng' },
  CANCELLED_BY_BUSINESS: { text: 'こちらでキャンセル', cls: '' },
};

// 予約一覧（事業者のホーム）。開いた時点で新着は「見た」になる（次に開いたときは新着の印が消える）
export default function BizBookings() {
  const { refresh, badges } = useSession();
  const biz = useLoad(() => api.bizPlaces(), []);
  const { data, error, loading, reload, setData } = useLoad(() => api.bizBookings().finally(refresh), []);
  // 開いている間に新しい予約が入ったら、一覧を読み直す
  useEffect(() => {
    if (badges.bookings > 0 && data) reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [badges.bookings]);
  if ((loading && !data) || (biz.loading && !biz.data)) return <Spinner ja kind="rows" />;
  const places = biz.data?.places ?? [];
  const many = places.length > 1;

  if (!places.length) {
    return (
      <div className="card">
        <h1>ようこそ</h1>
        <p>まずは店舗を登録しましょう。日本語で入力すれば、英語・中国語・韓国語に自動で翻訳して掲載します。</p>
        <Link to="/biz/place/new" className="btn primary block">
          店舗を登録する
        </Link>
      </div>
    );
  }

  const list = data?.bookings ?? [];
  const upcoming = list.filter((b) => b.status === 'CONFIRMED');
  const others = list.filter((b) => b.status !== 'CONFIRMED').reverse();
  const replace = (b) => setData({ bookings: list.map((x) => (x.id === b.id ? b : x)) });

  return (
    <>
      <h1>予約</h1>
      {places.map((place) => {
        const name = many ? `「${place.name || '店名未入力'}」は` : '店舗は';
        if (!place.published && !place.suspended) {
          return (
            <p key={place.id} className="notice">
              {name}公開されていません。<Link to={`/biz/place/${place.id}`}>店舗の情報</Link>から公開してください。
            </p>
          );
        }
        if (place.published && !place.slots.length) {
          return (
            <p key={place.id} className="notice">
              {many && `「${place.name}」は`}時間枠が登録されていないため、予約は受け付けていません（チャットの質問のみ）。<Link to={`/biz/place/${place.id}`}>時間枠を登録</Link>
            </p>
          );
        }
        return null;
      })}
      <SoundToggle />
      <p className="small muted">予約は自動で確定します。メールでのお知らせはないので、この画面をこまめに確認してください。</p>
      <ErrorNote error={error} ja onRetry={reload} />
      {data && !list.length && <p className="empty">まだ予約はありません。</p>}
      {upcoming.length > 0 && <h2 className="section-title">これからの予約</h2>}
      {upcoming.map((b) => (
        <Row key={b.id} b={b} many={many} onChange={replace} />
      ))}
      {others.length > 0 && <h2 className="section-title">完了・キャンセル（過去30日）</h2>}
      {others.map((b) => (
        <Row key={b.id} b={b} many={many} onChange={replace} />
      ))}
    </>
  );
}

function Row({ b, many, onChange }) {
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const st = STATUS[b.status];

  const cancel = async () => {
    setBusy(true);
    setError(null);
    try {
      const d = await api.bizCancel({ id: b.id, reason, note });
      onChange(d.booking);
      setCancelling(false);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`booking-row${b.status.startsWith('CANCELLED') ? ' cancelled' : ''}`}>
      <div className="booking-head">
        <div>
          {many && <div className="place-tag">店舗：{b.place.name}</div>}
          <div className="booking-when">
            {formatDate(b.date, 'ja')} {slotLabel({ time: b.time, end: b.endTime })}
          </div>
          <div>
            {b.traveler.left ? '退会したお客様' : `${b.traveler.name} 様`}・{b.partySize}名
          </div>
        </div>
        <span>
          {b.fresh && <span className="badge new">新着</span>} <span className={`badge ${st.cls}`}>{st.text}</span>
        </span>
      </div>
      {b.diets.length > 0 && <p className="small" style={{ margin: '4px 0' }}>食事制限：{b.diets.map((d) => label('diet', d, 'ja')).join('、')}</p>}
      {b.message && (
        <div className="small" style={{ margin: '6px 0' }}>
          メッセージ：{b.messageJa ?? b.message}
          {b.messageJa ? (
            <details>
              <summary className="muted">原文を見る</summary>
              <div className="original">{b.message}</div>
            </details>
          ) : (
            <div className="muted">（翻訳できなかったため原文のまま表示しています）</div>
          )}
        </div>
      )}
      {b.status === 'CANCELLED_BY_BUSINESS' && (
        <p className="small muted">
          理由：{label('cancelReason', b.cancelReason, 'ja')}
          {b.cancelNote && `（${b.cancelNote}）`}
        </p>
      )}
      <div className="btn-row" style={{ marginTop: 8 }}>
        {!b.traveler.left && <ChatLink travelerId={b.traveler.id} shop={b.place.id} />}
        {b.status === 'CONFIRMED' && !cancelling && (
          <button className="btn" onClick={() => setCancelling(true)}>
            キャンセルする
          </button>
        )}
      </div>
      {cancelling && (
        <div style={{ marginTop: 10 }}>
          <p className="small">キャンセルの理由を選んでください。理由はお客様の言語に翻訳して、お客様の画面に表示されます。</p>
          <Chips multi={false} options={options('cancelReason', CANCEL_REASONS, 'ja')} value={reason} onChange={setReason} label="理由" />
          <label className="field" style={{ marginTop: 10 }}>
            <span className="field-label">お客様への一言（任意）</span>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={3} placeholder="例：申し訳ありません。台風のため、この日はお休みします。" />
          </label>
          <ErrorNote error={error} ja />
          <div className="btn-row">
            <button className="btn" onClick={() => setCancelling(false)}>
              やめる
            </button>
            <button className="btn danger" disabled={!reason || busy} onClick={cancel}>
              {busy ? 'キャンセルしています…' : '予約をキャンセルする'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// 予約したお客様とのチャット（まだやりとりがなければ、一覧から探す）
function ChatLink({ travelerId, shop }) {
  return (
    <Link to={`/biz/chats?traveler=${travelerId}&shop=${shop}`} className="btn">
      チャット
    </Link>
  );
}

// 通知音。止める機能は持たない。ブラウザの決まりで、開くたびに一度「音をオンにする」をタップしてもらう必要がある
function SoundToggle() {
  const [on, setOn] = useState(() => soundWanted() && soundReady());
  const [error, setError] = useState(false);
  if (on) {
    return (
      <div className="sound-toggle small">
        新しい予約が入ると音が鳴ります（この画面を開いている間）
      </div>
    );
  }
  return (
    <div className="notice small sound-toggle">
      <span style={{ flex: 1 }}>{soundWanted() ? '画面を開き直したので、もう一度タップしてください。' : '新しい予約を音で知らせます。'}</span>
      <button
        className="btn primary"
        onClick={async () => {
          try {
            await enableSound();
            setOn(true);
            setError(false);
          } catch {
            setError(true);
          }
        }}
      >
        音をオンにする
      </button>
      {error && <span>このブラウザでは音を鳴らせませんでした。</span>}
    </div>
  );
}
