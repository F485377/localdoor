import { useMemo, useState } from 'react';
import { countryName } from '../format.js';

// ISO 3166-1 の国・地域コード（表示名はブラウザが各言語に訳す）
const CODES = (
  'AD AE AF AG AI AL AM AO AR AS AT AU AW AZ BA BB BD BE BF BG BH BI BJ BM BN BO BR BS BT BW BY BZ CA CD CF CG ' +
  'CH CI CK CL CM CN CO CR CU CV CW CY CZ DE DJ DK DM DO DZ EC EE EG ER ES ET FI FJ FM FO FR GA GB GD GE GH GI ' +
  'GL GM GN GQ GR GT GU GW GY HK HN HR HT HU ID IE IL IN IQ IR IS IT JM JO JP KE KG KH KI KM KN KP KR KW KY KZ ' +
  'LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MG MH MK ML MM MN MO MR MT MU MV MW MX MY MZ NA NC NE NG NI NL ' +
  'NO NP NR NZ OM PA PE PF PG PH PK PL PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SI SK SL SM SN SO SR ' +
  'SS ST SV SX SY SZ TC TD TG TH TJ TL TM TN TO TR TT TV TW TZ UA UG US UY UZ VA VC VE VG VI VN VU WS XK YE ZA ZM ZW'
).split(' ');

// 小文字にし、アクセント記号を外し、ひらがなをカタカナにそろえる（「たい」→「タイ」）
const norm = (s) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u3041-\u3096]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) + 0x60))
    .normalize('NFKC');

// 日本語で国名が漢字の国は、ひらがなで打っても見つかるように読みを足す
const JA_READINGS = {
  JP: ['にほん', 'にっぽん'],
  CN: ['ちゅうごく'],
  KR: ['かんこく'],
  KP: ['きたちょうせん'],
  TW: ['たいわん'],
  HK: ['ほんこん'],
  US: ['べいこく'],
  GB: ['えいこく'],
};

// 入力した文字で国を予測して、候補を最大 limit 件出す。
// 表示中の言語の国名・英語名・国コードのどれでも探せる（「jap」「日本」「JP」→ 日本）
export default function CountryInput({ lang, value, onChange, placeholder, limit = 6 }) {
  const [text, setText] = useState(value ? countryName(value, lang) : '');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const countries = useMemo(
    () =>
      CODES.map((code) => {
        const local = countryName(code, lang);
        const en = countryName(code, 'en');
        const readings = lang === 'ja' ? (JA_READINGS[code] ?? []).map(norm) : [];
        return { code, label: local, keys: [norm(local), norm(en), code.toLowerCase(), ...readings] };
      }),
    [lang],
  );

  const suggestions = useMemo(() => {
    const q = norm(text.trim());
    if (!q) return [];
    const scored = [];
    for (const c of countries) {
      // 先頭が一致するものを優先し、次に途中に含むもの
      const starts = c.keys.some((k) => k.startsWith(q) || k.split(/[\s-]+/).some((w) => w.startsWith(q)));
      const contains = !starts && c.keys.some((k) => k.includes(q));
      if (starts || contains) scored.push({ ...c, score: starts ? 0 : 1 });
    }
    return scored.sort((a, b) => a.score - b.score || a.label.localeCompare(b.label, lang)).slice(0, limit);
  }, [text, countries, lang, limit]);

  const choose = (c) => {
    setText(c.label);
    setOpen(false);
    onChange(c.code);
  };

  const onKeyDown = (e) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(suggestions[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="combo">
      <input
        id="ob-home"
        role="combobox"
        aria-expanded={open && suggestions.length > 0}
        aria-controls="country-options"
        aria-autocomplete="list"
        aria-activedescendant={open && suggestions[active] ? `country-${suggestions[active].code}` : undefined}
        autoComplete="off"
        autoFocus
        placeholder={placeholder}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setActive(0);
          setOpen(true);
          onChange('');
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={onKeyDown}
      />
      {open && suggestions.length > 0 && (
        <ul className="combo-list" id="country-options" role="listbox">
          {suggestions.map((c, i) => (
            <li
              key={c.code}
              id={`country-${c.code}`}
              role="option"
              aria-selected={i === active}
              className={i === active ? 'active' : ''}
              // タッチでもマウスでも、触れた瞬間に選ぶ（入力欄からフォーカスが外れて候補が閉じる前に）
              onPointerDown={(e) => {
                e.preventDefault();
                choose(c);
              }}
              onClick={() => choose(c)}
              onMouseEnter={() => setActive(i)}
            >
              <span>{c.label}</span>
              <span className="muted small">{c.code}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
