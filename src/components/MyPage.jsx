import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { EMOJI } from '../emoji.js';
import { countryName, flag, placeNames } from '../format.js';
import { useI18n } from '../i18n/index.jsx';
import { placeCity } from '../localize.js';
import { useProfile } from '../profile.jsx';
import { clearHistory, loadHistory, removeHistory } from '../searchHistory.js';
import MapView from './MapView.jsx';
import Stars from './Stars.jsx';

// マイページ：プロフィール、自分が口コミした場所（地図）と口コミ、検索履歴
export default function MyPage({ onEditProfile, onOpenPlace, onSearch }) {
  const { t, lang } = useI18n();
  const { profile } = useProfile();
  const auth = useAuth();
  const [reviews, setReviews] = useState(null);
  const [error, setError] = useState(false);
  const [history, setHistory] = useState(loadHistory);

  useEffect(() => {
    api
      .listMyReviews()
      .then(setReviews)
      .catch(() => setError(true));
  }, [auth.user]);

  // 口コミしたお店（重ならないように1つずつ）。地図のピンに使う
  const places = reviews ? [...new Map(reviews.map((r) => [r.place.id, r.place])).values()] : [];
  const signedIn = auth.mode === 'firebase' && auth.user;

  return (
    <div className="mypage">
      <section className="profile-card">
        <div className="profile-head">
          <span className="profile-heart" aria-hidden="true">
            💗
          </span>
          <div>
            <h2>{profile?.name}</h2>
            <p className="small muted">
              {profile?.homeCountry && (
                <>
                  {flag(profile.homeCountry)} {countryName(profile.homeCountry, lang)}
                </>
              )}
              {profile?.destination && <> ✈️ {profile.destination}</>}
            </p>
          </div>
        </div>
        {profile?.diet?.length > 0 && (
          <div className="tags">
            {profile.diet.map((d) => (
              <span key={d} className="tag">
                {EMOJI[d]} {t(d)}
              </span>
            ))}
          </div>
        )}
        <p className="small">
          {signedIn ? (
            <>🔐 {t('auth.signedIn', { name: auth.user.name || auth.user.email || auth.user.phone || '' })}</>
          ) : (
            <span className="muted">🔓 {t('my.noAccount')}</span>
          )}
        </p>
        <div className="actions">
          <button className="button" onClick={onEditProfile}>
            ✏️ {t('editProfile')}
          </button>
          {signedIn && (
            <button className="link small" onClick={() => auth.logout()}>
              {t('my.logout')}
            </button>
          )}
        </div>
      </section>

      <section>
        <h3>
          {EMOJI.area} {t('my.places')}
        </h3>
        {places.length > 0 ? (
          <div className="my-map">
            <MapView places={places} selectedId={null} onSelect={onOpenPlace} />
          </div>
        ) : (
          <p className="muted small">{t('my.noPlaces')}</p>
        )}
      </section>

      <section>
        <h3>
          {EMOJI.reviews} {t('my.reviews')} {reviews?.length ? `(${reviews.length})` : ''}
        </h3>
        {error && <p className="error">{t('error')}</p>}
        {reviews?.length === 0 && <p className="muted small">{t('my.noReviews')}</p>}
        <ul className="my-reviews">
          {reviews?.map((r) => (
            <li key={r.id}>
              <button className="my-review" onClick={() => onOpenPlace(r.place.id)}>
                <span className="my-review-head">
                  <strong>{placeNames(r.place, lang).primary}</strong>
                  <span className="small muted">
                    {flag(r.place.country)} {placeCity(r.place, lang)}
                  </span>
                </span>
                <span className="small">
                  <Stars value={r.rating} />{' '}
                  <span className="muted">{new Date(r.createdAt).toLocaleDateString(lang)}</span>
                </span>
                <span className="my-review-text">{r.comment}</span>
                {r.photos?.length > 0 && (
                  <span className="review-photos">
                    {r.photos.map((ph) => (
                      <img key={ph.id} src={ph.url} alt={t(`photos.${ph.kind}`)} loading="lazy" />
                    ))}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3>🔍 {t('history.title')}</h3>
        {history.length === 0 ? (
          <p className="muted small">{t('history.empty')}</p>
        ) : (
          <>
            <div className="chips">
              {history.map((h) => (
                <span key={h} className="history-chip">
                  <button type="button" className="chip" onClick={() => onSearch(h)}>
                    🕘 {h}
                  </button>
                  <button
                    type="button"
                    className="history-remove"
                    aria-label={t('removeFilter', { name: h })}
                    onClick={() => setHistory(removeHistory(h))}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <button className="link small" onClick={() => setHistory(clearHistory())}>
              {t('history.clear')}
            </button>
          </>
        )}
      </section>
    </div>
  );
}
