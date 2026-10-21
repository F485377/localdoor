import { useEffect, useMemo, useState } from 'react';
import { PREFS, REGIONS, prefOf } from '../../lib/japan.js';
import { loadCities, loadJapanMap } from '../cities.js';
import { useI18n } from '../i18n/index.jsx';
import { cityName, prefName, regionName } from '../labels.js';

// 日本列島のイラストから、地方 → 都道府県 → 市区町村 の順に選ぶ。
//   value: { pref, city }（city は市区町村の id）。onChange({ pref, city })
//   ja: 事業者画面（日本語）。allowAll: 旅行者画面（「日本全国」「○○県全部」を選べる）
const JA = { all: '日本全国', allPref: '{pref}全部', tapRegion: '地図で地方をタップしてください', choosePref: '都道府県を選んでください', chooseCity: '市区町村を選んでください', filter: '絞り込む', japan: '日本', loading: '地図を読み込み中…' };
const COLORS = { hokkaido: '#ffd6dc', tohoku: '#ffe4c7', kanto: '#fff1b8', chubu: '#dff3cf', kinki: '#cfe9f7', chugoku: '#e2dcf5', shikoku: '#f5d9ec', kyushu: '#d6efe7' };

export default function JapanPicker({ value, onChange, ja = false, allowAll = false }) {
  const i18n = useI18n();
  const lang = ja ? 'ja' : i18n.lang;
  const t = (k, vars) => {
    let s = ja ? JA[k] : i18n.t(`jp.${k}`);
    if (vars) for (const [key, v] of Object.entries(vars)) s = s.replaceAll(`{${key}}`, v);
    return s;
  };
  const [map, setMap] = useState(null);
  const [cities, setCities] = useState(null);
  const [error, setError] = useState(false);
  const [region, setRegion] = useState(() => prefOf(value?.pref)?.region ?? null);
  const [step, setStep] = useState(() => (value?.city ? 'city' : value?.pref ? 'city' : 'japan'));
  const [filter, setFilter] = useState('');

  useEffect(() => {
    loadJapanMap().then(setMap).catch(() => setError(true));
  }, []);
  useEffect(() => {
    if (step === 'city') loadCities().then(setCities).catch(() => setError(true));
  }, [step]);

  const pref = value?.pref ?? null;
  const regionPrefs = region ? REGIONS.find((r) => r.id === region).prefs : [];

  // 表示する範囲：全国、または選んだ地方の都道府県だけ
  const viewBox = useMemo(() => {
    if (!map) return '0 0 100 100';
    if (step === 'japan' || !region) return map.view.join(' ');
    const boxes = regionPrefs.map((c) => map.shapes[c].box);
    const x0 = Math.min(...boxes.map((b) => b[0]));
    const y0 = Math.min(...boxes.map((b) => b[1]));
    const x1 = Math.max(...boxes.map((b) => b[2]));
    const y1 = Math.max(...boxes.map((b) => b[3]));
    const pad = Math.max(x1 - x0, y1 - y0) * 0.08;
    return `${x0 - pad} ${y0 - pad} ${x1 - x0 + pad * 2} ${y1 - y0 + pad * 2}`;
  }, [map, step, region, regionPrefs]);

  const choosePref = (code) => {
    onChange({ pref: code, city: null });
    setRegion(prefOf(code).region);
    setFilter('');
    setStep('city');
  };
  const tapShape = (code) => {
    const r = prefOf(code).region;
    if (step === 'japan' || r !== region) {
      setRegion(r);
      setStep('pref');
    } else choosePref(code);
  };

  const list = useMemo(() => {
    if (!cities || !pref) return [];
    const q = filter.trim().toLowerCase();
    return cities.filter((c) => c.pref === pref && (!q || c.ja.includes(q) || c.en.toLowerCase().includes(q) || c.ko.includes(q)));
  }, [cities, pref, filter]);

  const crumbs = [
    { label: t('japan'), go: () => (setStep('japan'), setRegion(null)) },
    region && { label: regionName(region, lang), go: () => setStep('pref') },
    pref && step === 'city' && { label: prefName(pref, lang) },
  ].filter(Boolean);

  return (
    <div className="jp-picker">
      <nav className="jp-crumbs" aria-label={t('japan')}>
        {crumbs.map((c, i) => (
          <span key={i}>
            {i > 0 && ' › '}
            {c.go && i < crumbs.length - 1 ? (
              <button type="button" className="link" onClick={c.go}>
                {c.label}
              </button>
            ) : (
              <b>{c.label}</b>
            )}
          </span>
        ))}
      </nav>

      {step !== 'city' && (
        <div className="jp-map">
          {!map && <p className="muted small center">{error ? '⚠' : t('loading')}</p>}
          {map && (
            <svg viewBox={viewBox} role="img" aria-label={t('tapRegion')}>
              {Object.entries(map.shapes).map(([code, s]) => {
                const p = prefOf(code);
                const dim = step === 'pref' && p.region !== region;
                return (
                  <path
                    key={code}
                    d={s.d}
                    fill={dim ? '#eeeeee' : COLORS[p.region]}
                    stroke={code === pref ? 'var(--primary)' : '#ffffff'}
                    strokeWidth={step === 'japan' ? 1.2 : 0.8}
                    className={dim ? '' : 'jp-shape'}
                    onClick={() => tapShape(code)}
                  >
                    <title>{prefName(code, lang)}</title>
                  </path>
                );
              })}
              {step === 'pref' &&
                regionPrefs.map((code) => {
                  const b = map.shapes[code].box;
                  return (
                    <text key={code} x={(b[0] + b[2]) / 2} y={(b[1] + b[3]) / 2} className="jp-label" textAnchor="middle" dominantBaseline="middle" onClick={() => choosePref(code)}>
                      {prefName(code, lang)}
                    </text>
                  );
                })}
            </svg>
          )}
        </div>
      )}

      {step === 'japan' && (
        <>
          <p className="small muted">{t('tapRegion')}</p>
          <div className="chips">
            {allowAll && (
              <button type="button" className={!pref ? 'chip on' : 'chip'} aria-pressed={!pref} onClick={() => onChange({ pref: null, city: null })}>
                {t('all')}
              </button>
            )}
            {REGIONS.map((r) => (
              <button key={r.id} type="button" className="chip" onClick={() => (setRegion(r.id), setStep('pref'))}>
                {regionName(r.id, lang)}
              </button>
            ))}
          </div>
        </>
      )}

      {step === 'pref' && (
        <>
          <p className="small muted">{t('choosePref')}</p>
          <div className="chips">
            {regionPrefs.map((code) => (
              <button key={code} type="button" className={pref === code ? 'chip on' : 'chip'} aria-pressed={pref === code} onClick={() => choosePref(code)}>
                {prefName(code, lang)}
              </button>
            ))}
          </div>
        </>
      )}

      {step === 'city' && pref && (
        <>
          <p className="small muted" style={{ margin: '8px 0' }}>
            {t('chooseCity')}
          </p>
          <input className="input" type="search" placeholder={t('filter')} value={filter} onChange={(e) => setFilter(e.target.value)} aria-label={t('filter')} />
          <div className="jp-cities" role="listbox" aria-label={t('chooseCity')}>
            {allowAll && (
              <button type="button" role="option" aria-selected={!value?.city} className={!value?.city ? 'jp-city on' : 'jp-city'} onClick={() => onChange({ pref, city: null })}>
                {t('allPref', { pref: prefName(pref, lang) })}
              </button>
            )}
            {!cities && !error && <p className="muted small">{t('loading')}</p>}
            {list.map((c) => (
              <button key={c.id} type="button" role="option" aria-selected={value?.city === c.id} className={value?.city === c.id ? 'jp-city on' : 'jp-city'} onClick={() => onChange({ pref, city: c.id })}>
                {cityName(c, lang)}
                {(lang === 'en' || lang === 'ko') && (
                  <span className="muted small" lang="ja">
                    {' '}
                    {c.ja}
                  </span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
      {error && <p className="error small">⚠ {ja ? '地図のデータを読み込めませんでした。通信を確かめて、開き直してください。' : i18n.t('err.network')}</p>}
    </div>
  );
}

// 選んだ市区町村の情報（名前・中心の位置）。一覧を読み込んでから返す
export function useCity(id) {
  const [city, setCity] = useState(null);
  useEffect(() => {
    if (!id) return setCity(null);
    let alive = true;
    loadCities()
      .then((list) => alive && setCity(list.find((c) => c.id === id) ?? null))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [id]);
  return city;
}

export { PREFS };
