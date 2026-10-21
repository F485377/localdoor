import { useRef, useState } from 'react';

// 写真のスライド：指で左右にスライドして何枚も見られる。今何枚目か（1 / 5）と点を出す。パソコンでは左右の矢印でも動かせる。
// photos は写真の URL。写真の代わりに絵を出すときは { key, node, caption, note } を渡す（note：「イメージ」など）
export default function PhotoCarousel({ photos, label = '' }) {
  const track = useRef(null);
  const [index, setIndex] = useState(0);
  if (!photos?.length) return null;

  const onScroll = () => {
    const el = track.current;
    if (el) setIndex(Math.round(el.scrollLeft / el.clientWidth));
  };
  const go = (i) => {
    const el = track.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
  };

  return (
    <div className="carousel" role="region" aria-roledescription="carousel" aria-label={label}>
      <div className="carousel-track" ref={track} onScroll={onScroll}>
        {photos.map((x, i) =>
          typeof x === 'string' ? (
            <img key={x} src={x} alt="" loading={i === 0 ? 'eager' : 'lazy'} draggable="false" />
          ) : (
            <figure key={x.key} className="carousel-art">
              {x.node}
              {(x.caption || x.note) && (
                <figcaption>
                  {x.caption && <b>{x.caption}</b>}
                  {x.note && <span>{x.note}</span>}
                </figcaption>
              )}
            </figure>
          ),
        )}
      </div>
      {photos.length > 1 && (
        <>
          <span className="carousel-count" aria-live="polite">
            {index + 1} / {photos.length}
          </span>
          <button type="button" className="carousel-arrow prev" aria-label="←" disabled={index === 0} onClick={() => go(index - 1)}>
            ‹
          </button>
          <button type="button" className="carousel-arrow next" aria-label="→" disabled={index >= photos.length - 1} onClick={() => go(index + 1)}>
            ›
          </button>
          <div className="carousel-dots" aria-hidden="true">
            {photos.map((x, i) => (
              <span key={typeof x === 'string' ? x : x.key} className={i === index ? 'on' : ''} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
