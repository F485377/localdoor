import { useEffect, useRef, useState } from 'react';
import { CATEGORIES, MIN_RATINGS, PRICE_LEVELS } from '../../lib/placeFilters.js';
import { DualPrice } from '../currency.jsx';
import { flag, priceLevelLabel } from '../format.js';
import { EMOJI } from '../emoji.js';
import { useI18n } from '../i18n/index.jsx';
import { cityLabel } from '../localize.js';
import { addHistory, loadHistory, removeHistory } from '../searchHistory.js';

const SERVICES = ['englishMenu', 'englishStaff', 'cardAccepted'];
const DIETS = ['vegetarian', 'halal'];

export const EMPTY_FILTERS = { q: '', cities: [], categories: [], priceLevels: [], features: [], minRating: 0 };

export const countActive = (f) =>
  f.cities.length + f.categories.length + f.priceLevels.length + f.features.length + (f.minRating ? 1 : 0);

const toggle = (list, value) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

function Section({ title, emoji, children }) {
  return (
    <fieldset className="sheet-section">
      <legend>
        <span aria-hidden="true">{emoji}</span> {title}
      </legend>
      <div className="chips">{children}</div>
    </fieldset>
  );
}

function Chip({ on, onClick, emoji, children }) {
  return (
    <button type="button" className={on ? 'chip active' : 'chip'} aria-pressed={on} onClick={onClick}>
      {emoji && (
        <span className="chip-emoji" aria-hidden="true">
          {emoji}
        </span>
      )}
      {children}
    </button>
  );
}

// 検索欄（横いっぱい）＋ その下に「フィルター」ボタンと選択中の条件チップ
export function FilterBar({ filters, onChange, onOpen, cities, priceCurrency }) {
  const { t, lang } = useI18n();
  const n = countActive(filters);
  const [focused, setFocused] = useState(false);
  const [history, setHistory] = useState(loadHistory);

  // 打ち終わって1.5秒たったら、検索を履歴に残す（途中まで打った文字は残さない）
  useEffect(() => {
    if (filters.q.trim().length < 2) return undefined;
    const timer = setTimeout(() => setHistory(addHistory(filters.q)), 1500);
    return () => clearTimeout(timer);
  }, [filters.q]);

  // 入力中の文字で、履歴をしぼって出す
  const suggestions = history.filter(
    (h) => h.toLowerCase().includes(filters.q.trim().toLowerCase()) && h !== filters.q,
  );
  const cityOf = (name) => cities.find((c) => c.name === name) ?? { name };

  // 選択中の条件を、外せるチップとして並べる
  const active = [
    ...filters.cities.map((c) => ({
      label: `${flag(cityOf(c).country)} ${cityLabel(cityOf(c), lang)}`,
      remove: { cities: toggle(filters.cities, c) },
    })),
    ...filters.categories.map((c) => ({
      label: `${EMOJI[`category.${c}`]} ${t(`category.${c}`)}`,
      remove: { categories: toggle(filters.categories, c) },
    })),
    ...filters.priceLevels.map((l) => ({
      label: priceLevelLabel(l, priceCurrency, lang),
      remove: { priceLevels: toggle(filters.priceLevels, l) },
    })),
    ...(filters.minRating ? [{ label: t('ratingAtLeast', { n: filters.minRating }), remove: { minRating: 0 } }] : []),
    ...filters.features.map((f) => ({
      label: `${EMOJI[f]} ${t(f)}`,
      remove: { features: toggle(filters.features, f) },
    })),
  ];

  return (
    <div className="filter-bar">
      <div className="search-wrap">
        <input
          id="search"
          type="search"
          className="search"
          placeholder={`🔍 ${t('searchPlaceholder')}`}
          value={filters.q}
          autoComplete="off"
          onChange={(e) => onChange({ ...filters, q: e.target.value })}
          onFocus={() => {
            setHistory(loadHistory());
            setFocused(true);
          }}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              setHistory(addHistory(filters.q));
              e.currentTarget.blur();
            }
          }}
        />
        {focused && suggestions.length > 0 && (
          <ul className="history-list" aria-label={t('history.title')}>
            {suggestions.slice(0, 6).map((h) => (
              <li key={h}>
                <button
                  type="button"
                  className="history-item"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    onChange({ ...filters, q: h });
                    setHistory(addHistory(h));
                    setFocused(false);
                  }}
                >
                  🕘 {h}
                </button>
                <button
                  type="button"
                  className="history-remove"
                  aria-label={t('removeFilter', { name: h })}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    setHistory(removeHistory(h));
                  }}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="chips active-chips">
        <button className={n ? 'filter-button on' : 'filter-button'} onClick={onOpen}>
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path
              d="M3 5h18l-7 8v6l-4-2v-4z"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </svg>
          {t('filters')}
          {n > 0 && <span className="count">{n}</span>}
        </button>
        {active.map((a) => (
          <button
            key={a.label}
            className="chip active removable"
            onClick={() => onChange({ ...filters, ...a.remove })}
            aria-label={t('removeFilter', { name: a.label })}
          >
            {a.label} <span aria-hidden="true">×</span>
          </button>
        ))}
        {active.length > 0 && (
          <button className="link small" onClick={() => onChange({ ...EMPTY_FILTERS, q: filters.q })}>
            {t('clearAll')}
          </button>
        )}
      </div>
    </div>
  );
}

