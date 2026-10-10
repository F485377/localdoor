import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { EMOJI } from '../emoji.js';
import { countryName } from '../format.js';
import { useI18n } from '../i18n/index.jsx';
import { shrinkImage } from '../photos.js';
import { useProfile } from '../profile.jsx';
import Stars from './Stars.jsx';

const MAX_PHOTOS = 4;

// 口コミの一覧と、口コミを書くフォーム（写真つき）。
// 投稿すると、お店の口コミ一覧のいちばん上に出て、そこまで画面が動く
export default function Reviews({ place, onPosted }) {
  const { t, lang } = useI18n();
  const { profile } = useProfile();
  const blank = () => ({
    author: profile?.name ?? '',
    country: profile?.homeCountry ? countryName(profile.homeCountry, 'en') : '',
    rating: 5,
    comment: '',
  });
  const [google, setGoogle] = useState(null);
  const [form, setForm] = useState(blank);
  const [picked, setPicked] = useState([]); // { file, preview, kind }
  const [state, setState] = useState('idle'); // idle | sending | done | error
  const [errorMsg, setErrorMsg] = useState('');
  const [justPosted, setJustPosted] = useState(null);
  const fileInput = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    api
      .getGoogleReviews(place.id, lang)
      .then(setGoogle)
      .catch(() => setGoogle(null));
  }, [place.id, lang]);

  // 投稿した口コミが一覧に出たら、そこまで動かす
  useEffect(() => {
    if (!justPosted) return;
    listRef.current?.querySelector(`[data-review="${justPosted}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [justPosted, place.reviews]);

  useEffect(() => () => picked.forEach((p) => URL.revokeObjectURL(p.preview)), [picked]);

  const pickFiles = (e) => {
    const files = [...e.target.files].slice(0, MAX_PHOTOS - picked.length);
    setPicked((list) => [
      ...list,
      ...files.map((file) => ({ file, preview: URL.createObjectURL(file), kind: 'food' })),
    ]);
    e.target.value = '';
  };

  const submit = async (e) => {
    e.preventDefault();
    setState('sending');
    setErrorMsg('');
    try {
      const review = await api.createReview({ ...form, placeId: place.id, rating: Number(form.rating) });
      // 写真は口コミができてから1枚ずつ送る。1枚失敗しても口コミは残る
      let failed = 0;
      for (const p of picked) {
        try {
          await api.uploadPhoto(review.id, p.kind, await shrinkImage(p.file));
        } catch {
          failed += 1;
        }
      }
      setForm(blank());
      setPicked([]);
      setJustPosted(review.id);
      setState(failed ? 'partial' : 'done');
      onPosted(review);
    } catch (err) {
      setErrorMsg(err.message);
      setState('error');
    }
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <section className="reviews">
      <h3>
        {EMOJI.reviews} {t('reviews')}
      </h3>
      {place.reviews.length === 0 && <p className="muted">{t('noReviews')}</p>}
      <ul className="review-list" ref={listRef}>
        {place.reviews.map((r) => (
          <li key={r.id} data-review={r.id} className={r.id === justPosted ? 'just-posted' : ''}>
            <div>
              <Stars value={r.rating} /> <strong>{r.author}</strong>
              {r.country && <span className="muted"> · {r.country}</span>}
              <span className="muted small"> · {new Date(r.createdAt).toLocaleDateString(lang)}</span>
            </div>
            <p>{r.comment}</p>
            {r.photos?.length > 0 && (
              <div className="review-photos">
                {r.photos.map((ph) => (
                  <img key={ph.id} src={ph.url} alt={t(`photos.${ph.kind}`)} loading="lazy" />
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>

      {google?.available && google.reviews.length > 0 && (
        <>
          <h3>
            {t('googleReviews')} {google.rating && <span className="small">({google.rating.toFixed(1)})</span>}
          </h3>
          <ul className="review-list">
            {google.reviews.map((r, i) => (
              <li key={i}>
                <div>
                  <Stars value={r.rating} /> <strong>{r.author}</strong>
                  <span className="muted"> · {r.relativeTime}</span>
                </div>
                <p>{r.text}</p>
              </li>
            ))}
          </ul>
        </>
      )}

      <h3>✏️ {t('writeReview')}</h3>
      <form className="form" onSubmit={submit}>
        <label>
          {t('yourName')}
          <input required maxLength={50} value={form.author} onChange={set('author')} />
        </label>
        <label>
          {t('country')}
          <input maxLength={50} value={form.country} onChange={set('country')} />
        </label>
        <label>
          {t('rating')}
          <select value={form.rating} onChange={set('rating')}>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {'★'.repeat(n)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t('comment')}
          <textarea required maxLength={1000} rows={3} value={form.comment} onChange={set('comment')} />
        </label>

        {/* 写真（料理・内装）。1枚ずつ、どちらの写真かを選ぶ */}
        <div className="photo-picker">
          <span className="photo-picker-label">📷 {t('photos.add', { max: MAX_PHOTOS })}</span>
          <div className="photo-picker-list">
            {picked.map((p, i) => (
              <div key={p.preview} className="picked">
                <img src={p.preview} alt="" />
                <div className="picked-kinds">
                  {['food', 'interior'].map((k) => (
                    <button
                      key={k}
                      type="button"
                      className={p.kind === k ? 'chip active' : 'chip'}
                      aria-pressed={p.kind === k}
                      onClick={() => setPicked((list) => list.map((x, j) => (j === i ? { ...x, kind: k } : x)))}
                    >
                      {k === 'food' ? '🍽️' : '🪑'} {t(`photos.${k}`)}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="picked-remove"
                  aria-label={t('photos.remove')}
                  onClick={() => setPicked((list) => list.filter((_, j) => j !== i))}
                >
                  ×
                </button>
              </div>
            ))}
            {picked.length < MAX_PHOTOS && (
              <button type="button" className="add-photo" onClick={() => fileInput.current?.click()}>
                <span aria-hidden="true">＋</span>
                {t('photos.choose')}
              </button>
            )}
          </div>
          <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={pickFiles} />
        </div>

        <button className="primary" disabled={state === 'sending'}>
          {state === 'sending' ? t('photos.sending') : t('submit')}
        </button>
        {state === 'done' && <p className="success">{t('thanksReview')}</p>}
        {state === 'partial' && <p className="error">{t('photos.someFailed')}</p>}
        {state === 'error' && <p className="error">{errorMsg || t('error')}</p>}
      </form>
    </section>
  );
}
