import { useEffect, useRef, useState } from 'react';
import { ALL_GENRES, BUDGET_STEP, BUDGET_TOP, CATEGORIES, DIET_SUPPORT, DISTANCES, GENRES, LOCAL_STEP, PAYMENT_METHODS, PETS, SMOKING, TIME_STEP, YEARS_STEP, YEARS_TOP } from '../../lib/domain.js';
import { formatYen } from '../currency.jsx';
import { useI18n } from '../i18n/index.jsx';
import { label } from '../labels.js';
import { Chips, Sheet } from '../ui.jsx';

// 絞り込み：「絞り込み」ボタン1つにまとめ、押すと条件の一覧の画面が出る。下の「この条件で検索」で決める。
// 条件はすべて URL のクエリ（検索結果の画面と同じ名前）
export const FILTER_PARAMS = ['sort', 'category', 'genre', 'bmin', 'bmax', 'tfrom', 'tto', 'sameday', 'lmin', 'lmax', 'ymin', 'ymax', 'pay', 'diet', 'distance', 'smoking', 'pets', 'room', 'perk'];
// 範囲の条件（上と下で1つと数える）
const PAIRS = { bmax: 'bmin', lmax: 'lmin', ymax: 'ymin', tto: 'tfrom' };

// 使っている条件の数（並び替えは数えない）
export const filterCount = (q) => new Set(FILTER_PARAMS.filter((k) => k !== 'sort' && q[k]).map((k) => PAIRS[k] ?? k)).size;

const TIMES = Array.from({ length: (24 * 60) / TIME_STEP }, (_, i) => `${String(Math.floor((i * TIME_STEP) / 60)).padStart(2, '0')}:${String((i * TIME_STEP) % 60).padStart(2, '0')}`);

// 条件の表示（0件のときの「この条件を外す」などに使う）
export function filterName(key, q, t, lang) {
  const range = (lo, hi, fmt, top) => `${fmt(Number(q[lo]) || 0)} – ${q[hi] ? fmt(Number(q[hi])) : top}`;
  switch (key) {
    case 'bmin':
      return range('bmin', 'bmax', (v) => formatYen(v, lang), t('f.noLimit'));
    case 'lmin':
      return `${t('f.localRange')} ${range('lmin', 'lmax', (v) => `${v}%`, '100%')}`;
    case 'ymin':
      return `${t('f.yearsRange')} ${range('ymin', 'ymax', (v) => t('f.yearsN', { n: v }), t('f.noLimit'))}`;
    case 'tfrom':
      return `${q.tfrom ?? '00:00'} – ${q.tto ?? '23:30'}`;
    case 'sameday':
      return t('f.samedayOnly');
    case 'pay':
      return String(q.pay ?? '')
        .split(',')
        .map((m) => label('paymentMethod', m, lang))
        .join(' / ');
    case 'category':
      return label('category', q.category, lang);
    case 'genre':
      return label('genre', q.genre, lang);
    case 'diet':
      return label('dietSupport', q.diet, lang);
    case 'distance':
      return t('f.within', { n: q.distance });
    case 'smoking':
      return label('smoking', q.smoking, lang);
    case 'pets':
      return label('pets', q.pets, lang);
    case 'room':
      return t('f.roomYes');
    case 'perk':
      return t('f.perkYes');
    default:
      return q[key];
  }
}

