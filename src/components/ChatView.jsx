import { useEffect, useRef, useState } from 'react';
import { MAX_MESSAGE } from '../../lib/domain.js';
import { TEMPLATES } from '../../lib/templates.js';
import { api } from '../api.js';
import { useSession } from '../session.jsx';
import { useI18n } from '../i18n/index.jsx';
import { store } from '../store.js';
import { ErrorNote, timeShort } from '../ui.jsx';

// 翻訳チャット（旅行者・事業者で共通）。開いている間だけ5秒ごとに新着を取りに行く。
//   threadId があればそのスレッド。新しく始めるときは、旅行者は placeId、事業者は travelerId を渡す
const JA = {
  placeholder: '日本語で入力…',
  send: '送信',
  original: '原文を見る',
  hideOriginal: '原文を隠す',
  noTranslation: '翻訳できませんでした。原文を表示しています。',
  note: 'メッセージは自動で翻訳されます。日本語で書けば、お客様の言語に翻訳して届きます。',
  empty: 'まだメッセージはありません。',
  blocked: 'このお客様をブロックしています。お客様からのメッセージと予約は届きません。',
  left: 'このお客様は退会しました。返信はできません。',
  limit: '{n}文字まで',
  templates: '定型文',
  sending: '翻訳して送信しています…',
};

// 事業者が新しく始めるときは、どの店舗としてかを shop で渡す
export default function ChatView({ threadId, placeId, travelerId, shop, ja = false, onThread }) {
  const i18n = useI18n();
  const t = (key, vars) => {
    let s = ja ? JA[key] : i18n.t(`c.${key}`);
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
    return s;
  };
  const lang = ja ? 'ja' : i18n.lang;
  const { refresh } = useSession();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const draftKey = `jimoto-chat:${threadId ?? placeId ?? travelerId}`;
  const start = placeId ? { placeId } : { travelerId, placeId: shop };
  const [text, setText] = useState(() => store.get(draftKey, ''));
  const [templateId, setTemplateId] = useState(null);
  // 定型文：旅行者にはその人の言語で、事業者には日本語で出す
  const templates = TEMPLATES[ja ? 'business' : 'traveler'].map((x) => ({ id: x.id, text: x[lang] ?? x.en }));
  const [sending, setSending] = useState(false);
  const [openOriginal, setOpenOriginal] = useState({});
  const bottom = useRef(null);
  const count = useRef(0);
  // 最初のメッセージを送っている間（翻訳で数秒かかる）は、5秒ごとの読み込みでスレッドの画面へ移らない。
  // 先に移ると、送り終わったメッセージが前の画面に届いて、移った先が空のままに見えるため
  const sendingRef = useRef(false);

  const load = async () => {
    try {
      const d = threadId ? await api.thread(threadId) : placeId ? await api.threadForPlace(placeId) : await api.threadForTraveler(travelerId, shop);
      setData(d);
      setError(null);
      if (d.thread && !threadId && !sendingRef.current) onThread?.(d.thread.id);
      refresh();
    } catch (err) {
      setError(err);
    }
  };

  useEffect(() => {
    load();
    const timer = setInterval(() => document.visibilityState === 'visible' && load(), 5000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId, placeId, travelerId]);

  useEffect(() => {
    const n = data?.messages?.length ?? 0;
    if (n !== count.current) bottom.current?.scrollIntoView({ block: 'end' });
    count.current = n;
  }, [data]);

  useEffect(() => store.set(draftKey, text), [draftKey, text]);

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    sendingRef.current = true;
    try {
      const tpl = templates.find((x) => x.id === templateId);
      const extra = tpl && tpl.text === text ? { templateId } : {};
      const d = await api.send(threadId || data?.thread?.id ? { id: threadId ?? data.thread.id, text, ...extra } : { ...start, text, ...extra });
      setTemplateId(null);
      setText('');
      store.remove(draftKey);
      setData((cur) => ({ thread: cur?.thread ?? { id: d.threadId }, messages: [...(cur?.messages ?? []), d.message] }));
      setError(null);
      sendingRef.current = false;
      // 新しいスレッドなら、送り終わってから移る（移った先で取り直すので、送ったメッセージが出る）
      if (!threadId) onThread?.(d.threadId);
    } catch (err) {
      setError(err);
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  const thread = data?.thread;
  const locked = thread?.travelerLeft || (thread?.blocked && !ja);

  return (
    <div className="chat">
      <p className="small muted">{t('note')}</p>
      <div className="bubbles" aria-live="polite">
        {data && !data.messages.length && <p className="empty">{t('empty')}</p>}
        {data?.messages.map((m) => (
          <div key={m.id} className={`bubble-wrap${m.mine ? ' mine' : ''}`}>
            <div className={`bubble${m.mine ? ' mine' : ''}`} lang={m.mine === ja ? 'ja' : undefined}>
              {m.text}
            </div>
            {!m.mine && m.translated === false && <span className="bubble-meta">{t('noTranslation')}</span>}
            {!m.mine && m.translated && (
              <>
                <button type="button" className="link small bubble-meta" onClick={() => setOpenOriginal((o) => ({ ...o, [m.id]: !o[m.id] }))}>
                  {openOriginal[m.id] ? t('hideOriginal') : t('original')}
                </button>
                {openOriginal[m.id] && <div className="original">{m.original}</div>}
              </>
            )}
            <span className="bubble-meta">{timeShort(m.createdAt, lang)}</span>
          </div>
        ))}
        <div ref={bottom} />
      </div>
      <ErrorNote error={error} ja={lang === 'ja'} />
      {thread?.blocked && <p className="notice">{t('blocked')}</p>}
      {thread?.travelerLeft && <p className="notice">{t('left')}</p>}
      {/* 定型文と入力欄は、まとめて画面の下にとめる（スクロールしても定型文が入力欄の下にもぐらない） */}
      {!locked && (
        <div className="chat-foot">
          <div className="templates" role="group" aria-label={t('templates')}>
            {templates.map((x) => (
              <button
                key={x.id}
                type="button"
                className="chip"
                onClick={() => {
                  setText(x.text);
                  setTemplateId(x.id);
                }}
              >
                {x.text}
              </button>
            ))}
          </div>
          <form className="composer" onSubmit={send}>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX_MESSAGE))}
              placeholder={t('placeholder')}
              aria-label={t('placeholder')}
              maxLength={MAX_MESSAGE}
              rows={Math.min(5, Math.max(1, text.split('\n').length))}
            />
            <button className="btn primary" disabled={!text.trim() || sending}>
              {t('send')}
            </button>
          </form>
        </div>
      )}
      {sending && (
        <p className="small muted" role="status">
          {t('sending')}
        </p>
      )}
      {text.length > MAX_MESSAGE * 0.9 && <p className="small muted">{t('limit', { n: MAX_MESSAGE })}</p>}
    </div>
  );
}
