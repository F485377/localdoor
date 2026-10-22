import { useEffect, useState } from 'react';
import { api } from '../api.js';

// 事業者の通知：新しい予約・キャンセル・お客様のメッセージを、スマホやパソコンに音つきで知らせる。
// 通知がオンになるまでは、事業者の画面を使えない（オンにするまでの手順を出す）。
//   iPhone・iPad … ホーム画面に追加したアプリからでないと通知を受け取れない（iOS 16.4 以降）
//   「許可しない」にしてしまった … 端末やブラウザの設定から許可してもらう
const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
const supported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

function urlKey(base64) {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function subscribe(key) {
  const reg = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlKey(key) }));
  return sub.toJSON();
}

function stateNow() {
  if (isIOS() && !isStandalone()) return 'ios-home';
  if (!supported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  return 'ask';
}

export default function NotifyGate() {
  const [state, setState] = useState(stateNow);
  const [key, setKey] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  // 宛先の鍵をもらう。許可済みなら、だまって登録しなおす（ブラウザが宛先を変えることがあるため）
  useEffect(() => {
    let alive = true;
    api
      .pushInfo()
      .then(async (d) => {
        if (!alive) return;
        setKey(d.key);
        if (!d.key) return setState('off');
        if (stateNow() === 'granted') {
          try {
            await api.savePush(await subscribe(d.key));
            if (alive) setState('ok');
          } catch {
            if (alive) setState('ask');
          }
        }
      })
      .catch(() => alive && setState('ok')); // 通信できないときは、画面を止めない
    return () => {
      alive = false;
    };
  }, []);

  if (state === 'ok' || state === 'off') return null;

  const turnOn = async () => {
    setBusy(true);
    setError(null);
    try {
      const p = await Notification.requestPermission();
      if (p !== 'granted') {
        setState(p === 'denied' ? 'denied' : 'ask');
        return;
      }
      await api.savePush(await subscribe(key), true);
      setState('ok');
    } catch (err) {
      setError(err?.message ?? '通知をオンにできませんでした');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="notify-gate" role="dialog" aria-modal="true" aria-labelledby="notify-title" lang="ja">
      <div className="notify-card">
        <svg className="notify-bell" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3a6 6 0 0 0-6 6v4l-2 3h16l-2-3V9a6 6 0 0 0-6-6Z" fill="#e60033" />
          <path d="M9.5 18a2.5 2.5 0 0 0 5 0" fill="none" stroke="#6e4526" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <h1 id="notify-title">通知をオンにしてください</h1>
        <p>新しい予約、キャンセル、お客様からのメッセージを、スマホやパソコンに音で知らせます。メッセージに2分返信がないときは、もう一度知らせます。</p>
        <p className="notify-must">LocalDoor の事業者の画面は、通知をオンにしてから使えます。</p>

        {state === 'ask' || state === 'granted' ? (
          <>
            <button type="button" className="btn primary block" onClick={turnOn} disabled={busy || !key}>
              {busy ? 'オンにしています…' : '通知をオンにする'}
            </button>
            <p className="small muted">このあと出てくる確認で「許可」を選んでください。</p>
          </>
        ) : null}

        {state === 'ios-home' && (
          <ol className="notify-steps">
            <li>
              Safari の下の <b>共有ボタン</b>（四角から上向きの矢印）を押す
            </li>
            <li>
              <b>「ホーム画面に追加」</b>を選ぶ
            </li>
            <li>
              ホーム画面にできた <b>LocalDoor</b> から開き、もう一度ログインする
            </li>
            <li>「通知をオンにする」を押して「許可」を選ぶ</li>
          </ol>
        )}

        {state === 'denied' && (
          <>
            <p>以前に「許可しない」が選ばれています。設定から通知を許可してください。</p>
            <ul className="notify-steps">
              <li>
                <b>iPhone</b>：設定 → 通知 → LocalDoor → 「通知を許可」をオン
              </li>
              <li>
                <b>Android（Chrome）</b>：アドレスバーの左のマーク → 権限（サイトの設定）→ 通知 → 許可
              </li>
              <li>
                <b>パソコン</b>：アドレスバーの左の鍵のマーク → 通知 → 許可。パソコン本体の通知設定もオンにしてください
              </li>
            </ul>
            <button type="button" className="btn block" onClick={() => location.reload()}>
              設定したので、もう一度確かめる
            </button>
          </>
        )}

        {state === 'unsupported' && <p className="notice">このブラウザでは通知を使えません。スマホは Chrome か Safari、パソコンは Chrome か Edge の新しいものでひらいてください。</p>}
        {error && <p className="error small">⚠ {error}</p>}
      </div>
    </div>
  );
}
