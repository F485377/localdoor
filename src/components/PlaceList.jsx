import { DualPrice } from '../currency.jsx';
import { useI18n } from '../i18n/index.jsx';
import { EMOJI } from '../emoji.js';
import { flag, formatPriceRange, placeNames, priceLevelLabel } from '../format.js';
import { localizePlace } from '../localize.js';
import Stars from './Stars.jsx';

export default function PlaceList({ places, status, onSelect }) {
  const { t, lang } = useI18n();

  if (status === 'loading' && places.length === 0) return <p className="muted pad">{t('loading')}</p>;
  if (status === 'error') return <p className="error pad">{t('error')}</p>;
  if (places.length === 0) return <p className="muted pad">{t('noResults')}</p>;

  return (
    <>
      <p className="result-count small muted">{t('resultCount', { count: places.length })}</p>
      <ul className="place-list">
        {places.map((raw) => {
          const p = localizePlace(raw, lang);
          const names = placeNames(p, lang);
          return (
            <li key={p.id}>
              <button className={p.photos?.[0] ? 'place-card has-thumb' : 'place-card'} onClick={() => onSelect(p.id)}>
                <div className="place-card-main">
                  <div className="place-card-head">
                    <strong>{names.primary}</strong>
                    <span className="badge">
                      {EMOJI[`category.${p.category}`]} {t(`category.${p.category}`)}
                    </span>
                  </div>
                  {names.secondary && <div className="muted small">{names.secondary}</div>}
                  <div className="small meta">
                    <span>
                      {flag(p.country)} {p.cityLabel}
                    </span>
                    {p.priceLevel && (
                      <span className="price-level">{priceLevelLabel(p.priceLevel, p.currency, lang)}</span>
                    )}
                    {p.cuisine?.length > 0 && <span className="muted">{p.cuisine.slice(0, 2).join(' · ')}</span>}
                    {p.rating ? (
                      <span>
                        <Stars value={p.rating} /> {p.rating.toFixed(1)} ({p.reviewCount})
                      </span>
                    ) : (
                      <span className="muted">{t('noRating')}</span>
                    )}
                  </div>
                  {formatPriceRange(p, lang) && (
                    <DualPrice className="small" min={p.priceMin} max={p.priceMax} currency={p.currency} />
                  )}
                  {p.openingHours && (
                    <div className="small muted">
                      {EMOJI.hours} {p.openingHours}
                    </div>
                  )}
                  <div className="tags">
                    {p.englishMenu && (
                      <span className="tag">
                        {EMOJI.englishMenu} {t('englishMenu')}
                      </span>
                    )}
                    {p.englishStaff && (
                      <span className="tag">
                        {EMOJI.englishStaff} {t('englishStaff')}
                      </span>
                    )}
                    {p.cardAccepted != null && (
                      <span className="tag">
                        {p.cardAccepted
                          ? `${EMOJI.cardAccepted} ${t('cardAccepted')}`
                          : `${EMOJI.cashOnly} ${t('cashOnly')}`}
                      </span>
                    )}
                    {p.vegetarian && (
                      <span className="tag">
                        {EMOJI.vegetarian} {t('vegetarian')}
                      </span>
                    )}
                    {p.halal && (
                      <span className="tag">
                        {EMOJI.halal} {t('halal')}
                      </span>
                    )}
                  </div>
                </div>
                {p.photos?.[0] && <img className="place-thumb" src={p.photos[0].url} alt="" loading="lazy" />}
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}
