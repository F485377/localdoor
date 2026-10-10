import { useCallback, useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n/index.jsx';
import { useProfile } from '../profile.jsx';
import Heart3D from './Heart3D.jsx';

// 旅のおとものドキちゃん。画面の右下にいて、見ている画面やお店に合わせてときどきしゃべる。
// タップすると次のことをしゃべる。「しまう」で小さなハートだけ残して隠せる（この端末に記憶する）。
const HIDDEN_KEY = 'haisai-buddy-hidden';
const SHOW_MS = 7000; // 吹き出しを出しておく時間
const IDLE_MS = 45000; // 何もしていないとき、次にしゃべるまでの時間

function loadHidden() {
  try {
    return localStorage.getItem(HIDDEN_KEY) === '1';
  } catch {
    return false;
  }
}

// 選んだお店について、旅行者が気をつけたいことを優先してしゃべる
function placeLines(place, t) {
  const lines = [];
  if (place.cardAccepted === false) lines.push(t('buddy.cashOnly'));
  if (place.dressCode) lines.push(t('buddy.dress', { dress: place.dressCode }));
  if (place.rules?.length) lines.push(t('buddy.rule', { rule: place.rules[0] }));
  if (place.englishMenu) lines.push(t('buddy.englishMenu'));
  if (place.vegetarian) lines.push(t('buddy.vegetarian'));
  if (place.halal) lines.push(t('buddy.halal'));
  if (place.deposit != null) lines.push(t('buddy.bookable'));
  if (place.openingHours) lines.push(t('buddy.hours', { hours: place.openingHours }));
  if (!place.dressCode && !place.rules?.length) lines.push(t('buddy.littleInfo'));
  return lines;
}

export default function Buddy({ tab, place }) {
  const { t } = useI18n();
  const { profile } = useProfile();
  const name = profile?.name ?? '';
  const [hidden, setHidden] = useState(loadHidden);
  const [line, setLine] = useState('');
  const [hop, setHop] = useState(false);
  const [talking, setTalking] = useState(false);
  const talkTimer = useRef(null);
  const counter = useRef(0);
  const hideTimer = useRef(null);

  // いまの画面でしゃべれること
  const lines =
    tab === 'reservations'
      ? [t('buddy.bookings'), t('buddy.staffCard')]
      : tab === 'profile'
        ? [t('buddy.profile', { name }), t('buddy.photos')]
      : place
        ? placeLines(place, t)
        : [t('buddy.hello', { name }), t('buddy.filters'), t('buddy.pins'), t('buddy.search'), t('buddy.staffCard')];

  const say = useCallback(
    (text) => {
      setLine(text);
      setTalking(true);
      clearTimeout(talkTimer.current);
      talkTimer.current = setTimeout(() => setTalking(false), 1600); // しゃべり始めだけ口を動かす
      clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setLine(''), SHOW_MS);
    },
    [setLine],
  );

  const sayNext = () => {
    const text = lines[counter.current % lines.length];
    counter.current += 1;
    say(text);
  };

  // 画面やお店が変わったら、少し間をおいてしゃべる
  const contextKey = `${tab}:${place?.id ?? ''}`;
  useEffect(() => {
    if (hidden) return undefined;
    counter.current = place ? 0 : Math.floor(Math.random() * 3);
    const timer = setTimeout(sayNext, place ? 700 : 1500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextKey, hidden]);

  // しばらく何もしなければ、ときどき話しかける
  useEffect(() => {
    if (hidden) return undefined;
    const timer = setInterval(sayNext, IDLE_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextKey, hidden]);

  useEffect(
    () => () => {
      clearTimeout(hideTimer.current);
      clearTimeout(talkTimer.current);
    },
    [],
  );

  const setHiddenSaved = (value) => {
    setHidden(value);
    setLine('');
    try {
      localStorage.setItem(HIDDEN_KEY, value ? '1' : '0');
    } catch {
      // ignore
    }
  };

  if (hidden) {
    return (
      <button className="buddy-tab" onClick={() => setHiddenSaved(false)} aria-label={t('buddy.show')}>
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path
            d="M12 21s-7.5-4.6-9.6-9.3C.9 8.2 3 4.5 6.6 4.5c2.1 0 3.6 1.2 5.4 3.1 1.8-1.9 3.3-3.1 5.4-3.1 3.6 0 5.7 3.7 4.2 7.2C19.5 16.4 12 21 12 21z"
            fill="var(--pink)"
          />
        </svg>
      </button>
    );
  }

  return (
    <div className="buddy">
      {line && (
        <div className="buddy-bubble" role="status">
          <p>{line}</p>
          <button className="buddy-hide link small" onClick={() => setHiddenSaved(true)}>
            {t('buddy.hide')}
          </button>
        </div>
      )}
      <button
        className={hop ? 'buddy-doki hop' : 'buddy-doki'}
        onClick={() => {
          setHop(true);
          sayNext();
        }}
        onAnimationEnd={() => setHop(false)}
        aria-label={t('buddy.talk')}
      >
        <Heart3D skipBirth talking={talking} />
      </button>
    </div>
  );
}