export default function FilterScreen({ open, q, onClose, onApply }) {
  const { t, lang } = useI18n();
  const pick = () => Object.fromEntries(FILTER_PARAMS.filter((k) => q[k]).map((k) => [k, q[k]]));
  const [d, setD] = useState(pick);
  // 開くたびに、今の条件から始める
  useEffect(() => {
    if (open) setD(pick());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const set = (patch) => setD((x) => Object.fromEntries(Object.entries({ ...x, ...patch }).filter(([, v]) => v != null && v !== '')));
  const one = (key) => (v) => set({ [key]: v });
  const opts = (group, values) => values.map((v) => ({ value: v, label: label(group, v, lang) }));
  const pays = d.pay ? d.pay.split(',') : [];
  const timeOn = Boolean(d.tfrom || d.tto);

  const footer = (
    <div className="btn-row filter-foot">
      <button type="button" className="btn" onClick={() => setD(d.sort ? { sort: d.sort } : {})}>
        {t('f.clearAll')}
      </button>
      <button type="button" className="btn primary" onClick={() => onApply(Object.fromEntries(FILTER_PARAMS.map((k) => [k, d[k] ?? null])))}>
        {t('f.searchWith')}
      </button>
    </div>
  );

  return (
    <Sheet open={open} onClose={onClose} title={t('f.filters')} closeLabel={t('close')} className="filter-sheet" footer={footer}>
      <Group title={t('f.sort')}>
        <Chips
          multi={false}
          label={t('f.sort')}
          options={[
            { value: 'default', label: t('f.sortDefault') },
            { value: 'rating', label: t('f.sortRating') },
          ]}
          value={d.sort ?? 'default'}
          onChange={(v) => set({ sort: v === 'rating' ? 'rating' : null })}
        />
      </Group>

      <Group title={t('f.category')}>
        <Chips multi={false} label={t('f.category')} options={opts('category', CATEGORIES)} value={d.category ?? null} onChange={(v) => set({ category: v, genre: v && d.genre && !GENRES[v]?.includes(d.genre) ? null : d.genre })} />
      </Group>

      <Group title={t('f.genre')}>
        <Chips multi={false} label={t('f.genre')} options={opts('genre', GENRES[d.category] ?? ALL_GENRES)} value={d.genre ?? null} onChange={one('genre')} />
      </Group>

      <Group title={t('f.budget')} note={t('f.budgetNote')}>
        <RangeBar
          min={0}
          max={BUDGET_TOP}
          step={BUDGET_STEP}
          lo={Number(d.bmin) || 0}
          hi={d.bmax ? Number(d.bmax) : BUDGET_TOP}
          format={(v) => formatYen(v, lang)}
          topLabel={t('f.noLimit')}
          label={t('f.budget')}
          onChange={(lo, hi) => set({ bmin: lo > 0 ? String(lo) : null, bmax: hi < BUDGET_TOP ? String(hi) : null })}
        />
      </Group>

      <Group title={t('f.timeRange')} note={t('f.timeNote')}>
        <Chips
          label={t('f.timeRange')}
          options={[
            { value: 'time', label: t('f.timeSet') },
            { value: 'sameday', label: t('f.samedayOnly') },
          ]}
          value={[...(timeOn ? ['time'] : []), ...(d.sameday ? ['sameday'] : [])]}
          onChange={(v) => set({ tfrom: v.includes('time') ? d.tfrom ?? '17:00' : null, tto: v.includes('time') ? d.tto ?? '20:00' : null, sameday: v.includes('sameday') ? '1' : null })}
        />
        {timeOn && (
          <div className="time-range">
            <TimeWheel label={t('f.from')} value={d.tfrom ?? '17:00'} onChange={(v) => set({ tfrom: v, tto: (d.tto ?? '20:00') < v ? v : d.tto })} />
            <span aria-hidden="true">〜</span>
            <TimeWheel label={t('f.to')} value={d.tto ?? '20:00'} onChange={(v) => set({ tto: v, tfrom: (d.tfrom ?? '17:00') > v ? v : d.tfrom })} />
          </div>
        )}
      </Group>

      <Group title={t('f.localRange')} note={t('f.localNote')}>
        <RangeBar
          min={0}
          max={100}
          step={LOCAL_STEP}
          lo={Number(d.lmin) || 0}
          hi={d.lmax ? Number(d.lmax) : 100}
          format={(v) => `${v}%`}
          label={t('f.localRange')}
          onChange={(lo, hi) => set({ lmin: lo > 0 ? String(lo) : null, lmax: hi < 100 ? String(hi) : null })}
        />
      </Group>

      <Group title={t('f.yearsRange')}>
        <RangeBar
          min={0}
          max={YEARS_TOP}
          step={YEARS_STEP}
          lo={Number(d.ymin) || 0}
          hi={d.ymax ? Number(d.ymax) : YEARS_TOP}
          format={(v) => t('f.yearsN', { n: v })}
          topLabel={t('f.noLimit')}
          label={t('f.yearsRange')}
          onChange={(lo, hi) => set({ ymin: lo > 0 ? String(lo) : null, ymax: hi < YEARS_TOP ? String(hi) : null })}
        />
      </Group>

      <Group title={t('f.pay')} note={t('f.payNote')}>
        <Chips label={t('f.pay')} options={opts('paymentMethod', PAYMENT_METHODS)} value={pays} onChange={(v) => set({ pay: PAYMENT_METHODS.filter((m) => v.includes(m)).join(',') || null })} />
      </Group>

      <Group title={t('f.diet')}>
        <Chips multi={false} label={t('f.diet')} options={opts('dietSupport', DIET_SUPPORT)} value={d.diet ?? null} onChange={one('diet')} />
      </Group>

      <Group title={t('f.distance')} note={t('f.stationNote')}>
        <Chips multi={false} label={t('f.distance')} options={DISTANCES.map((v) => ({ value: String(v), label: t('f.within', { n: v }) }))} value={d.distance ?? null} onChange={one('distance')} />
      </Group>

      <Group title={t('f.smoking')}>
        <Chips multi={false} label={t('f.smoking')} options={opts('smoking', SMOKING)} value={d.smoking ?? null} onChange={one('smoking')} />
      </Group>

      <Group title={t('f.pets')}>
        <Chips multi={false} label={t('f.pets')} options={opts('pets', PETS)} value={d.pets ?? null} onChange={one('pets')} />
      </Group>

      <Group title={t('f.more')}>
        <Chips
          label={t('f.more')}
          options={[
            { value: 'room', label: t('f.roomYes') },
            { value: 'perk', label: t('f.perkYes') },
          ]}
          value={[...(d.room ? ['room'] : []), ...(d.perk ? ['perk'] : [])]}
          onChange={(v) => set({ room: v.includes('room') ? '1' : null, perk: v.includes('perk') ? '1' : null })}
        />
      </Group>
    </Sheet>
  );
}

function Group({ title, note, children }) {
  return (
    <section className="filter-group">
      <h3>{title}</h3>
      {children}
      {note && <p className="small muted">{note}</p>}
    </section>
  );
}

// つまみが2つのバー（下限〜上限）。上の端に topLabel があれば「上限なし」として出す
export function RangeBar({ min, max, step, lo, hi, format, topLabel, label: name, onChange }) {
  const pct = (v) => `${((v - min) / (max - min)) * 100}%`;
  return (
    <div className="range-bar">
      <p className="range-value" aria-live="polite">
        {format(lo)} – {hi >= max && topLabel ? topLabel : format(hi)}
      </p>
      <div className="dual-range">
        <div className="dual-track" />
        <div className="dual-fill" style={{ left: pct(lo), right: `calc(100% - ${pct(hi)})` }} />
        <input type="range" min={min} max={max} step={step} value={lo} aria-label={`${name} min`} onChange={(e) => onChange(Math.min(Number(e.target.value), hi - step), hi)} />
        <input type="range" min={min} max={max} step={step} value={hi} aria-label={`${name} max`} onChange={(e) => onChange(lo, Math.max(Number(e.target.value), lo + step))} />
      </div>
      <div className="dual-scale small muted">
        <span>{format(min)}</span>
        <span>{topLabel ?? format(max)}</span>
      </div>
    </div>
  );
}

// 時刻をスクロールで選ぶ（真ん中の行が選んだ時刻）
const ROW = 40;
function TimeWheel({ label: name, value, onChange }) {
  const ref = useRef(null);
  const timer = useRef(null);
  const index = Math.max(0, TIMES.indexOf(value));
  useEffect(() => {
    const el = ref.current;
    if (el && Math.round(el.scrollTop / ROW) !== index) el.scrollTop = index * ROW;
  }, [index]);
  const onScroll = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      const i = Math.min(TIMES.length - 1, Math.max(0, Math.round(el.scrollTop / ROW)));
      if (TIMES[i] !== value) onChange(TIMES[i]);
    }, 120);
  };
  return (
    <div className="wheel-wrap">
      <span className="small muted">{name}</span>
      <div className="wheel" ref={ref} onScroll={onScroll} role="listbox" aria-label={name} tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && index < TIMES.length - 1) (e.preventDefault(), onChange(TIMES[index + 1]));
          if (e.key === 'ArrowUp' && index > 0) (e.preventDefault(), onChange(TIMES[index - 1]));
        }}
      >
        {TIMES.map((x, i) => (
          <div key={x} role="option" aria-selected={i === index} className={i === index ? 'wheel-item on' : 'wheel-item'} onClick={() => onChange(x)}>
            {x}
          </div>
        ))}
      </div>
    </div>
  );
}