// 条件を選ぶパネル。選ぶたびに結果がすぐ変わり、件数がボタンに出る
export function FilterSheet({
  open,
  filters,
  onChange,
  onClose,
  cities,
  priceCurrency,
  levelRanges = {},
  resultCount,
}) {
  const { t, lang } = useI18n();
  const panelRef = useRef(null);
  const set = (patch) => onChange({ ...filters, ...patch });

  useEffect(() => {
    if (!open) return undefined;
    panelRef.current?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={t('filters')}
        tabIndex={-1}
        ref={panelRef}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-head">
          <h2>{t('filters')}</h2>
          <button className="icon-button" onClick={onClose} aria-label={t('close')}>
            ×
          </button>
        </div>

        <div className="sheet-body">
          <Section title={t('area')} emoji={EMOJI.area}>
            {cities.map((c) => (
              <Chip
                key={c.name}
                emoji={flag(c.country)}
                on={filters.cities.includes(c.name)}
                onClick={() => set({ cities: toggle(filters.cities, c.name) })}
              >
                {cityLabel(c, lang)}
              </Chip>
            ))}
          </Section>
          <Section title={t('category')} emoji={EMOJI.category}>
            {CATEGORIES.map((c) => (
              <Chip
                key={c}
                emoji={EMOJI[`category.${c}`]}
                on={filters.categories.includes(c)}
                onClick={() => set({ categories: toggle(filters.categories, c) })}
              >
                {t(`category.${c}`)}
              </Chip>
            ))}
          </Section>
          <Section title={t('price')} emoji={EMOJI.price}>
            {PRICE_LEVELS.map((l) => (
              <Chip
                key={l}
                on={filters.priceLevels.includes(l)}
                onClick={() => set({ priceLevels: toggle(filters.priceLevels, l) })}
              >
                <span className="price-chip">
                  <span className="price-level">{priceLevelLabel(l, priceCurrency, lang)}</span>
                  {/* その国のお店の実際の値段の幅（上：その土地、下：自分の国） */}
                  {levelRanges[l] && (
                    <DualPrice min={levelRanges[l][0]} max={levelRanges[l][1]} currency={priceCurrency} />
                  )}
                </span>
              </Chip>
            ))}
          </Section>
          <Section title={t('rating')} emoji={EMOJI.rating}>
            <Chip on={!filters.minRating} onClick={() => set({ minRating: 0 })}>
              {t('any')}
            </Chip>
            {MIN_RATINGS.map((r) => (
              <Chip key={r} on={filters.minRating === r} onClick={() => set({ minRating: r })}>
                {t('ratingAtLeast', { n: r })}
              </Chip>
            ))}
          </Section>
          <Section title={t('services')} emoji={EMOJI.services}>
            {SERVICES.map((f) => (
              <Chip
                key={f}
                emoji={EMOJI[f]}
                on={filters.features.includes(f)}
                onClick={() => set({ features: toggle(filters.features, f) })}
              >
                {t(f)}
              </Chip>
            ))}
          </Section>
          <Section title={t('diet')} emoji={EMOJI.diet}>
            {DIETS.map((f) => (
              <Chip
                key={f}
                emoji={EMOJI[f]}
                on={filters.features.includes(f)}
                onClick={() => set({ features: toggle(filters.features, f) })}
              >
                {t(f)}
              </Chip>
            ))}
          </Section>
        </div>

        <div className="sheet-foot">
          <button className="link" onClick={() => onChange({ ...EMPTY_FILTERS, q: filters.q })}>
            {t('clearAll')}
          </button>
          <button className="primary" onClick={onClose}>
            {t('showResults', { count: resultCount })}
          </button>
        </div>
      </div>
    </div>
  );
}
