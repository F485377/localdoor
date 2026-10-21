import { NinjaFace } from '../components/Ninja.jsx';
import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { useI18n } from '../i18n/index.jsx';
import { Sheet } from '../ui.jsx';

// キャラクターとおしゃべり（下から出る画面）。
//   よくある質問のボタンは、決まった答えをすぐ返す（AI を使わない）。
//   自由に書いたことは /api/buddy（Gemini）で、キャラクターとして旅行者の言語で答える。
//   会話はこのタブを開いている間だけ覚えておく（sessionStorage。サーバーには保存しない）
const KEY = 'jimoto-buddy-chat';
const FAQ = ['book', 'marks', 'pay', 'chat'];
const MAX = 300;

const load = () => {
  try {
    return JSON.parse(sessionStorage.getItem(KEY)) ?? [];
  } catch {
    return [];
  }
};
const keep = (list) => {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(list.slice(-40)));
  } catch {
    // 保存できなくても会話はできる
  }
};

export default function BuddyChat({ open, onClose, page }) {
  const { t, lang } = useI18n();
  const [messages, setMessages] = useState(load);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const bottom = useRef(null);

  useEffect(() => keep(messages), [messages]);
  useEffect(() => {
    if (open) bottom.current?.scrollIntoView({ block: 'end' });
  }, [open, messages, busy]);

  const add = (...m) => setMessages((list) => [...list, ...m]);

  const ask = (key) => add({ from: 'me', text: t(`buddy.q.${key}`) }, { from: 'buddy', text: t(`buddy.a.${key}`) });

  const send = async (e) => {
    e.preventDefault();
    const mine = text.trim().slice(0, MAX);
    if (!mine || busy) return;
    const next = [...messages, { from: 'me', text: mine }];
    setMessages(next);
    setText('');
    setBusy(true);
    try {
      const d = await api.buddy({
        messages: next.slice(-10).map((m) => ({
          from: m.from === 'me' ? 'traveler' : 'buddy',
          text: m.text,
        })),
        lang,
        page,
      });
      add({ from: 'buddy', text: d.reply });
    } catch (err) {
      add({
        from: 'buddy',
        text: t(err.code === 'limit' ? 'buddy.limit' : 'buddy.offline'),
        note: true,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={t('buddy.chatTitle')} closeLabel={t('close')} className="buddy-sheet">
      <div className="buddy-chat">
        <div className="bc-msg bc-buddy">
          <Face />
          <p>{t('buddy.greet')}</p>
        </div>
        {messages.map((m, i) =>
          m.from === 'me' ? (
            <div key={i} className="bc-msg me">
              <p>{m.text}</p>
            </div>
          ) : (
            <div key={i} className="bc-msg bc-buddy">
              <Face />
              <p className={m.note ? 'note' : undefined}>{m.text}</p>
            </div>
          ),
        )}
        {busy && (
          <div className="bc-msg bc-buddy" aria-live="polite">
            <Face talking />
            <p className="thinking">{t('buddy.thinking')}</p>
          </div>
        )}
        <div ref={bottom} />
      </div>
      <div className="bc-faq" role="group" aria-label={t('buddy.chatTitle')}>
        {FAQ.map((k) => (
          <button key={k} type="button" className="chip" disabled={busy} onClick={() => ask(k)}>
            {t(`buddy.q.${k}`)}
          </button>
        ))}
      </div>
      <form className="bc-form" onSubmit={send}>
        <input value={text} onChange={(e) => setText(e.target.value)} maxLength={MAX} placeholder={t('buddy.placeholder')} aria-label={t('buddy.placeholder')} enterKeyHint="send" />
        <button className="btn primary" disabled={busy || !text.trim()}>
          {t('buddy.send')}
        </button>
      </form>
      <p className="small muted bc-note">
        {t('buddy.note')}
        {messages.length > 0 && (
          <>
            {' '}
            <button type="button" className="link small" onClick={() => setMessages([])}>
              {t('buddy.reset')}
            </button>
          </>
        )}
      </p>
    </Sheet>
  );
}

// 会話の顔は、軽い画像（3D 表示はブラウザごとに使える数が限られるので、会話の数だけは出さない）
function Face({ talking = false }) {
  return (
    <span className={`bc-face${talking ? ' talking' : ''}`} aria-hidden="true">
      <NinjaFace />
    </span>
  );
}
