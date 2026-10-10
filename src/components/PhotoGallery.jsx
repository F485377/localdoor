import { useEffect, useState } from 'react';
import { useI18n } from '../i18n/index.jsx';

// お店の写真。「すべて・料理・内装」で切り替えられ、タップすると画面いっぱいに大きく見られる
const TABS = [
  { id: 'all', emoji: '📷' },
  { id: 'food', emoji: '🍽️' },
  { id: 'interior', emoji: '🪑' },
];

export default function PhotoGallery({ photos }) {
  const { t } = useI18n();
  const [tab, setTab] = useState('all');
  const [open, setOpen] = useState(null); // 大きく表示している写真の番号
  const shown = tab === 'all' ? photos : photos.filter((p) => p.kind === tab);

  useEffect(() => {
    if (open == null) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(null);
      if (e.key === 'ArrowRight') setOpen((i) => (i + 1) % shown.length);
      if (e.key === 'ArrowLeft') setOpen((i) => (i - 1 + shown.length) % shown.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, shown.length]);

  if (!photos.length) {
    return <p className="photos-empty small">{t('photos.empty')}</p>;
  }

  return (
    <div className="gallery">
      <div className="chips gallery-tabs">
        {TABS.map((tb) => {
          const count = tb.id === 'all' ? photos.length : photos.filter((p) => p.kind === tb.id).length;
          return (
            <button
              key={tb.id}
              type="button"
              className={tab === tb.id ? 'chip active' : 'chip'}
              aria-pressed={tab === tb.id}
              onClick={() => setTab(tb.id)}
            >
              <span aria-hidden="true">{tb.emoji}</span> {t(`photos.${tb.id}`)} {count}
            </button>
          );
        })}
      </div>
      {shown.length === 0 ? (
        <p className="photos-empty small">{t('photos.noneOfKind')}</p>
      ) : (
        <div className="gallery-strip">
          {shown.map((p, i) => (
            <button key={p.id} type="button" className="gallery-thumb" onClick={() => setOpen(i)}>
              <img src={p.url} alt={t(`photos.${p.kind}`)} loading="lazy" />
            </button>
          ))}
        </div>
      )}

      {open != null && shown[open] && (
        <div className="lightbox" role="dialog" aria-modal="true" onClick={() => setOpen(null)}>
          <img src={shown[open].url} alt={t(`photos.${shown[open].kind}`)} onClick={(e) => e.stopPropagation()} />
          <button type="button" className="lightbox-close" onClick={() => setOpen(null)} aria-label={t('close')}>
            ×
          </button>
          {shown.length > 1 && (
            <>
              <button
                type="button"
                className="lightbox-nav prev"
                aria-label="Previous"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen((open - 1 + shown.length) % shown.length);
                }}
              >
                ‹
              </button>
              <button
                type="button"
                className="lightbox-nav next"
                aria-label="Next"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen((open + 1) % shown.length);
                }}
              >
                ›
              </button>
            </>
          )}
          <span className="lightbox-count">
            {open + 1} / {shown.length}
          </span>
        </div>
      )}
    </div>
  );
}
