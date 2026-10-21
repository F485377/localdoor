import { useState } from 'react';
import { prefOf } from '../../lib/japan.js';
import { api } from '../api.js';
import { useCity } from '../components/JapanPicker.jsx';
import { label } from '../labels.js';
import { Link } from '../router.jsx';
import { ErrorNote, Spinner, useLoad } from '../ui.jsx';
import { takeSaveFlash } from './PlaceEditor.jsx';

// 店舗の一覧（下のバーの「店舗」）。店舗ごとに「店舗情報の変更」か「日程（カレンダー）の変更」を選ぶ。「＋ 店舗を追加」で新しい店舗の登録画面へ。
// 店舗の削除もここから（確かめてから削除する）
export default function PlaceList() {
  const { data, error, loading, reload } = useLoad(() => api.bizPlaces(), []);
  const [flash] = useState(takeSaveFlash);
  if (loading && !data) return <Spinner ja kind="rows" />;
  if (error) return <ErrorNote error={error} ja onRetry={reload} />;
  const { places, max } = data;
  const full = places.length >= max;

  return (
    <>
      <div className="status-line" style={{ marginBottom: 8 }}>
        <h1 style={{ margin: 0, flex: 1 }}>店舗</h1>
        {!full && (
          <Link to="/biz/place/new" className="btn primary">
            ＋ 店舗を追加
          </Link>
        )}
      </div>
      {flash && (
        <p className={flash.ok ? 'success' : 'notice'} role="status">
          {flash.text}
        </p>
      )}
      {!places.length && (
        <div className="card">
          <p>まだ店舗がありません。「＋ 店舗を追加」から登録してください。日本語で入力すれば、英語・中国語・韓国語に自動で翻訳して掲載します。</p>
          <Link to="/biz/place/new" className="btn primary block">
            ＋ 店舗を追加
          </Link>
        </div>
      )}
      {places.length > 0 && <p className="small muted">{places.length}件の店舗を登録しています。直したいものを選んでください。</p>}
      {places.map((p) => (
        <PlaceCard key={p.id} p={p} onDeleted={reload} />
      ))}
      {full && <p className="small muted">店舗は{max}件まで登録できます。</p>}
    </>
  );
}

function PlaceCard({ p, onDeleted }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const city = useCity(p.cityId);
  const where = [prefOf(p.prefCode)?.ja, city?.ja].filter(Boolean).join(' ');
  return (
    <div className="biz-place">
      <div className="biz-place-main">
        <span className="biz-place-photo" aria-hidden="true">
          {p.photos[0] ? <img src={p.photos[0]} alt="" loading="lazy" /> : <span className="small muted">写真なし</span>}
        </span>
        <span className="grow">
          <b>{p.name || '（店名未入力）'}</b>
          <span className="small muted">
            {[p.category && label('category', p.category, 'ja'), where, p.station].filter(Boolean).join('・')}
          </span>
          <span className="status-line">
            <StatusBadge p={p} />
            {!p.suspended && !p.published && p.missing.length > 0 && <span className="small muted">未入力 {p.missing.length}項目</span>}
            {p.published && !p.slots.length && <span className="small muted">時間枠なし（予約は受け付けません）</span>}
          </span>
        </span>
      </div>
      <div className="biz-place-actions">
        <Link to={`/biz/place/${p.id}`} className="btn">
          店舗情報の変更
        </Link>
        <Link to={`/biz/place/${p.id}/calendar`} className="btn">
          日程（カレンダー）の変更
        </Link>
      </div>
      <div className="biz-place-foot">
        {p.visible ? (
          <a className="small" href={`/p/${p.id}`} target="_blank" rel="noreferrer">
            旅行者の画面で見る ↗
          </a>
        ) : (
          <span />
        )}
        {!confirming && (
          <button type="button" className="link small danger-link" onClick={() => (setConfirming(true), setError(null))}>
            この店舗を削除
          </button>
        )}
      </div>
      {confirming && (
        <div className="biz-place-delete" role="alertdialog" aria-label="店舗の削除">
          <p className="small" style={{ margin: '0 0 8px' }}>
            <b>「{p.name || '店名未入力'}」を削除しますか？</b>
            <br />
            旅行者の検索や保存したお店に出なくなり、元に戻せません。写真も消えます。これまでの予約とメッセージの記録は残ります。
          </p>
          <ErrorNote error={error} ja />
          <div className="btn-row">
            <button type="button" className="btn" disabled={busy} onClick={() => setConfirming(false)}>
              やめる
            </button>
            <button
              type="button"
              className="btn danger"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError(null);
                try {
                  await api.deletePlace(p.id);
                  onDeleted();
                } catch (err) {
                  setError(err);
                  setBusy(false);
                }
              }}
            >
              {busy ? '削除しています…' : '削除する'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ p }) {
  if (p.suspended) return <span className="badge ng">運営により非公開</span>;
  if (p.published) return <span className="badge ok">公開中</span>;
  return <span className="badge">{p.missing.length ? '下書き' : '非公開'}</span>;
}
