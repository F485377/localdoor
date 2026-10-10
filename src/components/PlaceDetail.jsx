import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { EMOJI } from '../emoji.js';
import { countryName, flag, formatPriceRange, placeNames, priceLevelLabel } from '../format.js';
import { DualPrice, RatesCredit } from '../currency.jsx';
import { useI18n } from '../i18n/index.jsx';
import { localizePlace } from '../localize.js';
import PhotoGallery from './PhotoGallery.jsx';
import ReservationForm from './ReservationForm.jsx';
import Reviews from './Reviews.jsx';
import Stars from './Stars.jsx';

function Info({ label, emoji, children }) {
  return (
    <div className="info">
      <div className="info-label">
        {emoji && (
          <span className="info-emoji" aria-hidden="true">
            {emoji}
          </span>
        )}
        {label}
      </div>
      <div>{children}</div>
    </div>
  );
}

export default function PlaceDetail({ id, onBack, onChanged }) {
  const { t, lang } = useI18n();
  const [raw, setPlace] = useState(null);
  const [error, setError] = useState(false);
  const [view, setView] = useState('info'); // info | reserve

  const load = useCallback(() => {
    setError(false);
    api
      .getPlace(id)
      .then(setPlace)
      .catch(() => setError(true));
  }, [id]);

  useEffect(() => {
    setPlace(null);
    setView('info');
    load();
  }, [load]);

  if (error) return <p className="error pad">{t('error')}</p>;
  if (!raw) return <p className="muted pad">{t('loading')}</p>;

  const place = localizePlace(raw, lang);

  const names = placeNames(place, lang);
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`;
  const list = (items) => (items.length ? items.join(', ') : t('none'));
  const price = formatPriceRange(place, lang);
  // 予約は、Haisai と提携していてデポジットが決まっているお店だけ
  const bookable = place.deposit != null;
  // わかっている項目だけ出す（null ＝ 不明は出さない）
  const known = [
    ['englishMenu', t('englishMenu')],
    ['englishStaff', t('englishStaff')],
    ['cardAccepted', place.cardAccepted === false ? t('cashOnly') : t('cardAccepted')],
    ['vegetarian', t('vegetarian')],
    ['halal', t('halal')],
  ].filter(([key]) => place[key] != null && !(place[key] === false && ['vegetarian', 'halal'].includes(key)));

  return (
    <div className="detail">
      <button className="link" onClick={view === 'reserve' ? () => setView('info') : onBack}>
        ← {t('back')}
      </button>
      <h2>{names.primary}</h2>
      {names.secondary && <div className="muted">{names.secondary}</div>}
      <div className="small muted">
        {flag(place.country)} {place.cityLabel}, {countryName(place.country, lang)}
      </div>
      <div className="small">
        {place.rating ? (
          <>
            <Stars value={place.rating} /> {place.rating.toFixed(1)} · {t('reviewsCount', { count: place.reviewCount })}
          </>
        ) : (
          <span className="muted">{t('noRating')}</span>
        )}
      </div>

      {view === 'reserve' ? (
        <ReservationForm place={place} />
      ) : (
        <>
          <PhotoGallery photos={place.photos ?? []} />
          {place.description && <p>{place.description}</p>}
          <div className="actions">
            {bookable && (
              <button className="primary" onClick={() => setView('reserve')}>
                {EMOJI.reserve} {t('reserve')}
              </button>
            )}
            <a className="button" href={directionsUrl} target="_blank" rel="noreferrer">
              {EMOJI.directions} {t('directions')}
            </a>
            {place.phone && (
              <a className="button" href={`tel:${place.phone.replace(/[^\d+]/g, '')}`}>
                {EMOJI.call} {t('call')}
              </a>
            )}
            {place.website && (
              <a className="button" href={place.website} target="_blank" rel="noreferrer">
                {EMOJI.website} {t('website')}
              </a>
            )}
          </div>
          {!bookable && <p className="small muted">{t('notBookable')}</p>}

          {(place.priceLevel || price) && (
            <Info label={t('price')} emoji={EMOJI.price}>
              {place.priceLevel && (
                <span className="price-level">{priceLevelLabel(place.priceLevel, place.currency, lang)}</span>
              )}
              {price && <DualPrice min={place.priceMin} max={place.priceMax} currency={place.currency} />}
              {price && <RatesCredit />}
            </Info>
          )}
          {place.cuisine?.length > 0 && (
            <Info label={t('cuisine')} emoji={EMOJI.cuisine}>
              {place.cuisine.join(', ')}
            </Info>
          )}
          {place.openingHours && (
            <Info label={t('hours')} emoji={EMOJI.hours}>
              {place.openingHours}
            </Info>
          )}
          {place.dressCode && (
            <Info label={t('dressCode')} emoji={EMOJI.dressCode}>
              {place.dressCode}
            </Info>
          )}
          {place.rules.length > 0 && (
            <Info label={t('rules')} emoji={EMOJI.rules}>
              <ul className="bullets">
                {place.rules.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </Info>
          )}
          {place.ingredients.length > 0 && (
            <Info label={t('ingredients')} emoji={EMOJI.ingredients}>
              {list(place.ingredients)}
            </Info>
          )}
          {(place.ingredients.length > 0 || place.allergens.length > 0) && (
            <Info label={t('allergens')} emoji={EMOJI.allergens}>
              {list(place.allergens)}
            </Info>
          )}
          {place.safetyNote && (
            <Info label={t('safety')} emoji={EMOJI.safety}>
              {place.safetyNote}
            </Info>
          )}
          {known.length > 0 && (
            <Info label={t('welcome')} emoji={EMOJI.welcome}>
              <div className="tags">
                {known.map(([key, label]) => (
                  // 現金のみのお店は 💴、それ以外はその項目の絵文字
                  <span key={key} className={place[key] ? 'tag ok' : key === 'cardAccepted' ? 'tag' : 'tag ng'}>
                    {key === 'cardAccepted' && place.cardAccepted === false ? EMOJI.cashOnly : EMOJI[key]} {label}
                  </span>
                ))}
              </div>
            </Info>
          )}
          {/* 服装・ルール・治安などが無いお店（OpenStreetMap から取り込んだお店など） */}
          {!place.dressCode && place.rules.length === 0 && !place.safetyNote && (
            <div className="missing-info small">{t('missingInfo')}</div>
          )}
          {/* 最新の口コミ（投稿するとすぐここに出る） */}
          {place.reviews.length > 0 && (
            <Info label={t('latestReview')} emoji={EMOJI.reviews}>
              <button
                type="button"
                className="latest-review"
                onClick={() => document.querySelector('.reviews')?.scrollIntoView({ behavior: 'smooth' })}
              >
                <span>
                  <Stars value={place.reviews[0].rating} /> <strong>{place.reviews[0].author}</strong>
                </span>
                <span className="latest-review-text">「{place.reviews[0].comment}」</span>
                <span className="small link">{t('seeAllReviews', { count: place.reviews.length })} ↓</span>
              </button>
            </Info>
          )}
          {place.address && (
            <div className="small muted">
              {EMOJI.address} {place.address}
            </div>
          )}
          {place.source === 'osm' && (
            <div className="small muted attribution">
              {t('osmSource')}{' '}
              <a href={`https://www.openstreetmap.org/${place.osmId}`} target="_blank" rel="noreferrer">
                © OpenStreetMap contributors
              </a>
            </div>
          )}

          <Reviews
            place={place}
            onPosted={() => {
              load();
              onChanged();
            }}
          />
        </>
      )}
    </div>
  );
}
