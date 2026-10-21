// お店・体験・ツアーの写真の代わりに表示する、フラットなイラスト（インラインSVG）。
// 名前や料理名のキーワードから「何の絵にするか」を決め、place.id から色や時間帯を決める（同じお店はいつも同じ絵）。
import { useId, useMemo } from 'react';

/* ───────── palette & helpers ───────── */
const C = {
  green: '#1f7a4d', wood: '#b9875a', woodD: '#8a5a35', cream: '#f4ecdc', char: '#22262b', sky: '#dbe9f6',
  red: '#d6453d', mustard: '#e3b23c', indigo: '#2b4a78', clay: '#c47a4b', leaf: '#5c9a55', skin: '#e8b48f',
  white: '#fbf8f1', roof: '#3b4249', stone: '#9a9184',
};
const rgb = (h) => {
  const x = h.length === 4 ? '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3] : h;
  return [1, 3, 5].map((i) => parseInt(x.slice(i, i + 2), 16));
};
const mix = (a, b, t) => {
  const B = rgb(b);
  return '#' + rgb(a).map((x, i) => Math.round(x + (B[i] - x) * t).toString(16).padStart(2, '0')).join('');
};
const R = (n) => Array.from({ length: n }, (_, i) => i);
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}
function rng(seed) {
  let a = seed || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pickOf = (r) => (arr) => arr[Math.floor(r() * arr.length)];

/* ───────── subject detection ───────── */
// [subject, strong keywords, weak keywords]. Strong matches anywhere win over weak ones.
const RULES = {
  restaurant: [
    ['veggie', /精進|ヴィーガン|ビーガン|ベジ|vegan|vegetarian/i],
    ['curry', /カレー|ハラール|curry|halal/i],
    ['ramen', /ラーメン|らーめん|拉麺|中華そば|つけ麺|担々麺|ramen/i],
    ['sushi', /寿司|鮨|すし|鮓|sushi/i],
    ['seafood', /海鮮|浜焼|魚河岸|海の幸|seafood/i],
    ['noodles', /蕎麦|そば|うどん|饂飩|soba|udon/i],
    ['okonomiyaki', /お好み焼|もんじゃ|鉄板焼|okonomiyaki/i],
    ['yakitori', /焼き鳥|焼鳥|やきとり|串|yakitori|kushi/i],
    ['grill', /ジンギスカン|焼肉|焼き肉|炉端|yakiniku|barbecue|bbq/i],
    ['izakaya', /居酒屋|酒処|酒場|バル|立ち飲み|立呑|izakaya/i],
    ['cafe', /喫茶|カフェ|珈琲|コーヒー|茶房|café|cafe|coffee/i],
    ['tea', /抹茶|茶店|茶屋|甘味|団子|だんご|tea/i],
    ['teishoku', /食堂|定食|郷土料理|おばんざい|御膳|diner/i],
    ['tempura', /天ぷら|天麩羅|天丼|tempura/i],
  ],
  experience: [
    ['tea', /抹茶|茶摘|茶道|茶園|茶室|tea/i, /茶/],
    ['pottery', /陶芸|焼き物|やきもの|陶|窯|ろくろ|pottery|ceramic|clay/i, /土/],
    ['indigo', /藍|indigo|dye/i, /染/],
    ['washi', /和紙|紙すき|紙漉|washi|paper/i],
    ['glass', /硝子|ガラス|glass/i],
    ['wood', /木工|箸づくり|箸作り|漆|木彫|woodwork/i],
    ['sake', /酒蔵|日本酒|蔵元|酒造|sake|brewery/i],
    ['sanshin', /三線|琉球|エイサー|sanshin/i],
    ['fishing', /釣り|漁|fishing/i, /船|海/],
    ['farm', /農|畑|田植|稲刈|収穫|果樹|みかん|いちご|苺|ぶどう|farm|harvest/i, /田/],
    ['cooking', /漬物|料理|和菓子|菓子|クッキング|そば打ち|寿司作り|cook|pickle|wagashi/i, /教室/],
  ],
  tour: [
    ['night', /屋台|夜|ナイト|はしご|飲み歩き|night|bar hop/i],
    ['market', /市場|朝市|マーケット|商店街|食べ歩き|market/i],
    ['harbor', /港|クルーズ|運河|harbor|harbour|cruise|canal/i, /船|海/],
    ['cycling', /サイクル|サイクリング|自転車|cycling|bike/i],
    ['train', /ローカル線|鉄道|列車|電車|トロッコ|train|railway/i],
    ['walk', /寺|神社|さんぽ|散歩|散策|参道|古都|町並み|walk|temple|shrine/i],
    ['nature', /山|森|滝|渓谷|ハイキング|トレッキング|湖|紅葉|桜|hike|trek/i, /川|花/],
  ],
};
const FALLBACK = { restaurant: 'teishoku', experience: 'craft', tour: 'nature' };

export function placeSubject(place) {
  const cat = RULES[place?.category] ? place.category : 'restaurant';
  const name = `${place?.name ?? ''} ${place?.i18n?.en?.name ?? ''}`;
  const dishes = (place?.dishes ?? []).map((d) => d?.name ?? '').join(' ');
  const found = [];
  for (const text of [name, dishes])
    for (const idx of [1, 2])
      for (const rule of RULES[cat]) if (rule[idx] && rule[idx].test(text) && !found.includes(rule[0])) found.push(rule[0]);
  return { cat, main: found[0] ?? FALLBACK[cat], second: found[1] };
}

export function artKinds(place) {
  return place?.category === 'experience' || place?.category === 'tour' ? ['main', 'activity', 'scene'] : ['main', 'food', 'inside'];
}

/* ───────── per-place variation ───────── */
const SKIES = {
  morning: ['#a9c9e9', '#fbe4cc'], day: ['#98c2ea', C.sky], dusk: ['#56649c', '#f2ad83'], night: ['#121a30', '#3b4170'],
};
function variant(place) {
  const r = rng(hash(String(place?.id ?? place?.name ?? 'place')));
  const pick = pickOf(r);
  const text = `${place?.name ?? ''} ${place?.i18n?.en?.name ?? ''}`;
  let tod = pick(['morning', 'day', 'day', 'dusk']);
  if (/朝|morning/i.test(text)) tod = 'morning';
  if (/夜|ナイト|屋台|night/i.test(text)) tod = 'night';
  return {
    tod,
    sky: SKIES[tod],
    noren: pick([C.green, C.indigo, C.red, C.char, '#7a3b2e', '#4b5d3a']),
    wall: pick([C.cream, '#efe3cf', '#e7ddd0', '#f1e6d6']),
    wall2: pick(['#d9cbb8', '#c9d3d8', '#d8c3b0', '#cfd6c4']),
    cafeWall: pick([C.green, '#a4573e', '#2e4a63', '#6b4a3a']),
    facade: pick(['two', 'two', 'low']),
    emblem: pick(['ring', 'diamond', 'wave', 'dots', 'flower', 'fan']),
    accent: pick([C.red, C.mustard, C.green, C.indigo]),
    table: pick(['#d8b388', '#c99d6e', '#e3c9a0', '#a87a52']),
    bowl: pick(['black', 'white', 'red']),
    broth: pick(['#c98543', '#e9cf9e', '#d39a4f']),
    glaze: pick(['#6b8f7a', '#7a5338', '#3e4f6b', '#a8b49a', '#8c3f2e']),
    flag: pick([C.red, C.mustard, C.green, '#3d7ac2']),
    garnish: r(),
    deer: /奈良|鹿(?!児島)|nara/i.test(`${text} ${place?.area ?? ''}`),
    okinawa: /沖縄|那覇|石垣|宮古|琉球|okinawa/i.test(`${text} ${place?.area ?? ''}`),
  };
}

/* ───────── shared defs ───────── */
function Defs({ u, v }) {
  const lg = (id, a, b, x2 = 0, y2 = 1) => (
    <linearGradient id={u + id} x1="0" y1="0" x2={x2} y2={y2}>
      <stop offset="0" stopColor={a} />
      <stop offset="1" stopColor={b} />
    </linearGradient>
  );
  return (
    <defs>
      {lg('sky', v.sky[0], v.sky[1])}
      {lg('wall', mix(v.wall, '#fff', 0.3), mix(v.wall, C.char, 0.08))}
      {lg('wood', mix(C.wood, '#fff', 0.05), mix(C.wood, C.woodD, 0.6), 1, 1)}
      {lg('table', mix(v.table, '#fff', 0.12), mix(v.table, C.woodD, 0.35), 1, 1)}
      {lg('ground', '#ddd4c4', '#b8ad9b')}
      {lg('sea', '#77acd4', '#2f6491')}
      {lg('inside', '#f7d79c', '#d9904f')}
      {lg('tatami', '#d6c98a', '#b3a464')}
      {lg('grass', '#9cc47e', '#5f9a55')}
      {lg('steel', '#4a4f56', '#2a2d32', 1, 1)}
      <radialGradient id={u + 'glow'}>
        <stop offset="0" stopColor="#ffd98a" stopOpacity="0.85" />
        <stop offset="1" stopColor="#ffd98a" stopOpacity="0" />
      </radialGradient>
      <radialGradient id={u + 'light'} cx="0.2" cy="0.1" r="0.95">
        <stop offset="0" stopColor="#fff" stopOpacity="0.32" />
        <stop offset="1" stopColor="#fff" stopOpacity="0" />
      </radialGradient>
      <radialGradient id={u + 'vig'} cx="0.5" cy="0.45" r="0.8">
        <stop offset="0.6" stopColor="#000" stopOpacity="0" />
        <stop offset="1" stopColor="#000" stopOpacity="0.2" />
      </radialGradient>
      <radialGradient id={u + 'soft'}>
        <stop offset="0" stopColor={C.char} stopOpacity="0.3" />
        <stop offset="1" stopColor={C.char} stopOpacity="0" />
      </radialGradient>
    </defs>
  );
}

/* ───────── small building blocks ───────── */
const Shadow = ({ cx, cy, rx, ry, o = 1, u }) => <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={`url(#${u}soft)`} opacity={o} />;
const Glow = ({ x, y, r, u, o = 1 }) => <circle cx={x} cy={y} r={r} fill={`url(#${u}glow)`} opacity={o} />;

function Sky({ u, v, r }) {
  const night = v.tod === 'night';
  const sun = { morning: [318, 92, 20, '#fff4dc'], day: [325, 58, 17, '#fffaf0'], dusk: [300, 128, 26, '#ffd29a'], night: [318, 56, 13, '#f4ecdc'] }[v.tod];
  return (
    <g>
      <rect width="400" height="300" fill={`url(#${u}sky)`} />
      {night && R(22).map((i) => <circle key={i} cx={(i * 67 + 13) % 400} cy={(i * 37) % 140} r={i % 3 ? 0.8 : 1.3} fill="#fff" opacity={0.4 + (i % 4) * 0.12} />)}
      <circle cx={sun[0]} cy={sun[1]} r={sun[2] * 2.6} fill={sun[3]} opacity={night ? 0.08 : 0.25} />
      <circle cx={sun[0]} cy={sun[1]} r={sun[2]} fill={sun[3]} />
      {night && <circle cx={sun[0] + 5} cy={sun[1] - 3} r={sun[2] * 0.85} fill={v.sky[0]} />}
      {!night && <Cloud x={60 + r() * 60} y={48 + r() * 20} s={0.9 + r() * 0.3} o={v.tod === 'dusk' ? 0.35 : 0.75} />}
      {!night && <Cloud x={220 + r() * 50} y={30 + r() * 20} s={0.6 + r() * 0.2} o={v.tod === 'dusk' ? 0.3 : 0.6} />}
    </g>
  );
}
const Cloud = ({ x, y, s = 1, o = 0.7 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} fill="#fff" opacity={o}>
    <rect x="-38" y="-6" width="80" height="14" rx="7" />
    <circle cx="-12" cy="-8" r="12" />
    <circle cx="10" cy="-12" r="15" />
  </g>
);
// darken outdoor scenes for dusk / night; draw lit things after this
const Tint = ({ v }) =>
  v.tod === 'night' ? <rect width="400" height="300" fill="#0d1530" opacity="0.5" /> : v.tod === 'dusk' ? <rect width="400" height="300" fill="#4a3a6a" opacity="0.16" /> : null;
const Vignette = ({ u }) => <rect width="400" height="300" fill={`url(#${u}vig)`} />;

const Mountains = ({ y = 170, c1 = '#a9bccd', c2 = '#8aa3b8', snow }) => (
  <g>
    <path d={`M0 ${y} L0 ${y - 40} Q40 ${y - 70} 80 ${y - 50} Q130 ${y - 100} 190 ${y - 60} Q240 ${y - 30} 290 ${y - 70} Q350 ${y - 105} 400 ${y - 55} L400 ${y} Z`} fill={c1} />
    {snow && <path d={`M330 ${y - 93} Q350 ${y - 105} 368 ${y - 90} L358 ${y - 86} L348 ${y - 92} L338 ${y - 86} Z`} fill="#fff" opacity="0.85" />}
    <path d={`M0 ${y} L0 ${y - 22} Q60 ${y - 48} 120 ${y - 28} Q180 ${y - 10} 230 ${y - 34} Q300 ${y - 58} 400 ${y - 25} L400 ${y} Z`} fill={c2} />
  </g>
);

function Tree({ x, y, s = 1, c = C.leaf, pine }) {
  if (pine)
    return (
      <g transform={`translate(${x} ${y}) scale(${s})`}>
        <path d="M-3 0 Q-6 -30 4 -55 L8 -54 Q0 -30 4 0 Z" fill={C.woodD} />
        {[[-14, -50, 22], [14, -60, 20], [-4, -76, 18], [6, -38, 16]].map(([a, b, w], i) => (
          <ellipse key={i} cx={a} cy={b} rx={w} ry={w * 0.42} fill={i % 2 ? mix(c, '#000', 0.15) : c} />
        ))}
      </g>
    );
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-3" y="-30" width="6" height="30" rx="2" fill={C.woodD} />
      <circle cx="0" cy="-48" r="24" fill={mix(c, '#000', 0.12)} />
      <circle cx="-9" cy="-44" r="16" fill={c} />
      <circle cx="4" cy="-58" r="15" fill={c} />
      <circle cx="-8" cy="-58" r="7" fill="#fff" opacity="0.15" />
    </g>
  );
}

function Person({ x, y, s = 1, shirt = C.green, pants = C.char, skin = C.skin, hair = '#2b241f', back, apron, band, hat, cap, flag, bag }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="2" cy="0" rx="17" ry="3.5" fill={C.char} opacity="0.15" />
      <path d="M-10 -40 L-9 -2 Q-9 0 -6 0 L-3 0 L-1 -34 L1 -34 L3 0 L6 0 Q9 0 9 -2 L10 -40 Z" fill={pants} />
      {bag && back && <rect x="-12" y="-70" width="24" height="26" rx="7" fill={bag} />}
      <path d="M-15 -38 Q-17 -62 -12 -70 Q0 -76 12 -70 Q17 -62 15 -38 Z" fill={shirt} />
      {bag && back && <rect x="-11" y="-68" width="22" height="24" rx="6" fill={bag} />}
      {apron && <path d="M-11 -62 H11 L13 -30 H-13 Z" fill={apron} />}
      <path d="M-13 -67 Q-21 -56 -18 -40 M13 -67 Q21 -56 18 -40" stroke={shirt} strokeWidth="7" strokeLinecap="round" fill="none" />
      <circle cx="-18" cy="-38" r="3.5" fill={skin} />
      <circle cx="18" cy="-38" r="3.5" fill={skin} />
      {flag && (
        <g>
          <line x1="18" y1="-38" x2="22" y2="-112" stroke={C.char} strokeWidth="1.6" />
          <path d="M22 -112 L42 -105 L22 -98 Z" fill={flag} />
        </g>
      )}
      <rect x="-3.5" y="-79" width="7" height="7" fill={skin} />
      <circle cx="0" cy="-87" r="10" fill={back ? hair : skin} />
      {!back && <path d="M-10.5 -86 Q-11 -98.5 0 -98.5 Q11 -98.5 10.5 -86 Q6 -93 0 -92.5 Q-6 -93 -10.5 -86Z" fill={hair} />}
      {band && <rect x="-10.5" y="-93" width="21" height="4" rx="2" fill={band} />}
      {cap && <path d="M-10 -93 Q0 -103 10 -93 Z" fill={cap} />}
      {hat && (
        <g fill={hat}>
          <ellipse cx="0" cy="-94" rx="19" ry="4.5" />
          <path d="M-9 -94 Q-8 -106 0 -106 Q8 -106 9 -94 Z" />
        </g>
      )}
    </g>
  );
}

function Lantern({ x, y, s = 1, color = C.red, u, lit }) {
  const d = mix(color, '#000', 0.3);
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {lit && <Glow x={0} y={26} r={46} u={u} />}
      <line x1="0" y1="-6" x2="0" y2="3" stroke={C.char} strokeWidth="1.5" />
      <rect x="-8" y="2" width="16" height="5" rx="1.5" fill={C.char} />
      <path d="M-8 7 C-17 13 -17 39 -8 45 L8 45 C17 39 17 13 8 7 Z" fill={color} />
      <path d="M-13 16 H13 M-14.5 26 H14.5 M-13 36 H13" stroke={d} strokeWidth="1" opacity="0.5" />
      <path d="M-7 11 C-11.5 19 -11.5 33 -7 41" stroke="#fff" strokeOpacity="0.35" strokeWidth="3" fill="none" strokeLinecap="round" />
      <rect x="-8" y="45" width="16" height="5" rx="1.5" fill={C.char} />
      <path d="M0 50 V58" stroke={C.char} strokeWidth="1.5" />
    </g>
  );
}

function Emblem({ type, x, y, s, c }) {
  switch (type) {
    case 'ring': return <g><circle cx={x} cy={y} r={s} fill="none" stroke={c} strokeWidth={s * 0.28} /><circle cx={x} cy={y} r={s * 0.3} fill={c} /></g>;
    case 'diamond': return <g><path d={`M${x} ${y - s} L${x + s} ${y} L${x} ${y + s} L${x - s} ${y} Z`} fill={c} /><path d={`M${x} ${y - s * 0.45} L${x + s * 0.45} ${y} L${x} ${y + s * 0.45} L${x - s * 0.45} ${y} Z`} fill="none" stroke={mix(c, '#000', 0.5)} strokeOpacity="0.4" strokeWidth="1.5" /></g>;
    case 'wave': return <g fill="none" stroke={c} strokeWidth={s * 0.22}>{[1, 0.62, 0.25].map((k) => <path key={k} d={`M${x - s * k} ${y + s * 0.4} A${s * k} ${s * k} 0 0 1 ${x + s * k} ${y + s * 0.4}`} />)}</g>;
    case 'dots': return <g fill={c}>{[[0, -0.55], [-0.55, 0.4], [0.55, 0.4]].map(([a, b]) => <circle key={a + '' + b} cx={x + a * s} cy={y + b * s} r={s * 0.42} />)}</g>;
    case 'flower': return <g fill={c}>{R(5).map((i) => <circle key={i} cx={x + Math.sin((i * 2 * Math.PI) / 5) * s * 0.55} cy={y - Math.cos((i * 2 * Math.PI) / 5) * s * 0.55} r={s * 0.42} />)}<circle cx={x} cy={y} r={s * 0.25} fill="#00000030" /></g>;
    default: return <path d={`M${x} ${y + s * 0.7} L${x - s} ${y - s * 0.3} A${s * 1.4} ${s * 1.4} 0 0 1 ${x + s} ${y - s * 0.3} Z`} fill={c} />;
  }
}

function Noren({ x, y, w, h, color, emblem, panels = 3 }) {
  const pw = w / panels;
  const ink = color === C.cream ? C.indigo : C.cream;
  return (
    <g>
      <rect x={x - 4} y={y - 3} width={w + 8} height="4" rx="2" fill={C.woodD} />
      {R(panels).map((i) => (
        <path key={i} d={`M${x + i * pw + 1} ${y} H${x + (i + 1) * pw - 1} V${y + h - 2} Q${x + (i + 0.5) * pw} ${y + h + 2} ${x + i * pw + 1} ${y + h - 2} Z`} fill={i % 2 ? mix(color, '#000', 0.08) : color} />
      ))}
      <Emblem type={emblem} x={x + w / 2} y={y + h * 0.45} s={h * 0.2} c={ink} />
      {R(panels - 1).map((i) => <rect key={i} x={x + (i + 1) * pw - 1} y={y} width="2" height={h} fill={mix(color, '#000', 0.45)} />)}
      <rect x={x} y={y} width={w} height={h * 0.12} fill="#000" opacity="0.12" />
    </g>
  );
}

// abstract "brush strokes" instead of letters
const Strokes = ({ x, y, w, h, c, n = 3, vertical }) => (
  <g stroke={c} strokeLinecap="round" strokeWidth={vertical ? w * 0.18 : h * 0.16}>
    {R(n).map((i) =>
      vertical ? (
        <line key={i} x1={x + w / 2} y1={y + 3 + (i * h) / n} x2={x + w / 2 + (i % 2 ? 1 : -1)} y2={y + ((i + 0.62) * h) / n} />
      ) : (
        <line key={i} x1={x + 3 + (i * w) / n} y1={y + h / 2} x2={x + ((i + (i === 1 ? 0.85 : 0.6)) * w) / n} y2={y + h / 2} />
      ),
    )}
  </g>
);

const Lattice = ({ x, y, w, h, lit, gap = 5 }) => (
  <g>
    <rect x={x} y={y} width={w} height={h} fill={lit ? '#f6cf8c' : '#4a3d33'} />
    {R(Math.floor(w / gap)).map((i) => <rect key={i} x={x + i * gap + gap * 0.25} y={y} width={gap * 0.5} height={h} fill={C.woodD} />)}
    <rect x={x - 2} y={y - 2} width={w + 4} height={h + 4} fill="none" stroke={C.woodD} strokeWidth="2" />
  </g>
);

const Steam = ({ x, y, s = 1, o = 0.55 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity={o}>
    <path d="M-12 0 C-20 -12 -4 -18 -12 -32" />
    <path d="M0 -4 C-8 -18 8 -24 0 -42" />
    <path d="M12 0 C4 -12 20 -18 12 -30" />
  </g>
);

const Chopsticks = ({ x, y, a = -20, c = '#3a2a22' }) => (
  <g transform={`translate(${x} ${y}) rotate(${a})`}>
    <rect x="-6" y="-4" width="14" height="8" rx="4" fill={C.cream} opacity="0.9" />
    <rect x="-70" y="-6" width="120" height="3.5" rx="1.7" fill={c} />
    <rect x="-70" y="1" width="120" height="3.5" rx="1.7" fill={c} />
  </g>
);

/* side-view small items (for counters, tables) */
const SideBowl = ({ x, y, w = 34, c = '#f3efe6', fill = '#c98543', band }) => (
  <g>
    <ellipse cx={x} cy={y + 1} rx={w * 0.45} ry="3" fill={C.char} opacity="0.15" />
    <path d={`M${x - w / 2} ${y - w * 0.42} Q${x - w / 2} ${y} ${x - w * 0.2} ${y} H${x + w * 0.2} Q${x + w / 2} ${y} ${x + w / 2} ${y - w * 0.42} Z`} fill={c} />
    {band && <path d={`M${x - w * 0.47} ${y - w * 0.3} H${x + w * 0.47}`} stroke={band} strokeWidth="2.5" />}
    <ellipse cx={x} cy={y - w * 0.42} rx={w / 2} ry={w * 0.11} fill={fill} />
  </g>
);
const Tokkuri = ({ x, y, c = '#f1ebdf', s = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <ellipse cx="0" cy="0" rx="12" ry="2.5" fill={C.char} opacity="0.15" />
    <path d="M-3 -40 H3 L3.5 -34 Q13 -26 12 -10 Q11 0 0 0 Q-11 0 -12 -10 Q-13 -26 -3.5 -34 Z" fill={c} />
    <path d="M-4.5 -41 H4.5" stroke={c} strokeWidth="2.5" strokeLinecap="round" />
    <path d="M-6 -24 Q-9 -14 -6 -6" stroke="#fff" strokeWidth="2.5" opacity="0.4" fill="none" strokeLinecap="round" />
    <path d="M-11.5 -14 H11.5" stroke={C.indigo} strokeWidth="2" opacity="0.6" />
  </g>
);
const Cup = ({ x, y, c = '#f1ebdf', w = 14, h = 10, fill }) => (
  <g>
    <path d={`M${x - w / 2} ${y - h} L${x - w * 0.38} ${y} H${x + w * 0.38} L${x + w / 2} ${y - h} Z`} fill={c} />
    <ellipse cx={x} cy={y - h} rx={w / 2} ry={w * 0.13} fill={fill ?? mix(c, '#000', 0.2)} />
  </g>
);
const Bottle = ({ x, y, h = 60, c = '#2f5a3e', label = C.cream }) => (
  <g>
    <path d={`M${x - 3} ${y - h} H${x + 3} V${y - h * 0.68} Q${x + 9} ${y - h * 0.6} ${x + 9} ${y - h * 0.5} V${y} H${x - 9} V${y - h * 0.5} Q${x - 9} ${y - h * 0.6} ${x - 3} ${y - h * 0.68} Z`} fill={c} />
    <rect x={x - 6} y={y - h * 0.4} width="12" height={h * 0.22} fill={label} />
    <rect x={x - 6.5} y={y - h * 0.5} width="2.5" height={h * 0.45} fill="#fff" opacity="0.18" />
  </g>
);
const Mug = ({ x, y }) => (
  <g>
    <ellipse cx={x} cy={y} rx="12" ry="2.5" fill={C.char} opacity="0.15" />
    <path d={`M${x + 9} ${y - 26} q10 0 10 9 t-10 9`} stroke="#e7eef2" strokeWidth="3" fill="none" />
    <rect x={x - 10} y={y - 32} width="20" height="32" rx="2" fill="#e9a93a" />
    <rect x={x - 10} y={y - 38} width="20" height="9" rx="4" fill="#fbf6ea" />
    <rect x={x - 7} y={y - 26} width="3" height="22" rx="1.5" fill="#fff" opacity="0.35" />
  </g>
);

/* ───────── RESTAURANT: main (storefront) ───────── */
function StoreMain(c) {
  const { u, v, s } = c;
  const cafe = s === 'cafe' || s === 'veggie';
  const lit = v.tod !== 'day' && v.tod !== 'morning';
  const lanterns = ['izakaya', 'yakitori', 'ramen', 'okonomiyaki'].includes(s);
  const low = v.facade === 'low';
  const noren = s === 'sushi' || s === 'tea' ? (v.garnish > 0.5 ? C.cream : C.indigo) : v.noren;
  return (
    <g>
      <Sky {...c} />
      <path d="M0 170 V128 H26 V112 H64 V170 Z M330 170 V118 H356 V104 H400 V170 Z" fill={mix(v.sky[1], C.char, 0.18)} opacity="0.6" />
      {/* neighbours */}
      <rect x="0" y="122" width="56" height="132" fill={v.wall2} />
      <rect x="-4" y="114" width="64" height="10" fill={C.roof} />
      <rect x="12" y="146" width="28" height="36" fill={mix(v.wall2, C.char, 0.3)} />
      <rect x="12" y="200" width="28" height="54" fill={mix(v.wall2, C.char, 0.18)} />
      <rect x="344" y="132" width="56" height="122" fill={mix(v.wall2, '#fff', 0.25)} />
      <rect x="340" y="124" width="64" height="10" fill={C.roof} />
      <rect x="358" y="152" width="28" height="30" fill={mix(v.wall2, C.char, 0.3)} />
      {/* street */}
      <rect y="250" width="400" height="50" fill={`url(#${u}ground)`} />
      <rect y="250" width="400" height="3" fill="#a69a87" />
      {R(7).map((i) => <path key={i} d={`M${i * 64 - 10} 300 L${i * 64 + 20} 253`} stroke="#a69a87" strokeWidth="1" opacity="0.5" />)}
      <path d="M268 280 H400" stroke="#a69a87" strokeWidth="1" opacity="0.5" />
      <path d="M336 252 L366 252 L392 272 L352 272 Z" fill={C.char} opacity="0.1" />
      {/* main building */}
      {low ? (
        <g>
          <path d="M40 142 L360 142 L318 84 L82 84 Z" fill={C.roof} />
          {R(20).map((i) => <line key={i} x1={86 + i * 12} y1="86" x2={46 + i * 16.4} y2="140" stroke="#000" strokeOpacity="0.16" />)}
          <path d="M82 84 L318 84" stroke={mix(C.roof, '#000', 0.3)} strokeWidth="6" strokeLinecap="round" />
          <rect x="150" y="100" width="100" height="32" rx="3" fill={C.woodD} />
          <rect x="155" y="104" width="90" height="24" rx="2" fill={cafe ? C.cream : mix(C.wood, '#fff', 0.15)} />
          <Strokes x={162} y={105} w={76} h={22} c={cafe ? v.cafeWall : C.char} n={3} />
        </g>
      ) : (
        <g>
          <path d="M52 62 L348 62 L334 44 L66 44 Z" fill={C.roof} />
          {R(16).map((i) => <line key={i} x1={70 + i * 17.3} y1="45" x2={60 + i * 18.6} y2="61" stroke="#000" strokeOpacity="0.18" />)}
          <rect x="66" y="62" width="268" height="80" fill={`url(#${u}wall)`} />
          <rect x="50" y="59" width="300" height="5" rx="2" fill={mix(C.roof, '#000', 0.25)} />
          <rect x="318" y="64" width="16" height="78" fill={C.char} opacity="0.06" />
          <Lattice x={86} y={80} w={58} h={44} lit={lit} />
          <Lattice x={256} y={80} w={58} h={44} lit={lit} />
          <rect x="160" y="80" width="80" height="38" rx="3" fill={C.woodD} />
          <rect x="164" y="84" width="72" height="30" rx="2" fill={cafe ? C.cream : mix(C.wood, '#fff', 0.15)} />
          <Strokes x={170} y={86} w={62} h={26} c={cafe ? v.cafeWall : C.char} n={3} />
        </g>
      )}
      <path d="M54 158 L346 158 L332 140 L68 140 Z" fill={C.roof} />
      <rect x="52" y="156" width="296" height="4" rx="2" fill={mix(C.roof, '#000', 0.25)} />
      {cafe ? <CafeFront c={c} lit={lit} /> : <WoodFront c={c} lit={lit} noren={noren} />}
      <rect x="62" y="244" width="276" height="8" fill={C.stone} />
      {/* foreground props */}
      <g>
        <rect x="292" y="212" width="34" height="34" rx="2" fill={C.char} />
        <rect x="295" y="215" width="28" height="28" fill="#30363c" />
        <Strokes x={297} y={219} w={24} h={8} c={C.cream} n={2} />
        <Strokes x={297} y={230} w={24} h={8} c={v.accent} n={2} />
        <path d="M296 246 L292 254 M322 246 L326 254" stroke={C.char} strokeWidth="2.5" />
      </g>
      <g>
        <rect x="64" y="226" width="46" height="24" rx="2" fill={C.woodD} />
        <rect x="64" y="226" width="46" height="5" fill={mix(C.woodD, '#000', 0.2)} />
        {[70, 82, 94, 104].map((x, i) => <ellipse key={x} cx={x} cy={218 - (i % 2) * 6} rx="10" ry="12" fill={i % 2 ? C.leaf : mix(C.leaf, '#000', 0.15)} />)}
      </g>
      <Tint v={v} />
      {lit && <Glow x={200} y={205} r={70} u={u} o={0.6} />}
      {lit && !low && [115, 285].map((x) => <Glow key={x} x={x} y={102} r={40} u={u} o={0.5} />)}
      {lanterns && [138, 262].map((x) => <Lantern key={x} x={x} y={164} s={0.85} u={u} lit={lit} color={s === 'ramen' && v.garnish < 0.4 ? C.mustard : C.red} />)}
    </g>
  );
}

function WoodFront({ c, lit, noren }) {
  const { u, v } = c;
  return (
    <g>
      <rect x="66" y="160" width="268" height="86" fill={`url(#${u}wood)`} />
      {R(22).map((i) => <line key={i} x1={66 + i * 12.2} y1="160" x2={66 + i * 12.2} y2="246" stroke={C.woodD} strokeOpacity="0.3" />)}
      <rect x="156" y="164" width="88" height="82" fill={`url(#${u}inside)`} />
      <rect x="156" y="214" width="46" height="32" fill={C.woodD} opacity="0.7" />
      <Lattice x={208} y={166} w={34} h={78} gap={8.5} lit />
      <rect x="152" y="160" width="4" height="86" fill={C.woodD} />
      <rect x="244" y="160" width="4" height="86" fill={C.woodD} />
      <Noren x={150} y={164} w={100} h={50} color={noren} emblem={v.emblem} panels={v.garnish > 0.6 ? 4 : 3} />
      <Lattice x={84} y={172} w={56} h={56} lit={lit} gap={4.5} />
      <Lattice x={260} y={172} w={56} h={34} lit={lit} gap={4.5} />
    </g>
  );
}

function CafeFront({ c, lit }) {
  const { u, v } = c;
  const awn = [C.cream, v.accent === C.green && v.cafeWall === C.green ? C.red : v.accent];
  return (
    <g>
      <rect x="66" y="160" width="268" height="86" fill={v.cafeWall} />
      <rect x="66" y="160" width="268" height="86" fill={`url(#${u}light)`} />
      <rect x="82" y="182" width="96" height="56" rx="2" fill={`url(#${u}inside)`} />
      <path d="M110 182 V192 M150 182 V192" stroke={C.char} strokeWidth="1" />
      <circle cx="110" cy="196" r="5" fill={C.mustard} />
      <circle cx="150" cy="196" r="5" fill={C.mustard} />
      <rect x="86" y="222" width="88" height="5" fill={C.woodD} />
      <Cup x={102} y={222} c={C.white} />
      <Cup x={122} y={222} c={C.white} />
      <rect x="82" y="182" width="96" height="56" fill="none" stroke={C.cream} strokeWidth="3" />
      <path d="M130 182 V238" stroke={C.cream} strokeWidth="2" />
      <rect x="196" y="176" width="44" height="70" fill={C.woodD} />
      <rect x="203" y="184" width="30" height="34" fill={`url(#${u}inside)`} />
      <circle cx="232" cy="226" r="2" fill={C.mustard} />
      <path d="M72 162 H252 L248 178 H76 Z" fill={awn[1]} />
      {R(9).map((i) => <rect key={i} x={76 + i * 20} y="162" width="10" height="16" fill={awn[0]} opacity="0.9" />)}
      <path d={'M76 178 ' + R(9).map((i) => `q10 9 20 0`).join(' ')} fill={awn[1]} />
      <path d="M268 172 H300" stroke={C.char} strokeWidth="2.5" />
      <circle cx="290" cy="192" r="15" fill={C.cream} stroke={C.char} strokeWidth="2" />
      <path d="M283 186 H296 V194 Q296 200 289.5 200 Q283 200 283 194 Z M296 189 q5 0 5 3 t-5 3" fill={v.cafeWall} stroke={v.cafeWall} strokeWidth="1.5" />
      <path d="M287 182 q-2 -3 0 -5 M292 182 q-2 -3 0 -5" stroke={v.cafeWall} strokeWidth="1.5" fill="none" />
      <path d="M290 172 V177" stroke={C.char} strokeWidth="2" />
      <rect x="262" y="210" width="56" height="2" fill={C.cream} opacity="0.5" />
      {lit && <Glow x={130} y={210} r={40} u={u} o={0.5} />}
    </g>
  );
}

/* ───────── RESTAURANT: food (close-ups) ───────── */
function Table({ u, v }) {
  return (
    <g>
      <rect width="400" height="300" fill={`url(#${u}table)`} />
      {R(9).map((i) => (
        <path key={i} d={`M0 ${18 + i * 34} C110 ${24 + i * 34} 230 ${10 + i * 34} 400 ${20 + i * 34}`} stroke={mix(v.table, C.woodD, 0.5)} strokeOpacity="0.22" strokeWidth="1.3" fill="none" />
      ))}
      <path d="M0 100 H400 M0 206 H400" stroke={mix(v.table, C.woodD, 0.7)} strokeOpacity="0.35" strokeWidth="1.5" />
      <rect width="400" height="300" fill={`url(#${u}light)`} />
    </g>
  );
}
// a "3/4" table with a wall behind (izakaya, café, tea)
function TableFront({ u, v, wall = '#5b3a2a', bokeh = true }) {
  return (
    <g>
      <rect width="400" height="160" fill={wall} />
      <rect width="400" height="160" fill={`url(#${u}light)`} />
      {bokeh && [[60, 50, 26], [150, 30, 16], [300, 60, 30], [360, 24, 14], [230, 90, 12]].map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} fill="#ffd98a" opacity={0.12 + (i % 3) * 0.05} />)}
      <rect y="150" width="400" height="150" fill={`url(#${u}table)`} />
      {R(6).map((i) => <path key={i} d={`M${-200 + i * 160} 300 L${100 + i * 40} 150`} stroke={mix(v.table, C.woodD, 0.5)} strokeOpacity="0.2" fill="none" />)}
      <rect y="150" width="400" height="5" fill={mix(v.table, '#fff', 0.3)} opacity="0.6" />
    </g>
  );
}

function Bowl({ cx, cy, r, u, rim, broth, children, id }) {
  const band = rim === '#2a2a2e' ? C.red : rim === C.white ? C.indigo : C.mustard;
  return (
    <g>
      <circle cx={cx + 10} cy={cy + 12} r={r + 6} fill={`url(#${u}soft)`} />
      <circle cx={cx} cy={cy} r={r} fill={rim} />
      <circle cx={cx} cy={cy} r={r - 6} fill="none" stroke={band} strokeWidth="2.5" strokeDasharray="7 5" opacity="0.8" />
      <clipPath id={u + id}>
        <circle cx={cx} cy={cy} r={r * 0.84} />
      </clipPath>
      <circle cx={cx} cy={cy} r={r * 0.84} fill={broth} />
      <g clipPath={`url(#${u + id})`}>{children}</g>
      <circle cx={cx} cy={cy} r={r * 0.84} fill="none" stroke="#000" strokeOpacity="0.12" strokeWidth="3" />
      <path d={`M${cx - r * 0.7} ${cy - r * 0.55} A${r * 0.92} ${r * 0.92} 0 0 1 ${cx + r * 0.2} ${cy - r * 0.9}`} stroke="#fff" strokeOpacity="0.35" strokeWidth="3" fill="none" strokeLinecap="round" />
    </g>
  );
}
const RIMS = { black: '#2a2a2e', white: C.white, red: '#b8352e' };

function Noodles({ cx, cy, n = 7, w = 70, c = '#f1d27a', thick = 3 }) {
  return (
    <g fill="none" stroke={c} strokeWidth={thick} strokeLinecap="round">
      {R(n).map((i) => (
        <path key={i} d={`M${cx - w / 2} ${cy + i * (thick + 2)} q${w / 8} -8 ${w / 4} 0 t${w / 4} 0 t${w / 4} 0 t${w / 4} 0`} />
      ))}
      <g stroke="#000" strokeOpacity="0.08" strokeWidth="1">
        {R(n).map((i) => <path key={i} d={`M${cx - w / 2} ${cy + i * (thick + 2) + thick / 2} q${w / 8} -8 ${w / 4} 0 t${w / 4} 0 t${w / 4} 0 t${w / 4} 0`} />)}
      </g>
    </g>
  );
}
const Egg = ({ x, y, a = 0 }) => (
  <g transform={`translate(${x} ${y}) rotate(${a})`}>
    <ellipse rx="17" ry="13" fill="#fbf6ea" />
    <ellipse cx="1" rx="9.5" ry="8" fill="#f0a238" />
    <ellipse cx="1" rx="5" ry="4" fill="#e3801f" />
  </g>
);
const Chashu = ({ x, y, r = 22 }) => (
  <g>
    <circle cx={x} cy={y} r={r} fill="#b8673f" />
    <circle cx={x} cy={y} r={r - 3} fill="#e7a684" />
    <path d={`M${x - r * 0.5} ${y - r * 0.2} q${r * 0.4} ${r * 0.5} ${r} ${r * 0.2}`} stroke="#f6d3bd" strokeWidth="3" fill="none" />
    <circle cx={x} cy={y} r={r * 0.25} fill="#f6d3bd" opacity="0.7" />
  </g>
);
const Negi = ({ pts }) => (
  <g>
    {pts.map(([x, y], i) => (
      <circle key={i} cx={x} cy={y} r="3.3" fill="#d6ecb0" stroke="#5f9e3a" strokeWidth="1.4" />
    ))}
  </g>
);
const scatter = (r, n, cx, cy, rx, ry) => R(n).map(() => [cx + (r() - 0.5) * 2 * rx, cy + (r() - 0.5) * 2 * ry]);

function RamenFood(c) {
  const { u, v, r } = c;
  const cx = 196, cy = 152;
  return (
    <g>
      <Table {...c} />
      <Chopsticks x={330} y={250} a={-28} />
      <g>
        <circle cx="338" cy="62" r="26" fill="#000" opacity="0.08" />
        <circle cx="334" cy="58" r="24" fill="#e9e4da" />
        <circle cx="334" cy="58" r="18" fill="#a9b56b" />
      </g>
      <rect x="22" y="200" width="54" height="70" rx="6" fill={C.cream} transform="rotate(-8 49 235)" />
      <Bowl cx={cx} cy={cy} r={110} u={u} rim={RIMS[v.bowl]} broth={v.broth} id="ramen">
        <circle cx={cx - 20} cy={cy - 20} r="70" fill="#fff" opacity="0.12" />
        <Noodles cx={cx - 25} cy={cy + 20} n={9} w={110} c="#f3d781" thick={3.4} />
        {scatter(r, 14, cx, cy - 10, 70, 60).map(([x, y], i) => <circle key={i} cx={x} cy={y} r={1.5 + (i % 3)} fill="#fff4c9" opacity="0.5" />)}
        <Chashu x={cx + 34} y={cy - 22} r={25} />
        <Chashu x={cx + 52} y={cy + 8} r={23} />
        <Egg x={cx - 38} y={cy - 36} a={-20} />
        <Egg x={cx - 12} y={cy - 46} a={15} />
        <g transform={`translate(${cx + 30} ${cy + 46}) rotate(-12)`}>
          {R(5).map((i) => <rect key={i} x={i * 7 - 18} y={-8 + (i % 2) * 3} width="5" height="18" rx="1.5" fill="#c99a52" />)}
        </g>
        <g>
          <circle cx={cx - 52} cy={cy + 2} r="12" fill="#fbf6ea" />
          <path d={`M${cx - 52} ${cy + 2} m-2 0 a2 2 0 1 1 4 0 a4 4 0 1 1 -8 0 a6 6 0 1 1 12 0 a8 8 0 1 1 -16 0`} fill="none" stroke="#e98ca4" strokeWidth="1.6" />
        </g>
        <Negi pts={scatter(r, 14, cx - 4, cy - 2, 24, 20)} />
      </Bowl>
      <g transform={`rotate(14 ${cx + 60} ${cy - 85})`}>
        <rect x={cx + 40} y={cy - 122} width="38" height="66" rx="2" fill="#1e2a23" />
        <path d={`M${cx + 46} ${cy - 118} V${cy - 62} M${cx + 58} ${cy - 118} V${cy - 62} M${cx + 70} ${cy - 118} V${cy - 62}`} stroke="#33453a" strokeWidth="1.5" />
      </g>
      <Steam x={cx - 10} y={cy - 40} s={1.4} o={0.45} />
      <Vignette u={u} />
    </g>
  );
}

function SushiFood(c) {
  const { u, v, r } = c;
  const tops = [
    ['#c8323a', '#e5737a'], ['#f08a4b', '#fcd3b4'], ['#f3c54a', '#f9e08f', true], ['#f29a76', '#fbe1d2'], ['#efe6dc', '#c9ced6'], ['#e86a5a', '#f6b2a8'],
  ];
  const order = R(6).sort((a, b) => hash(String(a) + v.garnish) - hash(String(b) + v.garnish)).slice(0, 4);
  return (
    <g>
      <Table {...c} />
      <Shadow cx={208} cy={206} rx={170} ry={36} u={u} />
      <rect x="44" y="102" width="312" height="108" rx="6" fill="#e2c08f" />
      <rect x="44" y="198" width="312" height="12" rx="4" fill="#b98f5e" />
      {R(6).map((i) => <path key={i} d={`M52 ${112 + i * 15} C150 ${116 + i * 15} 250 ${108 + i * 15} 348 ${113 + i * 15}`} stroke="#c9a06c" strokeOpacity="0.5" fill="none" />)}
      {order.map((k, i) => {
        const [top, stripe, band] = tops[k];
        const x = 92 + i * 62, y = 140 + (i % 2) * 6;
        return (
          <g key={i}>
            <ellipse cx={x + 4} cy={y + 18} rx="30" ry="7" fill={C.char} opacity="0.15" />
            <rect x={x - 26} y={y - 4} width="52" height="22" rx="11" fill="#fbf6ea" />
            <path d={`M${x - 30} ${y} Q${x - 28} ${y - 16} ${x} ${y - 16} Q${x + 30} ${y - 16} ${x + 31} ${y + 1} Q${x + 30} ${y + 7} ${x} ${y + 5} Q${x - 30} ${y + 7} ${x - 30} ${y}Z`} fill={top} />
            {!band && [-14, -2, 10].map((d) => <path key={d} d={`M${x + d} ${y - 13} q4 8 8 15`} stroke={stripe} strokeWidth="2.4" fill="none" strokeLinecap="round" opacity="0.8" />)}
            {band && <rect x={x - 5} y={y - 16} width="10" height="32" rx="2" fill="#1d2420" />}
            <path d={`M${x - 20} ${y - 9} Q${x - 4} ${y - 15} ${x + 14} ${y - 12}`} stroke="#fff" strokeWidth="2" opacity="0.35" fill="none" strokeLinecap="round" />
          </g>
        );
      })}
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <circle cx={110 + i * 34} cy="186" r="15" fill="#1d2420" />
          <circle cx={110 + i * 34} cy="186" r="12" fill="#fbf6ea" />
          <circle cx={110 + i * 34} cy="186" r="5" fill={i === 1 ? '#7bb661' : '#d9465a'} />
        </g>
      ))}
      <g>
        {R(5).map((i) => <ellipse key={i} cx={262 + i * 4} cy={184 - i * 2} rx="13" ry="7" fill={mix('#f4b9b0', '#fff', i * 0.08)} transform={`rotate(${i * 12 - 20} ${262 + i * 4} ${184 - i * 2})`} />)}
        <path d="M300 190 q6 -14 16 -6 q6 4 -2 10 Z" fill="#8fbf5a" />
      </g>
      <Chopsticks x={210} y={262} a={-4} />
      <g>
        <circle cx="352" cy="58" r="24" fill="#000" opacity="0.08" />
        <circle cx="348" cy="54" r="22" fill={C.white} />
        <circle cx="348" cy="54" r="17" fill="#3a1f14" />
      </g>
      <Vignette u={u} />
    </g>
  );
}

function NoodleFood(c) {
  const { u, v, r, place } = c;
  const udon = /うどん|udon/i.test(`${place?.name} ${(place?.dishes ?? []).map((d) => d.name).join('')}`);
  if (udon)
    return (
      <g>
        <Table {...c} />
        <Chopsticks x={330} y={250} a={-28} />
        <Bowl cx={196} cy={150} r={106} u={u} rim={RIMS[v.bowl]} broth="#e6c78a" id="udon">
          <Noodles cx={160} cy={150} n={6} w={130} c="#fbf3dc" thick={7} />
          <g transform="translate(220 112) rotate(-25)">
            <path d="M-40 0 Q-30 -16 0 -14 Q36 -12 44 2 Q36 16 0 14 Q-30 16 -40 0Z" fill="#e1a548" />
            {R(8).map((i) => <circle key={i} cx={-30 + i * 9} cy={(i % 3) * 4 - 6} r="4" fill="#f2c56c" />)}
            <path d="M44 2 l14 -8 l-4 10 l4 10Z" fill="#e2563d" />
          </g>
          <g><circle cx="150" cy="104" r="15" fill="#fbf6ea" /><path d="M136 104 a14 14 0 0 1 28 0" fill="#f19aac" /></g>
          <Negi pts={scatter(r, 16, 196, 160, 30, 26)} />
        </Bowl>
        <Steam x={196} y={110} s={1.3} o={0.45} />
        <Vignette u={u} />
      </g>
    );
  return (
    <g>
      <Table {...c} />
      <Shadow cx={180} cy={168} rx={140} ry={120} u={u} />
      <rect x="54" y="40" width="240" height="220" rx="10" fill="#22262b" />
      <rect x="66" y="52" width="216" height="196" rx="4" fill="#d8bf88" />
      {R(26).map((i) => <line key={i} x1={66 + i * 8.3} y1="52" x2={66 + i * 8.3} y2="248" stroke="#b49a63" strokeWidth="1" />)}
      <g>
        {R(16).map((i) => (
          <path key={i} d={`M${104 + (i % 4) * 4} ${86 + i * 9} c20 -10 30 8 50 -2 s30 10 50 -2 s24 6 30 2`} stroke={i % 2 ? '#8c7a66' : '#9d8a75'} strokeWidth="4.5" fill="none" strokeLinecap="round" />
        ))}
        {R(10).map((i) => <rect key={i} x={140 + (i * 13) % 60} y={110 + ((i * 29) % 70)} width="10" height="3" fill="#1d2420" transform={`rotate(${i * 30} ${145 + (i * 13) % 60} ${111 + ((i * 29) % 70)})`} />)}
      </g>
      <g>
        <circle cx="338" cy="104" r="40" fill="#000" opacity="0.1" />
        <circle cx="334" cy="98" r="38" fill={C.white} />
        <circle cx="334" cy="98" r="38" fill="none" stroke={C.indigo} strokeWidth="3" strokeDasharray="5 5" opacity="0.6" />
        <circle cx="334" cy="98" r="30" fill="#3a2316" />
        <circle cx="326" cy="90" r="8" fill="#fff" opacity="0.15" />
      </g>
      <g>
        <ellipse cx="338" cy="210" rx="36" ry="26" fill={C.white} />
        <Negi pts={scatter(r, 10, 330, 210, 12, 9)} />
        <path d="M350 204 q8 -6 14 2 q-4 10 -14 6Z" fill="#8fbf5a" />
      </g>
      <Chopsticks x={190} y={280} a={-2} />
      <Vignette u={u} />
    </g>
  );
}

function OkonomiFood(c) {
  const { u, r } = c;
  return (
    <g>
      <rect width="400" height="300" fill={`url(#${u}steel)`} />
      {R(6).map((i) => <path key={i} d={`M${-40 + i * 90} 0 L${-140 + i * 90} 300`} stroke="#fff" strokeOpacity="0.04" strokeWidth="18" />)}
      <rect x="0" y="0" width="400" height="14" fill="#6e747b" />
      <circle cx="205" cy="160" r="104" fill="#000" opacity="0.25" />
      <circle cx="200" cy="155" r="100" fill="#a8682f" />
      <circle cx="200" cy="155" r="94" fill="#cf8f4a" />
      <path d="M118 150 A86 82 0 0 1 282 150 Q290 200 250 228 Q200 250 150 228 Q110 200 118 150Z" fill="#5a2f1c" />
      <ellipse cx="170" cy="120" rx="34" ry="12" fill="#8a4a2c" opacity="0.6" />
      <path d={'M118 132 ' + R(9).map((i) => `L${130 + i * 18} ${i % 2 ? 118 : 160}`).join(' ') + ' M124 176 ' + R(8).map((i) => `L${138 + i * 18} ${i % 2 ? 162 : 206}`).join(' ')} stroke="#fbf3dc" strokeWidth="3.4" fill="none" strokeLinejoin="round" />
      {scatter(r, 60, 200, 160, 70, 60).map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.6" fill="#4f8f2f" />)}
      {scatter(r, 18, 195, 150, 55, 45).map(([x, y], i) => <path key={i} d={`M${x} ${y} q4 -5 9 -1 q-3 5 -9 1Z`} fill={i % 2 ? '#edc29b' : '#d9a274'} />)}
      <path d="M232 214 q8 -6 14 0 q-6 7 -14 0Z" fill="#e2453b" />
      <g transform="rotate(-30 330 230)">
        <rect x="292" y="220" width="56" height="30" rx="3" fill="#c7cdd3" />
        <rect x="292" y="220" width="56" height="6" fill="#fff" opacity="0.4" />
        <rect x="346" y="231" width="58" height="10" rx="5" fill={C.woodD} />
      </g>
      <g transform="rotate(-48 70 70)">
        <rect x="40" y="58" width="50" height="26" rx="3" fill="#c7cdd3" />
        <rect x="88" y="66" width="52" height="10" rx="5" fill={C.woodD} />
      </g>
      <Steam x={200} y={90} s={1.4} o={0.4} />
      <Vignette u={u} />
    </g>
  );
}

function SkewerFood(c) {
  const { u, place } = c;
  const kushi = /串かつ|串カツ|串揚|揚|kushikatsu/i.test(`${place?.name} ${place?.i18n?.en?.name ?? ''}`);
  return (
    <g>
      <Table {...c} />
      <Shadow cx={205} cy={180} rx={180} ry={74} u={u} />
      <g transform="rotate(-8 200 160)">
        <rect x="38" y="96" width="324" height="132" rx="16" fill={kushi ? '#f3efe6' : '#2b2d31'} />
        <rect x="46" y="104" width="308" height="116" rx="12" fill="none" stroke={kushi ? C.indigo : '#464a50'} strokeWidth="2" opacity="0.5" />
        {R(4).map((i) => {
          const y = 124 + i * 26;
          return (
            <g key={i}>
              <line x1="74" y1={y} x2="328" y2={y} stroke="#e2c48f" strokeWidth="3" strokeLinecap="round" />
              {kushi
                ? R(2).map((j) => (
                    <g key={j}>
                      <ellipse cx={166 + j * 72} cy={y} rx="32" ry="12" fill="#d9a24a" />
                      {R(9).map((k) => <circle key={k} cx={142 + j * 72 + k * 6} cy={y - 6 + ((k * 7) % 12)} r="1.6" fill="#a8742c" />)}
                      <ellipse cx={156 + j * 72} cy={y - 5} rx="14" ry="3" fill="#fff" opacity="0.3" />
                    </g>
                  ))
                : R(4).map((j) => (
                    <g key={j}>
                      <rect x={132 + j * 40} y={y - 11} width="30" height="22" rx="8" fill={j % 2 && i % 2 ? '#e9e3c9' : '#9a5a2a'} />
                      {j % 2 && i % 2 ? <rect x={132 + j * 40} y={y - 11} width="7" height="22" rx="3" fill="#7cae4a" /> : <rect x={136 + j * 40} y={y - 8} width="16" height="4" rx="2" fill="#c98b4a" />}
                    </g>
                  ))}
            </g>
          );
        })}
      </g>
      {kushi ? (
        <g>
          {R(5).map((i) => <path key={i} d={`M${300 + i * 8} ${40 + i * 4} q20 -16 40 0 q-18 12 -40 0Z`} fill={i % 2 ? '#a6cf74' : '#c7e39c'} />)}
          <rect x="40" y="28" width="66" height="50" rx="4" fill="#c7cdd3" />
          <rect x="46" y="34" width="54" height="38" rx="2" fill="#4a2616" />
        </g>
      ) : (
        <g>
          <path d="M320 40 a26 26 0 0 1 40 30 Z" fill={C.mustard} />
          <path d="M324 44 a20 20 0 0 1 30 22 Z" fill="#f6e38f" />
          <Mug x={70} y={84} />
        </g>
      )}
      <Vignette u={u} />
    </g>
  );
}

function IzakayaFood(c) {
  const { u } = c;
  return (
    <g>
      <TableFront {...c} wall="#4b3326" />
      <Lantern x={60} y={-14} s={1.1} u={u} lit />
      <Mug x={320} y={222} />
      <g transform="translate(300 222) scale(1.4) translate(-300 -222)"><Mug x={320} y={222} /></g>
      <Tokkuri x={78} y={226} s={1.3} />
      <Cup x={116} y={232} c="#f1ebdf" w={20} h={13} fill="#f6efd8" />
      <ellipse cx="200" cy="246" rx="74" ry="16" fill={C.char} opacity="0.15" />
      <rect x="130" y="216" width="140" height="26" rx="5" fill="#2b2d31" />
      <rect x="130" y="216" width="140" height="7" rx="3" fill="#44474d" />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x={146 + i * 36} y="194" width="32" height="26" rx="5" fill="#f2c64e" />
          <path d={`M${150 + i * 36} 202 q12 -4 24 0 M${150 + i * 36} 210 q12 -4 24 0`} stroke="#e0a830" strokeWidth="2" fill="none" />
        </g>
      ))}
      <path d="M150 198 q4 -10 14 -4 M242 196 q8 -8 12 2" stroke="#7cae4a" strokeWidth="3" fill="none" />
      <SideBowl x={238} y={286} w={66} c="#3e4f6b" fill="#7cae4a" />
      {R(7).map((i) => <ellipse key={i} cx={216 + i * 7} cy={256 - (i % 2) * 3} rx="7" ry="4" fill={i % 2 ? '#8fc35c' : '#6fa646'} />)}
      <SideBowl x={120} y={292} w={70} c="#f1ebdf" band={C.indigo} fill="#c9853f" />
      {R(4).map((i) => <circle key={i} cx={102 + i * 12} cy={256 - (i % 2) * 4} r="9" fill={i % 2 ? '#b8692e' : '#c97f3a'} />)}
      <path d="M140 250 l10 -10 l4 10Z" fill="#f6e38f" />
      <Vignette u={u} />
    </g>
  );
}

function CafeFood(c) {
  const { u, v } = c;
  return (
    <g>
      <TableFront {...c} wall={mix(v.cafeWall, '#000', 0.15)} />
      {[90, 310].map((x) => <g key={x}><path d={`M${x} 0 V40`} stroke={C.char} strokeWidth="1.5" /><path d={`M${x - 14} 52 Q${x} 30 ${x + 14} 52 Z`} fill={C.mustard} /><Glow x={x} y={60} r={40} u={u} /></g>)}
      <ellipse cx="140" cy="252" rx="78" ry="16" fill={C.char} opacity="0.18" />
      <ellipse cx="140" cy="244" rx="78" ry="18" fill={C.white} />
      <ellipse cx="140" cy="244" rx="64" ry="12" fill="none" stroke={C.indigo} strokeWidth="1.5" opacity="0.4" />
      <path d="M104 236 V188 Q104 172 140 172 Q176 172 176 188 V236 Z" fill="#d79a4f" />
      <path d="M108 236 V192 Q108 178 140 178 Q172 178 172 192 V236 Z" fill="#f4d89c" />
      <rect x="112" y="226" width="56" height="10" fill="#b77a35" />
      <rect x="128" y="190" width="22" height="14" rx="3" fill="#fbeaa0" />
      <path d="M100 236 H180" stroke="#9c6a2e" strokeWidth="2" />
      <ellipse cx="278" cy="252" rx="56" ry="11" fill={C.char} opacity="0.18" />
      <ellipse cx="278" cy="246" rx="56" ry="12" fill={C.white} />
      <path d="M248 244 L252 200 H304 L308 244 Q278 252 248 244Z" fill={C.white} />
      <path d="M304 210 q22 0 20 16 q-2 12 -18 12" stroke={C.white} strokeWidth="6" fill="none" />
      <ellipse cx="278" cy="200" rx="26" ry="6" fill="#4a2a18" />
      <path d="M270 199 q8 -4 14 0 q-6 4 -14 0" fill="#d7b48a" />
      <rect x="254" y="206" width="4" height="34" rx="2" fill="#fff" opacity="0.6" />
      <Steam x={278} y={190} s={0.9} o={0.6} />
      <Vignette u={u} />
    </g>
  );
}

function Tray({ x, y, w, h, c }) {
  return (
    <g>
      <rect x={x + 10} y={y + 14} width={w} height={h} rx="10" fill={C.char} opacity="0.18" />
      <rect x={x} y={y} width={w} height={h} rx="10" fill={c} />
      <rect x={x + 8} y={y + 8} width={w - 16} height={h - 16} rx="6" fill={mix(c, '#fff', 0.08)} />
    </g>
  );
}
const RiceBowl = ({ x, y, r = 34, c = C.white, band }) => (
  <g>
    <circle cx={x} cy={y} r={r} fill={c} />
    {band && <circle cx={x} cy={y} r={r - 3} fill="none" stroke={band} strokeWidth="2.5" strokeDasharray="4 4" />}
    <circle cx={x} cy={y} r={r - 7} fill="#fdfaf2" />
    {R(14).map((i) => <ellipse key={i} cx={x + Math.cos(i * 2.4) * (r - 14) * ((i % 3) / 3 + 0.3)} cy={y + Math.sin(i * 2.4) * (r - 14) * ((i % 3) / 3 + 0.3)} rx="3" ry="1.6" fill="#ece5d4" transform={`rotate(${i * 40} ${x} ${y})`} />)}
  </g>
);
const Miso = ({ x, y, r = 34 }) => (
  <g>
    <circle cx={x} cy={y} r={r} fill="#6e2a22" />
    <circle cx={x} cy={y} r={r - 6} fill="#b87a3e" />
    <circle cx={x - 6} cy={y - 6} r={r - 16} fill="#c99050" opacity="0.6" />
    {[[-8, 4], [6, -8], [8, 8]].map(([a, b], i) => <rect key={i} x={x + a - 4} y={y + b - 4} width="8" height="8" rx="1" fill="#fbf6ea" />)}
    <path d={`M${x - 16} ${y - 8} q6 -6 12 2 q-6 6 -12 -2Z M${x + 4} ${y + 14} q8 -4 12 4 q-8 4 -12 -4Z`} fill="#2f4a2a" />
  </g>
);

function TeishokuFood(c) {
  const { u, v, place } = c;
  const dishes = (place?.dishes ?? []).map((d) => d.name).join('');
  const main = /唐揚|からあげ|フライ|カツ/.test(dishes) ? 'karaage' : /鶏|チキン|照り焼|肉|生姜焼/.test(dishes) && !/魚|鯖|鮭|さば|さけ/.test(dishes.split('定食')[0]) ? 'meat' : 'fish';
  return (
    <g>
      <Table {...c} />
      <Tray x={36} y={30} w={328} h={240} c={v.garnish > 0.5 ? '#3a2a24' : '#9c4a30'} />
      <rect x="70" y="52" width="170" height="96" rx="12" fill={C.white} />
      {main === 'fish' && (
        <g>
          <path d="M96 104 Q130 74 190 92 L214 76 L210 104 L214 128 L190 114 Q130 132 96 104Z" fill="#b9a089" />
          <path d="M98 104 Q130 84 188 96" stroke="#e6dccd" strokeWidth="5" fill="none" opacity="0.6" />
          {[120, 140, 160, 180].map((x) => <path key={x} d={`M${x} 90 l-8 26`} stroke="#5a3a22" strokeWidth="3" opacity="0.6" />)}
          <circle cx="110" cy="100" r="3.5" fill="#2a2a2e" />
        </g>
      )}
      {main === 'karaage' && R(5).map((i) => <circle key={i} cx={110 + i * 22} cy={98 + (i % 2) * 14} r="17" fill={i % 2 ? '#b8692e' : '#cb8640'} />)}
      {main === 'meat' && R(5).map((i) => <rect key={i} x={96 + i * 22} y="80" width="20" height="40" rx="6" fill="#9a4f22" transform={`rotate(12 ${106 + i * 22} 100)`} />)}
      {main === 'meat' && <path d="M100 82 Q150 70 210 84" stroke="#e8b04a" strokeWidth="3" opacity="0.6" fill="none" />}
      <path d="M200 128 q10 -16 24 -4 q-8 12 -24 4Z" fill="#9cc96e" />
      <ellipse cx="218" cy="110" rx="12" ry="8" fill="#fbfbf6" />
      <path d="M200 66 a14 14 0 0 1 22 18Z" fill={C.mustard} />
      <circle cx="300" cy="94" r="36" fill={C.white} />
      <circle cx="300" cy="94" r="30" fill="none" stroke={C.indigo} strokeWidth="2" opacity="0.4" />
      {R(4).map((i) => <circle key={i} cx={284 + i * 10} cy={90 + (i % 2) * 8} r="9" fill={i % 2 ? '#f2d24c' : '#a6c86a'} />)}
      <RiceBowl x={118} y={208} band={C.indigo} />
      <Miso x={226} y={208} />
      <rect x="282" y="176" width="58" height="58" rx="8" fill={v.glaze} />
      {R(5).map((i) => <circle key={i} cx={298 + (i % 3) * 13} cy={196 + Math.floor(i / 3) * 16} r="7" fill="#f3d36a" />)}
      <Chopsticks x={210} y={256} a={0} />
      <Steam x={226} y={186} s={0.8} o={0.4} />
      <Vignette u={u} />
    </g>
  );
}

function CurryFood(c) {
  const { u, r, place } = c;
  const naan = /ナン|naan|ハラール|halal/i.test(`${place?.name} ${(place?.dishes ?? []).map((d) => d.name).join('')}`);
  const chunks = scatter(r, 9, 0, 0, 1, 1);
  if (naan)
    return (
      <g>
        <Table {...c} />
        <Shadow cx={200} cy={170} rx={190} ry={110} u={u} />
        <rect x="30" y="40" width="340" height="220" rx="16" fill="#c7cdd3" />
        <rect x="38" y="48" width="324" height="204" rx="12" fill="#dde1e5" />
        <path d="M60 230 Q40 120 120 70 Q190 40 210 110 Q220 200 140 236 Q90 250 60 230Z" fill="#e9c88f" />
        {scatter(r, 14, 130, 150, 50, 70).map(([x, y], i) => <ellipse key={i} cx={x} cy={y} rx={4 + (i % 3) * 2} ry="3" fill="#b77a35" opacity="0.7" />)}
        <circle cx="282" cy="118" r="52" fill="#c7cdd3" />
        <circle cx="282" cy="118" r="44" fill="#d6a03a" />
        <circle cx="270" cy="106" r="20" fill="#e8b84e" opacity="0.6" />
        {R(5).map((i) => <circle key={i} cx={262 + (i * 17) % 44} cy={104 + ((i * 23) % 34)} r="7" fill={i % 2 ? '#fbf3dc' : '#e8833a'} />)}
        <circle cx="290" cy="208" r="34" fill="#c7cdd3" />
        <circle cx="290" cy="208" r="28" fill="#c03a2e" />
        {R(6).map((i) => <circle key={i} cx={278 + (i % 3) * 12} cy={198 + Math.floor(i / 3) * 16} r="6" fill={i % 2 ? '#7a3a1e' : '#d85a3a'} />)}
        <path d="M250 124 q20 -10 40 2" stroke="#fbf3dc" strokeWidth="3" fill="none" opacity="0.7" />
        <Vignette u={u} />
      </g>
    );
  return (
    <g>
      <Table {...c} />
      <ellipse cx="210" cy="164" rx="150" ry="104" fill={C.char} opacity="0.16" />
      <ellipse cx="200" cy="154" rx="150" ry="104" fill={C.white} />
      <ellipse cx="200" cy="154" rx="132" ry="88" fill="none" stroke={C.indigo} strokeWidth="2" opacity="0.3" />
      <path d="M90 150 Q90 90 170 84 Q200 84 196 150 Q200 220 160 222 Q92 222 90 150Z" fill="#fdfaf2" />
      {R(18).map((i) => <ellipse key={i} cx={110 + (i * 23) % 80} cy={100 + ((i * 41) % 110)} rx="3.5" ry="1.8" fill="#ece5d4" />)}
      <path d="M180 86 Q300 70 316 150 Q312 224 190 222 Q214 150 180 86Z" fill="#8f5420" />
      <path d="M200 100 Q280 92 296 140" stroke="#b9772e" strokeWidth="8" fill="none" opacity="0.5" strokeLinecap="round" />
      {chunks.map(([a, b], i) => <rect key={i} x={238 + a * 46} y={150 + b * 46} width={i % 3 ? 14 : 18} height={i % 3 ? 12 : 16} rx="4" fill={['#e8833a', '#f0d68a', '#6a3416'][i % 3]} transform={`rotate(${i * 25} ${245 + a * 46} ${156 + b * 46})`} />)}
      <path d="M120 196 q10 -10 22 -2 q-8 10 -22 2Z" fill="#c8323a" />
      <g transform="rotate(-32 320 240)">
        <ellipse cx="300" cy="240" rx="18" ry="11" fill="#c7cdd3" />
        <rect x="314" y="236" width="70" height="8" rx="4" fill="#c7cdd3" />
      </g>
      <Vignette u={u} />
    </g>
  );
}

function VeggieFood(c) {
  const { u, v, r } = c;
  const cx = 194, cy = 152;
  return (
    <g>
      <Table {...c} />
      <Bowl cx={cx} cy={cy} r={112} u={u} rim={mix(v.glaze, '#fff', 0.35)} broth="#f3ead6" id="veg">
        {R(16).map((i) => <circle key={i} cx={cx - 70 + (i * 37) % 140} cy={cy - 70 + ((i * 53) % 140)} r="1.4" fill="#d6c7a6" />)}
        <path d={`M${cx} ${cy} L${cx - 95} ${cy - 20} A96 96 0 0 1 ${cx - 20} ${cy - 95}Z`} fill="#5f9e4a" />
        {R(6).map((i) => <path key={i} d={`M${cx - 30 - i * 8} ${cy - 30 - (i % 2) * 20} q-14 -10 -20 6 q10 10 20 -6Z`} fill="#86c06a" />)}
        {R(4).map((i) => <rect key={i} x={cx + 6 + (i % 2) * 22} y={cy - 80 + Math.floor(i / 2) * 22} width="19" height="19" rx="2" fill="#fbf6ea" />)}
        {R(7).map((i) => <path key={i} d={`M${cx + 50} ${cy - 40 + i * 9} q20 -6 40 2`} stroke="#ef8a3a" strokeWidth="5" strokeLinecap="round" fill="none" />)}
        {R(10).map((i) => <circle key={i} cx={cx + 16 + (i % 4) * 13} cy={cy + 34 + Math.floor(i / 4) * 13} r="6" fill="#8cc152" />)}
        {[0, 1].map((i) => (
          <g key={i}>
            <circle cx={cx - 52 + i * 34} cy={cy + 46 - i * 12} r="17" fill="#f2e3c6" />
            {R(6).map((k) => <circle key={k} cx={cx - 52 + i * 34 + Math.cos(k) * 9} cy={cy + 46 - i * 12 + Math.sin(k) * 9} r="3" fill="#dcc79f" />)}
          </g>
        ))}
        <path d={`M${cx - 20} ${cy + 70} q30 -26 70 -6 q-20 24 -70 6Z`} fill="#e9a23b" />
        <path d={`M${cx - 60} ${cy + 8} q20 -14 40 0 q-20 10 -40 0Z`} fill="#8f4a8f" />
        {scatter(r, 30, cx, cy, 70, 70).map(([x, y], i) => <ellipse key={i} cx={x} cy={y} rx="1.4" ry="0.9" fill={i % 2 ? '#fbf6ea' : '#3a332a'} />)}
      </Bowl>
      <g>
        <circle cx="348" cy="246" r="28" fill="#000" opacity="0.08" />
        <circle cx="344" cy="242" r="26" fill={mix(v.glaze, '#fff', 0.2)} />
        <circle cx="344" cy="242" r="20" fill="#b3c46a" />
      </g>
      <g transform="rotate(-62 60 230)">
        <ellipse cx="60" cy="230" rx="14" ry="9" fill={C.wood} />
        <rect x="70" y="227" width="70" height="6" rx="3" fill={C.wood} />
      </g>
      <Vignette u={u} />
    </g>
  );
}

const Dango = ({ x, y, a = -20, s = 1 }) => (
  <g transform={`translate(${x} ${y}) rotate(${a}) scale(${s})`}>
    <line x1="-50" y1="0" x2="50" y2="0" stroke="#e2c48f" strokeWidth="3" strokeLinecap="round" />
    {['#f2a7b5', '#fbf6ea', '#8fbf6a'].map((col, i) => <g key={i}><circle cx={-22 + i * 24} cy="0" r="12" fill={col} /><circle cx={-26 + i * 24} cy="-4" r="4" fill="#fff" opacity="0.4" /></g>)}
  </g>
);
const Matcha = ({ x, y, r = 56, glaze }) => (
  <g>
    <circle cx={x + 8} cy={y + 10} r={r + 4} fill="#000" opacity="0.12" />
    <circle cx={x} cy={y} r={r} fill={glaze} />
    <path d={`M${x - r} ${y} A${r} ${r} 0 0 1 ${x + r} ${y} Q${x + r * 0.6} ${y - r * 0.1} ${x + r * 0.3} ${y + r * 0.15} Q${x} ${y - r * 0.05} ${x - r * 0.4} ${y + r * 0.2} Z`} fill={mix(glaze, '#fff', 0.2)} opacity="0.5" />
    <circle cx={x} cy={y} r={r * 0.78} fill="#7fa33d" />
    <circle cx={x - r * 0.12} cy={y - r * 0.12} r={r * 0.5} fill="#9cbf4f" />
    {R(18).map((i) => <circle key={i} cx={x + Math.cos(i * 2.2) * r * 0.06 * (i % 9)} cy={y + Math.sin(i * 2.2) * r * 0.06 * (i % 9)} r="1.4" fill="#c6dd8a" />)}
  </g>
);
function TeaFood(c) {
  const { u, v } = c;
  return (
    <g>
      <Table {...c} />
      <Tray x={30} y={44} w={340} h={212} c="#2f2a26" />
      <rect x="54" y="66" width="140" height="168" fill="#d8cdb6" opacity="0.5" />
      <Matcha x={140} y={148} r={64} glaze={v.glaze} />
      <ellipse cx="288" cy="210" rx="62" ry="28" fill={C.white} />
      <Dango x={286} y={206} a={-14} s={1.05} />
      <rect x="230" y="70" width="104" height="80" rx="4" fill={mix(v.glaze, '#fff', 0.5)} />
      <path d="M282 92 q16 -14 24 6 q12 16 -6 24 q-16 12 -24 -6 q-14 -16 6 -24Z" fill="#f2a7b5" />
      <circle cx="286" cy="108" r="5" fill="#f6d36a" />
      <line x1="244" y1="138" x2="320" y2="128" stroke={C.woodD} strokeWidth="2.5" strokeLinecap="round" />
      <Vignette u={u} />
    </g>
  );
}

function TempuraFood(c) {
  const { u } = c;
  return (
    <g>
      <Table {...c} />
      <Tray x={40} y={40} w={320} h={220} c="#2b2d31" />
      <path d="M90 80 L310 70 L320 220 L80 230 Z" fill="#f6efdc" />
      {R(4).map((i) => (
        <g key={i} transform={`rotate(${-30 + i * 12} 200 160)`}>
          <path d={`M${110 + i * 8} ${150 + i * 6} Q140 ${120 + i * 6} 260 ${136 + i * 6} L290 ${126 + i * 6} L284 ${148 + i * 6} L262 ${150 + i * 6} Q140 ${178 + i * 6} ${110 + i * 8} ${150 + i * 6}Z`} fill={i % 2 ? '#e3b25c' : '#efc879'} />
          {R(6).map((k) => <circle key={k} cx={140 + k * 20} cy={146 + i * 6 + (k % 2) * 6} r="4" fill="#f8dc9c" />)}
        </g>
      ))}
      <path d="M284 128 l18 -10 l-4 12Z" fill="#e2563d" />
      <circle cx="320" cy="230" r="26" fill={C.white} />
      <circle cx="320" cy="230" r="20" fill="#7a4a22" />
      <Vignette u={u} />
    </g>
  );
}


function SeafoodFood(c) {
  const { u, v, r } = c;
  const cx = 196, cy = 150;
  const slices = [['#c8323a', '#e5737a'], ['#f08a4b', '#fcd3b4'], ['#f4ece4', '#d9d2cc'], ['#c8323a', '#e5737a'], ['#f08a4b', '#fcd3b4'], ['#f6d7c8', '#fff']];
  return (
    <g>
      <Table {...c} />
      <Chopsticks x={330} y={252} a={-28} />
      <g>
        <circle cx="336" cy="60" r="26" fill="#000" opacity="0.08" />
        <circle cx="332" cy="56" r="24" fill={C.white} />
        <circle cx="332" cy="56" r="18" fill="#3a1f14" />
      </g>
      <Bowl cx={cx} cy={cy} r={110} u={u} rim={RIMS[v.bowl]} broth="#fbf7ee" id="kaisen">
        {slices.map(([a, b], i) => (
          <g key={i} transform={`rotate(${i * 52 + 10} ${cx} ${cy})`}>
            <rect x={cx + 14} y={cy - 15} width="70" height="30" rx="12" fill={a} />
            <path d={`M${cx + 30} ${cy - 13} q6 12 0 26 M${cx + 50} ${cy - 13} q6 12 0 26 M${cx + 68} ${cy - 12} q5 12 0 24`} stroke={b} strokeWidth="2.4" fill="none" opacity="0.8" />
          </g>
        ))}
        <path d={`M${cx - 20} ${cy - 30} q28 -22 50 4 q-26 26 -50 -4Z`} fill="#5f9e3a" />
        {scatter(r, 16, cx - 4, cy + 8, 18, 14).map(([x, y], i) => <g key={i}><circle cx={x} cy={y} r="5" fill="#f06a1f" /><circle cx={x - 1.5} cy={y - 1.5} r="1.6" fill="#ffd2a8" /></g>)}
        <circle cx={cx + 24} cy={cy - 8} r="7" fill="#9cc96e" />
      </Bowl>
      <Vignette u={u} />
    </g>
  );
}

function GrillFood(c) {
  const { u, r } = c;
  return (
    <g>
      <Table {...c} />
      <circle cx="210" cy="164" r="122" fill={`url(#${u}soft)`} />
      <circle cx="200" cy="152" r="112" fill="#1d1f23" />
      <circle cx="200" cy="152" r="98" fill="#3a3d42" />
      {R(18).map((i) => <path key={i} d={`M${200 + Math.cos(i * 0.349) * 30} ${152 + Math.sin(i * 0.349) * 30} L${200 + Math.cos(i * 0.349) * 94} ${152 + Math.sin(i * 0.349) * 94}`} stroke="#55595f" strokeWidth="3" />)}
      <circle cx="184" cy="134" r="34" fill="#fff" opacity="0.06" />
      {R(5).map((i) => (
        <g key={i} transform={`rotate(${i * 72 + 20} 200 152)`}>
          <path d="M214 140 q26 -10 44 6 q-4 18 -30 18 q-18 -2 -14 -24Z" fill="#a8584a" />
          <path d="M214 140 q26 -10 44 6" stroke="#ecd0bc" strokeWidth="4" fill="none" />
        </g>
      ))}
      {R(8).map((i) => {
        const a = i * 0.785 + 0.3, x = 200 + Math.cos(a) * 104, y = 152 + Math.sin(a) * 104;
        return i % 2 ? <circle key={i} cx={x} cy={y} r="11" fill="none" stroke="#f3ead6" strokeWidth="4" /> : <path key={i} d={`M${x - 12} ${y} a12 12 0 0 1 24 0`} stroke={i % 4 ? '#7cae4a' : '#ef8a3a'} strokeWidth="7" fill="none" strokeLinecap="round" />;
      })}
      {scatter(r, 14, 200, 152, 90, 90).filter(([x, y]) => Math.hypot(x - 200, y - 152) > 84 && Math.hypot(x - 200, y - 152) < 104).map(([x, y], i) => <path key={i} d={`M${x} ${y} q6 -6 12 0`} stroke="#fbf6ea" strokeWidth="2.5" fill="none" />)}
      <Steam x={200} y={100} s={1.3} o={0.4} />
      <circle cx="350" cy="250" r="24" fill={C.white} />
      <circle cx="350" cy="250" r="18" fill="#5a2f1c" />
      <Mug x={58} y={86} />
      <Vignette u={u} />
    </g>
  );
}

const FOOD = {
  ramen: RamenFood, sushi: SushiFood, noodles: NoodleFood, okonomiyaki: OkonomiFood, yakitori: SkewerFood, izakaya: IzakayaFood,
  cafe: CafeFood, seafood: SeafoodFood, grill: GrillFood, teishoku: TeishokuFood, curry: CurryFood, veggie: VeggieFood, tea: TeaFood, tempura: TempuraFood,
};

/* ───────── RESTAURANT: inside ───────── */
function Inside(c) {
  const { u, v, s } = c;
  const cafe = s === 'cafe' || s === 'veggie' || s === 'tea';
  const tags = ['izakaya', 'yakitori', 'ramen', 'noodles', 'teishoku', 'okonomiyaki', 'tempura'].includes(s);
  const wall = cafe ? mix(v.cafeWall, '#fff', 0.55) : v.wall;
  const cook = { shirt: cafe ? C.char : C.white, apron: v.noren === C.cream ? C.indigo : v.noren, band: cafe ? null : s === 'sushi' ? null : v.noren === C.char ? C.red : C.white, cap: s === 'sushi' ? C.white : null };
  return (
    <g>
      <rect width="400" height="200" fill={wall} />
      <rect width="400" height="200" fill={`url(#${u}light)`} />
      <rect y="0" width="400" height="10" fill={C.woodD} />
      {R(8).map((i) => <rect key={i} x={i * 56} y="10" width="6" height="190" fill={C.woodD} opacity="0.12" />)}
      {[56, 100].map((y) => (
        <g key={y}>
          <rect x="22" y={y} width="150" height="5" fill={C.woodD} />
          {R(6).map((i) =>
            cafe ? (
              <g key={i}>{i % 2 ? <Cup x={36 + i * 24} y={y} c={C.white} w={16} h={12} /> : <rect x={28 + i * 24} y={y - 26} width="16" height="26" rx="3" fill={['#7a4a2a', '#c9a06c', '#4a3a2a'][i % 3]} opacity="0.85" />}</g>
            ) : (
              <Bottle key={i} x={36 + i * 24} y={y} h={36 + ((i * 7 + y) % 12)} c={['#2f5a3e', '#6b3d22', '#d8e2dc', '#1f3a5a'][(i + y) % 4]} label={i % 2 ? C.cream : '#f0e0b0'} />
            ),
          )}
        </g>
      ))}
      {tags && R(6).map((i) => (
        <g key={i}>
          <rect x={212 + i * 20} y="22" width="16" height="56" rx="1.5" fill={mix(C.wood, '#fff', 0.35)} />
          <Strokes x={212 + i * 20} y={26} w={16} h={44} c={i === 2 ? C.red : C.char} n={3} vertical />
        </g>
      ))}
      {!tags && (
        <g>
          <rect x="214" y="22" width="118" height="62" rx="3" fill={cafe ? '#2f3a36' : C.woodD} />
          <rect x="220" y="28" width="106" height="50" rx="2" fill={cafe ? '#384740' : mix(C.wood, '#fff', 0.3)} />
          {R(3).map((i) => <Strokes key={i} x={226} y={32 + i * 15} w={70} h={10} c={cafe ? C.cream : C.char} n={3} />)}
        </g>
      )}
      <rect x="342" y="40" width="58" height="160" fill={mix(wall, C.char, 0.55)} />
      <Noren x={342} y={40} w={58} h={52} color={cook.apron} emblem={v.emblem} panels={2} />
      {[110, 290].map((x) => (
        <g key={x}>
          <path d={`M${x} 0 V44`} stroke={C.char} strokeWidth="1.5" />
          <path d={`M${x - 18} 62 Q${x} 34 ${x + 18} 62 Z`} fill={cafe ? C.mustard : mix(C.cream, C.wood, 0.3)} />
          <Glow x={x} y={70} r={60} u={u} o={0.7} />
        </g>
      ))}
      <Person x={250} y={250} s={1.15} shirt={cook.shirt} apron={cook.apron} band={cook.band} cap={cook.cap} />
      {(s === 'sushi' || s === 'seafood') && (
        <g>
          <rect x="60" y="150" width="280" height="34" rx="3" fill="#cfe3ee" opacity="0.6" />
          {R(7).map((i) => <rect key={i} x={70 + i * 38} y="168" width="30" height="12" rx="5" fill={['#c8323a', '#f08a4b', '#efe6dc', '#f3c54a'][i % 4]} />)}
          <rect x="60" y="150" width="280" height="3" fill="#fff" opacity="0.7" />
        </g>
      )}
      <rect x="0" y="184" width="400" height="16" fill={mix(C.wood, '#fff', 0.25)} />
      <rect x="0" y="198" width="400" height="6" fill={C.woodD} opacity="0.5" />
      <rect x="0" y="204" width="400" height="66" fill={`url(#${u}wood)`} />
      {R(14).map((i) => <line key={i} x1={i * 30} y1="204" x2={i * 30} y2="270" stroke={C.woodD} strokeOpacity="0.35" />)}
      {s === 'okonomiyaki' && <rect x="40" y="182" width="320" height="12" rx="2" fill="#3a3d42" />}
      <CounterItems s={s} u={u} v={v} />
      <rect y="270" width="400" height="30" fill={mix(C.woodD, '#000', 0.35)} />
      {[70, 160, 250, 340].map((x) => (
        <g key={x}>
          <rect x={x - 3} y="262" width="6" height="38" fill={C.char} />
          <ellipse cx={x} cy="262" rx="26" ry="8" fill={mix(v.accent, '#000', 0.25)} />
          <ellipse cx={x} cy="258" rx="26" ry="8" fill={v.accent} />
          <ellipse cx={x - 8} cy="256" rx="10" ry="3" fill="#fff" opacity="0.25" />
        </g>
      ))}
      <Vignette u={u} />
    </g>
  );
}

function CounterItems({ s, u, v }) {
  const top = 186;
  switch (s) {
    case 'ramen':
    case 'noodles':
      return <g><SideBowl x={120} y={top} w={40} c={RIMS[v.bowl]} fill={v.broth} band={C.red} /><Steam x={120} y={top - 22} s={0.6} /><SideBowl x={330} y={top} w={40} c={RIMS[v.bowl]} fill={v.broth} band={C.red} /><Cup x={70} y={top} c="#cfd6dc" w={14} h={18} /></g>;
    case 'yakitori':
      return <g><rect x="80" y="160" width="110" height="20" rx="3" fill="#3a3d42" />{R(5).map((i) => <g key={i}><line x1={92 + i * 20} y1="166" x2={100 + i * 20} y2="150" stroke="#e2c48f" strokeWidth="2" /><circle cx={96 + i * 20} cy="160" r="5" fill="#9a5a2a" /></g>)}<Steam x={135} y={150} s={0.8} o={0.4} /><Mug x={330} y={top} /><Mug x={80} y={top + 2} /></g>;
    case 'okonomiyaki':
      return <g>{[110, 330].map((x) => <g key={x}><ellipse cx={x} cy="186" rx="30" ry="7" fill="#a8682f" /><ellipse cx={x} cy="185" rx="26" ry="5" fill="#5a2f1c" /></g>)}<Steam x={110} y={170} s={0.6} /></g>;
    case 'cafe':
    case 'veggie':
      return <g><Cup x={90} y={top} c={C.white} w={18} h={13} fill="#4a2a18" /><g><rect x="318" y={top - 50} width="4" height="50" fill={C.char} /><circle cx="320" cy={top - 30} r="12" fill="#cfe3ee" opacity="0.8" /><path d={`M312 ${top - 60} h16 l-4 14 h-8z`} fill="#cfe3ee" opacity="0.8" /><rect x="306" y={top - 4} width="28" height="4" fill={C.char} /></g><SideBowl x={140} y={top} w={30} c={C.white} fill="#9cc96e" /></g>;
    case 'sushi':
      return <g><rect x="90" y={top - 4} width="50" height="6" rx="2" fill="#e2c08f" /><Cup x={330} y={top} c="#9fb7a8" w={16} h={20} fill="#6b8f4a" /></g>;
    case 'izakaya':
      return <g><Tokkuri x={86} y={top} /><Cup x={110} y={top} w={12} h={8} /><Mug x={330} y={top} /><SideBowl x={150} y={top} w={30} c="#3e4f6b" fill="#7cae4a" /></g>;
    case 'tea':
      return <g><SideBowl x={100} y={top} w={34} c={v.glaze} fill="#8fb64a" /><Cup x={330} y={top} c={C.white} w={14} h={14} fill="#a9b56b" /></g>;
    default:
      return <g><SideBowl x={100} y={top} w={34} c={C.white} fill="#fbf6ea" band={C.indigo} /><SideBowl x={140} y={top} w={34} c="#6e2a22" fill="#b87a3e" /><Cup x={330} y={top} c="#cfd6dc" w={14} h={18} /></g>;
  }
}

/* ───────── EXPERIENCES ───────── */
function Room({ u, v, floor = 'tatami' }) {
  return (
    <g>
      <rect width="400" height="180" fill={`url(#${u}wall)`} />
      {floor === 'tatami' ? (
        <g>
          <rect y="170" width="400" height="130" fill={`url(#${u}tatami)`} />
          {R(12).map((i) => <path key={i} d={`M${-300 + i * 70} 300 L${80 + i * 25} 170`} stroke="#a59559" strokeOpacity="0.25" fill="none" />)}
          <path d="M0 236 H400" stroke="#2f4a35" strokeWidth="8" />
        </g>
      ) : (
        <g>
          <rect y="170" width="400" height="130" fill={mix(C.wood, '#fff', 0.15)} />
          {R(8).map((i) => <path key={i} d={`M${-200 + i * 90} 300 L${60 + i * 40} 170`} stroke={C.woodD} strokeOpacity="0.25" fill="none" />)}
        </g>
      )}
      <rect y="166" width="400" height="6" fill={C.woodD} />
    </g>
  );
}
const Shoji = ({ x, y, w, h, lit }) => (
  <g>
    <rect x={x} y={y} width={w} height={h} fill={lit ? '#fff4d8' : '#fbf6ea'} />
    {R(Math.floor(w / 20)).map((i) => <rect key={i} x={x + i * 20} y={y} width="2" height={h} fill={C.wood} />)}
    {R(Math.floor(h / 26)).map((i) => <rect key={i} x={x} y={y + i * 26} width={w} height="2" fill={C.wood} />)}
    <rect x={x} y={y} width={w} height={h} fill="none" stroke={C.woodD} strokeWidth="2" />
  </g>
);

function TeaMain(c) {
  const { u, v } = c;
  return (
    <g>
      <Room {...c} />
      <Shoji x={190} y={20} w={210} h={146} lit />
      <rect x="20" y="10" width="140" height="160" fill={mix(v.wall, C.char, 0.08)} />
      <rect x="58" y="22" width="60" height="112" fill={C.cream} stroke={C.woodD} strokeWidth="2" />
      <path d="M66 110 Q78 80 90 98 Q100 70 112 104" stroke={C.char} strokeWidth="2" fill="none" opacity="0.5" />
      <circle cx="100" cy="50" r="7" fill={C.red} opacity="0.7" />
      <rect x="20" y="160" width="140" height="10" fill={C.woodD} />
      <path d="M40 160 q8 -30 24 -40 M48 160 q-4 -20 -18 -30" stroke={C.green} strokeWidth="2" fill="none" />
      <ellipse cx="44" cy="160" rx="10" ry="4" fill={C.char} />
      <g>
        <Shadow cx={88} cy={230} rx={44} ry={9} u={u} />
        <path d="M58 190 Q58 230 88 230 Q118 230 118 190 Z" fill="#30333a" />
        <ellipse cx="88" cy="190" rx="30" ry="7" fill="#3c4048" />
        <rect x="76" y="176" width="24" height="12" rx="3" fill="#30333a" />
        <Steam x={88} y={174} s={0.6} />
      </g>
      <Shadow cx={208} cy={262} rx={64} ry={12} u={u} />
      <path d="M152 214 Q154 260 204 262 Q256 260 258 214 Z" fill={v.glaze} />
      <path d="M158 226 Q170 250 204 254" stroke={mix(v.glaze, '#fff', 0.3)} strokeWidth="5" fill="none" opacity="0.5" />
      <ellipse cx="205" cy="214" rx="53" ry="12" fill={mix(v.glaze, '#000', 0.2)} />
      <ellipse cx="205" cy="215" rx="47" ry="9" fill="#8fb64a" />
      <ellipse cx="200" cy="214" rx="24" ry="4" fill="#b3cf6a" />
      <g>
        <Shadow cx={306} cy={262} rx={22} ry={5} u={u} />
        <path d="M290 236 Q284 254 296 260 H316 Q328 254 322 236 Z" fill="#efe3c3" />
        {R(7).map((i) => <line key={i} x1={292 + i * 4.5} y1="238" x2={294 + i * 4} y2="258" stroke="#cdb98a" />)}
        <rect x="298" y="206" width="16" height="32" rx="3" fill="#e6d3a6" />
        <rect x="298" y="230" width="16" height="4" fill="#3a2a22" />
      </g>
      <line x1="232" y1="276" x2="300" y2="282" stroke={C.woodD} strokeWidth="3" strokeLinecap="round" />
      <g>
        <Shadow cx={345} cy={250} rx={18} ry={4} u={u} />
        <rect x="330" y="222" width="30" height="28" rx="4" fill="#1d1d22" />
        <ellipse cx="345" cy="222" rx="15" ry="4" fill="#2a2a30" />
        <rect x="330" y="230" width="30" height="2" fill={C.mustard} />
      </g>
      <Vignette u={u} />
    </g>
  );
}
function TeaActivity(c) {
  const { u, v } = c;
  return (
    <g>
      <TableFront {...c} wall={mix(v.wall, C.green, 0.15)} bokeh={false} />
      <Shoji x={0} y={0} w={400} h={140} lit />
      <rect y="140" width="400" height="12" fill={C.woodD} />
      <rect x="40" y="212" width="320" height="70" rx="4" fill="#efe3cf" opacity="0.8" />
      <g>
        <Shadow cx={136} cy={262} rx={64} ry={12} u={u} />
        <path d="M86 248 H186 V262 Q136 270 86 262Z" fill="#7f7b75" />
        <rect x="86" y="206" width="100" height="42" rx="3" fill="#9a958d" />
        <rect x="86" y="166" width="100" height="40" rx="3" fill="#aaa59c" />
        <ellipse cx="136" cy="166" rx="50" ry="8" fill="#bdb8af" />
        <rect x="184" y="180" width="34" height="8" rx="4" fill={C.woodD} />
        <rect x="128" y="148" width="16" height="18" rx="3" fill={C.woodD} />
        <path d="M86 250 Q136 244 186 250" stroke="#8fb64a" strokeWidth="6" />
        {R(8).map((i) => <circle key={i} cx={92 + i * 12} cy={252 + (i % 2) * 2} r="2.5" fill="#8fb64a" />)}
      </g>
      <g>
        <Shadow cx={270} cy={262} rx={28} ry={6} u={u} />
        <rect x="246" y="196" width="48" height="66" rx="4" fill={C.green} />
        <rect x="246" y="214" width="48" height="20" fill={C.cream} />
        <circle cx="270" cy="224" r="6" fill={C.green} />
        <rect x="244" y="190" width="52" height="10" rx="3" fill={mix(C.green, '#000', 0.2)} />
      </g>
      <SideBowl x={334} y={264} w={50} c={v.glaze} fill="#a6c75a" />
      <Vignette u={u} />
    </g>
  );
}
function TeaField(c) {
  const { u, v } = c;
  return (
    <g>
      <Sky {...c} />
      <Mountains y={150} />
      <path d="M0 150 Q200 120 400 150 V300 H0Z" fill="#7fb35e" />
      {R(7).map((i) => (
        <path key={i} d={`M-20 ${300 - i * 22} Q200 ${250 - i * 24} 420 ${290 - i * 22}`} stroke={i % 2 ? '#4f8f3a' : '#5f9e4a'} strokeWidth={30 - i * 3.2} strokeLinecap="round" fill="none" />
      ))}
      {R(7).map((i) => <path key={i} d={`M-20 ${292 - i * 22} Q200 ${242 - i * 24} 420 ${282 - i * 22}`} stroke="#9cd06a" strokeWidth={6 - i * 0.6} strokeOpacity="0.6" fill="none" strokeLinecap="round" />)}
      <Tree x={60} y={160} s={0.8} c={C.green} />
      <Tree x={350} y={156} s={0.7} c={C.green} />
      <Person x={250} y={258} s={0.9} shirt={C.indigo} hat="#e6cf8a" apron={C.cream} />
      <rect x="226" y="222" width="18" height="16" rx="4" fill="#c9a06c" />
      <Tint v={v} />
    </g>
  );
}

function PotteryMain(c) {
  const { u, v } = c;
  return (
    <g>
      <Room {...c} floor="wood" />
      {[48, 104].map((y) => (
        <g key={y}>
          <rect x="230" y={y} width="150" height="5" fill={C.woodD} />
          {R(5).map((i) => <path key={i} d={`M${244 + i * 28} ${y} q-8 -20 0 -${18 + (i % 3) * 6} h12 q8 ${18 - (i % 3)} 0 ${18 + (i % 3) * 6}z`} fill={i % 2 ? '#d8c3a8' : '#e6d6c0'} />)}
        </g>
      ))}
      <rect x="20" y="40" width="90" height="70" fill={v.sky[1]} stroke={C.woodD} strokeWidth="3" />
      <path d="M65 40 V110 M20 75 H110" stroke={C.woodD} strokeWidth="2" />
      <Shadow cx={210} cy={276} rx={150} ry={22} u={u} />
      <path d="M90 246 L110 276 H310 L330 246 Z" fill="#5a5e65" />
      <ellipse cx="210" cy="246" rx="120" ry="24" fill="#6c7078" />
      <ellipse cx="210" cy="240" rx="88" ry="16" fill="#8a8f97" />
      <path d="M150 248 A70 12 0 0 0 270 248" stroke="#fff" strokeOpacity="0.3" strokeWidth="2" fill="none" />
      <path d="M160 240 Q140 190 170 160 Q178 150 176 140 H244 Q242 150 250 160 Q280 190 260 240 Z" fill={C.clay} />
      <ellipse cx="210" cy="140" rx="34" ry="7" fill={mix(C.clay, '#000', 0.3)} />
      <path d="M176 160 Q160 196 172 234" stroke="#fff" strokeOpacity="0.3" strokeWidth="5" fill="none" strokeLinecap="round" />
      {R(4).map((i) => <path key={i} d={`M${166 + i} ${176 + i * 16} Q210 ${184 + i * 16} ${254 - i} ${176 + i * 16}`} stroke={mix(C.clay, '#000', 0.15)} strokeWidth="1.5" fill="none" />)}
      {[0, 1].map((d) => (
        <g key={d} transform={d ? 'translate(420 0) scale(-1 1)' : undefined}>
          <path d="M30 310 L128 222" stroke={v.noren} strokeWidth="30" strokeLinecap="round" />
          <path d="M116 226 Q136 200 160 190 Q174 186 176 200 Q178 216 160 224 Q142 234 124 240Z" fill={C.skin} />
          <path d="M146 204 q10 -6 18 -2 M144 214 q10 -5 18 -1" stroke={mix(C.skin, '#000', 0.18)} strokeWidth="1.5" fill="none" />
        </g>
      ))}
      <g>
        <path d="M30 264 L36 230 H84 L90 264 Z" fill="#7a8a96" />
        <ellipse cx="60" cy="230" rx="24" ry="5" fill="#a9c4d6" />
        <rect x="340" y="250" width="34" height="16" rx="6" fill="#e3c86a" />
      </g>
      <Vignette u={u} />
    </g>
  );
}
function Shelf({ u, v, children, wall }) {
  return (
    <g>
      <rect width="400" height="300" fill={wall ?? `url(#${u}wall)`} />
      <rect width="400" height="300" fill={`url(#${u}light)`} />
      {[120, 214].map((y) => <g key={y}><rect x="20" y={y} width="360" height="10" fill={C.wood} /><rect x="20" y={y + 10} width="360" height="5" fill={C.woodD} /><rect x="20" y={y + 15} width="360" height="8" fill="#000" opacity="0.05" /></g>)}
      <rect x="20" y="0" width="10" height="300" fill={C.woodD} />
      <rect x="370" y="0" width="10" height="300" fill={C.woodD} />
      {children}
      <rect y="270" width="400" height="30" fill={mix(C.woodD, '#000', 0.2)} />
      <Vignette u={u} />
    </g>
  );
}
const Pot = ({ x, y, w, h, c, shape = 0 }) => {
  const paths = [
    `M${x - w / 2} ${y - h} Q${x - w / 2} ${y} ${x - w * 0.3} ${y} H${x + w * 0.3} Q${x + w / 2} ${y} ${x + w / 2} ${y - h} Z`,
    `M${x - w * 0.18} ${y - h} Q${x - w * 0.2} ${y - h * 0.7} ${x - w / 2} ${y - h * 0.4} Q${x - w / 2} ${y} ${x} ${y} Q${x + w / 2} ${y} ${x + w / 2} ${y - h * 0.4} Q${x + w * 0.2} ${y - h * 0.7} ${x + w * 0.18} ${y - h} Z`,
    `M${x - w / 2} ${y - h} L${x - w * 0.38} ${y} H${x + w * 0.38} L${x + w / 2} ${y - h} Z`,
  ];
  return (
    <g>
      <path d={paths[shape % 3]} fill={c} />
      <path d={`M${x - w * 0.3} ${y - h * 0.8} Q${x - w * 0.36} ${y - h * 0.4} ${x - w * 0.24} ${y - h * 0.15}`} stroke="#fff" strokeOpacity="0.3" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d={`M${x - w / 2} ${y - h * 0.82} q${w * 0.25} ${h * 0.25} ${w / 2} 0 t${w / 2} 0`} stroke={mix(c, '#fff', 0.35)} strokeWidth="3" fill="none" opacity="0.6" />
    </g>
  );
};
function PotteryActivity(c) {
  const { v } = c;
  const glazes = [v.glaze, '#9fc2b0', '#4a3426', '#efe6d6', C.indigo, '#b8643c', '#c9b98a'];
  return (
    <Shelf {...c}>
      {R(6).map((i) => <Pot key={i} x={60 + i * 56} y={120} w={30 + (i % 3) * 10} h={40 + ((i * 7) % 4) * 10} c={glazes[(i + 2) % 7]} shape={i} />)}
      {R(5).map((i) => <Pot key={i} x={70 + i * 66} y={214} w={44 - (i % 2) * 10} h={28 + (i % 3) * 14} c={glazes[i % 7]} shape={i + 1} />)}
      <ellipse cx="200" cy="262" rx="70" ry="10" fill={glazes[1]} />
      <ellipse cx="200" cy="258" rx="70" ry="12" fill={mix(glazes[1], '#fff', 0.2)} />
    </Shelf>
  );
}

function House({ x = 200, y = 230, w = 220, noren = C.indigo, emblem = 'ring', okinawa, thatch }) {
  const h = 70;
  const roofC = okinawa ? '#c8553d' : thatch ? '#a88a5a' : C.roof;
  return (
    <g>
      <rect x={x - w / 2} y={y - h} width={w} height={h} fill={okinawa ? '#ece3d0' : C.cream} />
      <rect x={x - w / 2} y={y - 20} width={w} height="20" fill={C.woodD} opacity="0.85" />
      {thatch ? (
        <path d={`M${x - w / 2 - 18} ${y - h + 4} L${x - w * 0.25} ${y - h - 60} H${x + w * 0.25} L${x + w / 2 + 18} ${y - h + 4} Z`} fill={roofC} />
      ) : (
        <path d={`M${x - w / 2 - 18} ${y - h + 4} L${x - w * 0.3} ${y - h - 34} H${x + w * 0.3} L${x + w / 2 + 18} ${y - h + 4} Z`} fill={roofC} />
      )}
      {!thatch && R(14).map((i) => <line key={i} x1={x - w * 0.3 + (i * w * 0.6) / 13} y1={y - h - 32} x2={x - w / 2 - 14 + (i * (w + 28)) / 13} y2={y - h + 2} stroke="#fff" strokeOpacity={okinawa ? 0.5 : 0.1} />)}
      {thatch && R(10).map((i) => <path key={i} d={`M${x - w / 2 - 10 + i * (w + 20) / 9} ${y - h + 2} l3 -10`} stroke="#7a6038" />)}
      <rect x={x - w / 2 - 18} y={y - h} width={w + 36} height="5" fill={mix(roofC, '#000', 0.3)} />
      <Lattice x={x - w / 2 + 16} y={y - h + 14} w={60} h={38} gap={5} />
      <rect x={x + 6} y={y - h + 10} width={56} height={h - 10} fill="#4a3d33" />
      <Noren x={x + 6} y={y - h + 10} w={56} h={32} color={noren} emblem={emblem} panels={2} />
      <Lattice x={x + w / 2 - 50} y={y - h + 14} w={36} h={38} gap={5} />
    </g>
  );
}
function Countryside(c, prop) {
  const { u, v } = c;
  return (
    <g>
      <Sky {...c} />
      <Mountains y={180} />
      <path d="M0 180 Q200 160 400 182 V300 H0Z" fill={`url(#${u}grass)`} />
      <Tree x={40} y={210} s={1.1} />
      <Tree x={70} y={196} s={0.8} c={C.green} />
      <Tree x={362} y={210} s={1.2} c={C.green} />
      <House x={200} y={232} w={210} noren={v.noren} emblem={v.emblem} thatch={v.garnish > 0.55} />
      <path d="M160 300 Q190 262 214 232 H236 Q232 262 250 300 Z" fill="#d9c9a4" />
      {prop}
      <Tint v={v} />
    </g>
  );
}

function IndigoCloth({ x, y, w, h, c, pat }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={c} />
      <rect x={x} y={y} width={w * 0.18} height={h} fill="#fff" opacity="0.08" />
      {pat === 0 && R(Math.floor(h / 18)).map((i) => R(Math.floor(w / 18)).map((j) => <circle key={i + '-' + j} cx={x + 9 + j * 18} cy={y + 12 + i * 18} r="3.2" fill="none" stroke="#e8eef6" strokeWidth="1.6" opacity="0.8" />))}
      {pat === 1 && R(3).map((i) => <circle key={i} cx={x + w / 2} cy={y + h * 0.45} r={6 + i * 9} fill="none" stroke="#e8eef6" strokeWidth="2" opacity="0.75" strokeDasharray="3 3" />)}
      {pat === 2 && R(Math.floor(h / 22)).map((i) => <path key={i} d={`M${x} ${y + 14 + i * 22} q${w / 4} -8 ${w / 2} 0 t${w / 2} 0`} stroke="#e8eef6" strokeWidth="2" fill="none" opacity="0.75" />)}
      <path d={`M${x} ${y + h} q${w / 4} 4 ${w / 2} 0 t${w / 2} 0`} fill={c} />
    </g>
  );
}
function IndigoMain(c) {
  const { u, v } = c;
  return (
    <g>
      <Sky {...c} />
      <path d="M0 200 V140 Q100 120 200 140 T400 130 V200Z" fill="#9fbf8a" opacity="0.7" />
      <rect y="200" width="400" height="100" fill="#d8ccb0" />
      <rect y="186" width="400" height="16" fill={C.woodD} />
      {R(20).map((i) => <rect key={i} x={i * 20 + 4} y="150" width="10" height="40" rx="2" fill={C.wood} />)}
      {[20, 380].map((x) => <rect key={x} x={x - 3} y="30" width="6" height="190" fill="#b8a46a" />)}
      <rect x="10" y="36" width="380" height="5" rx="2" fill="#c9b878" />
      {R(5).map((i) => <IndigoCloth key={i} x={30 + i * 72} y={40} w={58} h={130 + (i % 2) * 20} c={['#1d3557', '#2b4a78', '#4c74a6', '#20406b', '#6f93be'][i]} pat={(i + Math.floor(v.garnish * 3)) % 3} />)}
      <Shadow cx={320} cy={286} rx={70} ry={10} u={u} />
      <path d="M262 226 L270 286 H370 L378 226Z" fill={C.woodD} />
      {[240, 262].map((y) => <rect key={y} x="264" y={y} width="112" height="4" fill="#3a2a1e" />)}
      <ellipse cx="320" cy="226" rx="58" ry="12" fill={mix(C.woodD, '#000', 0.2)} />
      <ellipse cx="320" cy="227" rx="52" ry="9" fill="#14213d" />
      <ellipse cx="312" cy="226" rx="14" ry="4" fill="#5a4a8a" />
      <Person x={150} y={290} s={1.1} shirt={C.cream} apron={C.indigo} band={C.indigo} />
      <Tint v={v} />
    </g>
  );
}
function IndigoActivity(c) {
  const { u } = c;
  return (
    <g>
      <TableFront {...c} wall="#e9e1d2" bokeh={false} />
      <path d="M40 0 V110 M360 0 V110 M30 30 H370" stroke={C.wood} strokeWidth="4" />
      {R(4).map((i) => <IndigoCloth key={i} x={60 + i * 76} y={32} w={60} h={74} c={['#2b4a78', '#1d3557', '#6f93be', '#20406b'][i]} pat={i % 3} />)}
      <Shadow cx={200} cy={270} rx={150} ry={14} u={u} />
      <rect x="70" y="190" width="200" height="70" rx="3" fill="#2b4a78" transform="rotate(-4 170 225)" />
      <IndigoCloth x={74} y={194} w={192} h={62} c="#2b4a78" pat={0} />
      {R(4).map((i) => <rect key={i} x="282" y={246 - i * 12} width="86" height="12" rx="3" fill={['#1d3557', '#6f93be', '#2b4a78', '#a9c1dd'][i]} />)}
      {R(3).map((i) => <circle key={i} cx={110 + i * 24} cy="278" r="6" fill="#d7ccb8" />)}
      <Vignette u={u} />
    </g>
  );
}

function WashiMain(c) {
  const { u, v } = c;
  return (
    <g>
      <Room {...c} floor="wood" />
      {R(4).map((i) => <rect key={i} x={30 + i * 50} y={30 + (i % 2) * 6} width="40" height="110" fill={['#fbf6ea', '#f6e8e2', '#eef3e4', '#fbf6ea'][i]} stroke={C.wood} strokeWidth="2" />)}
      {[[52, 70, '#d6453d'], [104, 96, '#5c9a55'], [150, 64, '#e3b23c']].map(([x, y, col], i) => <path key={i} d={`M${x} ${y} q6 -8 10 0 q-4 8 -10 0`} fill={col} opacity="0.6" />)}
      <Shoji x={250} y={20} w={150} h={146} lit />
      <Shadow cx={200} cy={286} rx={170} ry={14} u={u} />
      <path d="M40 200 L54 284 H346 L360 200Z" fill={C.woodD} />
      <rect x="36" y="194" width="328" height="10" rx="2" fill={C.wood} />
      <rect x="44" y="204" width="312" height="18" fill="#dfe9ea" />
      <g transform="rotate(-6 200 186)">
        <rect x="96" y="168" width="208" height="30" rx="2" fill={C.wood} />
        <rect x="104" y="172" width="192" height="22" fill="#f6f2e6" />
        {R(10).map((i) => <line key={i} x1={104 + i * 20} y1="172" x2={104 + i * 20} y2="194" stroke="#e0d8c4" />)}
      </g>
      {R(5).map((i) => <path key={i} d={`M${120 + i * 40} 200 q-2 6 0 10 q2 -4 0 -10`} fill="#cfe3ee" />)}
      {[-1, 1].map((d) => <path key={d} d={`M${200 + d * 120} 210 Q${200 + d * 106} 186 ${200 + d * 92} 180 Q${200 + d * 86} 176 ${200 + d * 88} 172 L${200 + d * 100} 172 Q${200 + d * 114} 186 ${200 + d * 140} 206Z`} fill={C.skin} />)}
      <Vignette u={u} />
    </g>
  );
}
function WashiActivity(c) {
  const { u, v } = c;
  const cols = ['#f6e8e2', '#e8efe0', '#fbf6ea', '#e3edf6', '#f6ecd0', '#efe0ec'];
  return (
    <g>
      <TableFront {...c} wall={mix(v.wall, C.char, 0.06)} bokeh={false} />
      {R(5).map((i) => (
        <g key={i} transform={`rotate(${(i - 2) * 6} 200 220)`}>
          <rect x={70 + i * 46} y={150 + (i % 2) * 10} width="110" height="90" fill={cols[i]} />
          <path d={`M${100 + i * 46} ${190 + (i % 2) * 10} q10 -14 20 0 q-10 12 -20 0`} fill={[C.red, C.leaf, C.mustard, '#b07ab8', C.leaf][i]} opacity="0.55" />
          <path d={`M${130 + i * 46} ${210 + (i % 2) * 10} l16 -12`} stroke={C.leaf} strokeWidth="1.5" opacity="0.6" />
        </g>
      ))}
      <g>
        <path d="M300 40 V60" stroke={C.char} strokeWidth="1.5" />
        <path d="M276 60 H324 L334 122 H266Z" fill="#fff4d8" />
        <Glow x={300} y={92} r={60} u={u} />
      </g>
      <Vignette u={u} />
    </g>
  );
}

function CookMain(c) {
  const { u, v, place } = c;
  const wagashi = /和菓子|菓子|wagashi/i.test(`${place?.name} ${(place?.dishes ?? []).map((d) => d.name).join('')}`);
  return (
    <g>
      <TableFront {...c} wall={mix(v.wall, C.char, 0.05)} bokeh={false} />
      <Shoji x={220} y={0} w={180} h={140} lit />
      {R(3).map((i) => <rect key={i} x={30 + i * 50} y="26" width="36" height="5" fill={C.woodD} />)}
      {R(3).map((i) => <SideBowl key={i} x={48 + i * 50} y={26} w={26} c={[v.glaze, C.white, '#8c3f2e'][i]} fill="#f3ead6" />)}
      <Shadow cx={190} cy={270} rx={130} ry={14} u={u} />
      <rect x="70" y="190" width="220" height="74" rx="8" fill="#e9d2a8" />
      <rect x="70" y="256" width="220" height="8" rx="4" fill="#c9a06c" />
      {wagashi ? (
        R(4).map((i) => <g key={i}><circle cx={110 + i * 46} cy="222" r="17" fill={['#f2a7b5', '#9cc96e', '#f6d36a', '#c9a7d8'][i]} />{R(5).map((k) => <path key={k} d={`M${110 + i * 46} 222 L${110 + i * 46 + Math.cos(k * 1.26) * 17} ${222 + Math.sin(k * 1.26) * 17}`} stroke="#fff" strokeOpacity="0.5" />)}</g>)
      ) : (
        <g>
          <path d="M96 206 Q90 230 120 236 Q150 238 156 222 Q140 226 124 220 Q108 214 104 204Z" fill="#5a3a6a" />
          <path d="M100 206 l-6 -8 l10 2Z" fill={C.leaf} />
          <rect x="166" y="208" width="60" height="16" rx="8" fill="#6fa646" transform="rotate(-10 196 216)" />
          {R(4).map((i) => <circle key={i} cx={240 + (i % 2) * 22} cy={214 + Math.floor(i / 2) * 22} r="10" fill="#fbf6ea" stroke="#e6dfc8" strokeWidth="2" />)}
          <rect x="130" y="244" width="110" height="7" rx="3" fill="#cfd6dc" />
          <rect x="240" y="243" width="38" height="9" rx="4" fill={C.woodD} />
        </g>
      )}
      <g>
        <Shadow cx={340} cy={270} rx={30} ry={6} u={u} />
        <rect x="312" y="190" width="56" height="78" rx="8" fill="#e1eef0" opacity="0.85" />
        <rect x="316" y="214" width="48" height="50" rx="5" fill="#9b4a8a" />
        <rect x="316" y="214" width="48" height="12" fill="#c06aa8" />
        <rect x="308" y="182" width="64" height="12" rx="4" fill={C.woodD} />
      </g>
      <Vignette u={u} />
    </g>
  );
}
const Onigiri = ({ x, y, s = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M0 -26 Q6 -26 24 6 Q28 16 16 16 H-16 Q-28 16 -24 6 Q-6 -26 0 -26Z" fill="#fdfaf2" />
    <rect x="-12" y="0" width="24" height="16" fill="#1d2420" />
  </g>
);
function CookActivity(c) {
  const { u, v } = c;
  return (
    <g>
      <Table {...c} />
      <Tray x={40} y={40} w={320} h={220} c={mix(C.wood, '#fff', 0.2)} />
      <Onigiri x={110} y={120} s={1.3} />
      <Onigiri x={150} y={110} s={1.1} />
      <circle cx="270" cy="110" r="46" fill={v.glaze} />
      <circle cx="270" cy="110" r="38" fill="#7a2f5e" />
      {R(9).map((i) => <rect key={i} x={248 + (i % 3) * 14} y={92 + Math.floor(i / 3) * 12} width="10" height="7" rx="2" fill={i % 2 ? '#9b3a72' : '#b9579a'} />)}
      <rect x="80" y="180" width="110" height="60" rx="6" fill={C.white} />
      {R(6).map((i) => <circle key={i} cx={98 + i * 15} cy="208" r="9" fill={i % 2 ? '#a6c86a' : '#f2d24c'} />)}
      <circle cx="270" cy="210" r="34" fill={C.white} />
      {R(5).map((i) => <ellipse key={i} cx={258 + (i % 3) * 12} cy={202 + Math.floor(i / 3) * 14} rx="9" ry="6" fill={i % 2 ? '#e8833a' : '#9cc96e'} />)}
      <Chopsticks x={330} y={250} a={-80} />
      <Vignette u={u} />
    </g>
  );
}


function GlassMain(c) {
  const { u, v } = c;
  return (
    <g>
      <rect width="400" height="300" fill="#3a3236" />
      <rect y="250" width="400" height="50" fill="#2a2528" />
      <rect x="20" y="70" width="160" height="186" rx="10" fill="#6a4a3e" />
      {R(7).map((i) => <path key={i} d={`M20 ${96 + i * 24} H180`} stroke="#54392f" strokeWidth="2" />)}
      <rect x="10" y="60" width="180" height="16" rx="4" fill="#4e3a32" />
      <circle cx="100" cy="166" r="44" fill="#2a1a14" />
      <circle cx="100" cy="166" r="34" fill="#ff8a2a" />
      <circle cx="100" cy="166" r="20" fill="#ffd27a" />
      <Glow x={100} y={166} r={150} u={u} o={0.9} />
      <Person x={318} y={300} s={1.7} shirt={C.indigo} apron="#8a5a35" band={v.accent} />
      <path d="M290 236 L176 184" stroke="#c7cdd3" strokeWidth="4" strokeLinecap="round" />
      <circle cx="168" cy="180" r="15" fill="#ff9a3a" />
      <circle cx="164" cy="176" r="6" fill="#ffe0a0" />
      <Glow x={168} y={180} r={50} u={u} />
      <rect x="200" y="226" width="80" height="10" rx="3" fill="#5a5e65" />
      <Vignette u={u} />
    </g>
  );
}
function GlassActivity(c) {
  const cols = ['#5aa9d6', '#7cc4a4', '#e3a23c', '#c96a8a', '#3d6fb8', '#a8d8e8'];
  return (
    <Shelf {...c} wall="#e8eef0">
      {[120, 214].map((y, row) =>
        R(5).map((i) => (
          <g key={y + '-' + i} opacity="0.85">
            <Pot x={70 + i * 64 + row * 12} y={y} w={30 + ((i + row) % 3) * 8} h={34 + ((i * 5 + row) % 3) * 12} c={cols[(i + row * 2) % 6]} shape={i + row} />
            <ellipse cx={70 + i * 64 + row * 12} cy={y - 2} rx="12" ry="3" fill={cols[(i + row * 2) % 6]} opacity="0.5" />
          </g>
        )),
      )}
    </Shelf>
  );
}
function WoodMain(c) {
  const { u, r } = c;
  const woods = ['#c99a64', '#8a5a35', '#e3c493', '#5e3b24', '#b9875a'];
  return (
    <g>
      <TableFront {...c} wall="#e3d6bd" bokeh={false} />
      <rect x="40" y="20" width="320" height="110" rx="4" fill="#cdbb98" />
      {R(9).map((i) => R(3).map((j) => <circle key={i + '-' + j} cx={60 + i * 36} cy={40 + j * 34} r="2" fill="#a8946e" />))}
      <path d="M80 40 V110 M80 40 l26 0 l-4 10 h-22" stroke={C.char} strokeWidth="4" fill="none" />
      <path d="M150 44 l40 0 l0 50 l-40 20Z" fill="#c7cdd3" />
      <rect x="146" y="38" width="12" height="40" rx="3" fill={C.woodD} />
      {R(4).map((i) => <rect key={i} x={240 + i * 22} y="40" width="8" height="70" rx="3" fill={i % 2 ? C.woodD : C.wood} />)}
      <Shadow cx={200} cy={268} rx={160} ry={12} u={u} />
      <rect x="60" y="196" width="160" height="40" rx="3" fill="#e3c493" />
      <rect x="60" y="230" width="160" height="8" fill="#c9a06c" />
      <rect x="230" y="188" width="70" height="34" rx="6" fill={C.woodD} />
      <rect x="244" y="182" width="14" height="10" rx="3" fill="#6a4a2a" />
      <rect x="236" y="214" width="58" height="4" fill="#c7cdd3" />
      {R(4).map((i) => (
        <g key={i} transform={`rotate(${-6 + i * 3} 200 260)`}>
          <path d={`M90 ${248 + i * 10} L320 ${244 + i * 10} L320 ${248 + i * 10} L90 ${251 + i * 10}Z`} fill={woods[i]} />
        </g>
      ))}
      {scatter(r, 8, 140, 190, 60, 10).map(([x, y], i) => <path key={i} d={`M${x} ${y} a6 6 0 1 1 6 6 a4 4 0 1 1 -4 -4`} stroke="#e8cfa0" strokeWidth="2" fill="none" />)}
      <Vignette u={u} />
    </g>
  );
}

const Sugidama = ({ x, y, r = 26 }) => (
  <g>
    <path d={`M${x} ${y - r - 20} V${y - r}`} stroke={C.char} strokeWidth="2" />
    <circle cx={x} cy={y} r={r} fill="#5f8a3a" />
    {R(10).map((i) => <circle key={i} cx={x + Math.cos(i * 0.9) * r * 0.6} cy={y + Math.sin(i * 0.9) * r * 0.6} r={r * 0.22} fill={i % 2 ? '#6f9e45' : '#4f7a30'} />)}
  </g>
);
function SakeMain(c) {
  const { u, v } = c;
  return (
    <g>
      <TableFront {...c} wall="#3a2c24" />
      <Sugidama x={70} y={70} r={34} />
      {[200, 240, 280, 320, 360].map((x, i) => <Bottle key={x} x={x} y={150} h={90 + (i % 2) * 14} c={['#2f5a3e', '#6b3d22', '#d8e2dc', '#1f3a5a', '#2f5a3e'][i]} label={i % 2 ? C.cream : '#f0e0b0'} />)}
      <rect x="180" y="150" width="200" height="6" fill={C.woodD} />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <Shadow cx={110 + i * 80} cy={262} rx={30} ry={6} u={u} />
          <path d={`M${84 + i * 80} 214 L${90 + i * 80} 260 H${130 + i * 80} L${136 + i * 80} 214Z`} fill={C.white} />
          <ellipse cx={110 + i * 80} cy="214" rx="26" ry="7" fill="#eef3f6" />
          <ellipse cx={110 + i * 80} cy="215" rx="20" ry="5" fill="none" stroke="#2b5ea8" strokeWidth="2.5" />
          <ellipse cx={110 + i * 80} cy="215" rx="9" ry="2.2" fill="none" stroke="#2b5ea8" strokeWidth="2.5" />
        </g>
      ))}
      <g>
        <Shadow cx={340} cy={270} rx={30} ry={6} u={u} />
        <path d="M312 230 L370 230 L366 266 L316 266Z" fill="#e6cfa0" />
        <path d="M312 230 L370 230 L366 240 L316 240Z" fill="#d6b884" />
      </g>
      <Vignette u={u} />
    </g>
  );
}
const Barrel = ({ x, y, w = 90, h = 110 }) => (
  <g>
    <ellipse cx={x} cy={y} rx={w * 0.6} ry={7} fill={C.char} opacity="0.18" />
    <path d={`M${x - w / 2} ${y - h} Q${x - w * 0.56} ${y - h / 2} ${x - w / 2} ${y} H${x + w / 2} Q${x + w * 0.56} ${y - h / 2} ${x + w / 2} ${y - h} Z`} fill={C.wood} />
    {R(6).map((i) => <line key={i} x1={x - w / 2 + (i + 1) * (w / 7)} y1={y - h} x2={x - w / 2 + (i + 1) * (w / 7)} y2={y} stroke={C.woodD} strokeOpacity="0.4" />)}
    {[0.15, 0.5, 0.85].map((k) => <rect key={k} x={x - w * 0.54} y={y - h * k - 3} width={w * 1.08} height="6" rx="3" fill="#6a4a2a" />)}
    <ellipse cx={x} cy={y - h} rx={w / 2} ry="9" fill={mix(C.wood, '#fff', 0.2)} />
  </g>
);
function SakeActivity(c) {
  const { u, v } = c;
  return (
    <g>
      <rect width="400" height="300" fill="#3a2c24" />
      <path d="M0 0 H400 V40 L200 70 L0 40Z" fill="#2a1f19" />
      {R(5).map((i) => <rect key={i} x={i * 90 - 10} y="0" width="14" height="300" fill="#2a1f19" />)}
      <Glow x={200} y={60} r={140} u={u} o={0.4} />
      <rect y="230" width="400" height="70" fill="#5a4636" />
      <Barrel x={90} y={250} w={120} h={150} />
      <Barrel x={230} y={256} w={130} h={170} />
      <Barrel x={350} y={248} w={100} h={130} />
      <rect x="210" y="40" width="6" height="140" rx="3" fill="#d8c3a0" transform="rotate(14 213 110)" />
      <Vignette u={u} />
    </g>
  );
}
function SakeScene(c) {
  const { u, v } = c;
  return (
    <g>
      <Sky {...c} />
      <Mountains y={160} />
      <rect x="60" y="130" width="22" height="80" fill="#9a4a32" />
      <rect y="250" width="400" height="50" fill={`url(#${u}ground)`} />
      <path d="M20 106 L380 106 L360 84 L40 84Z" fill={C.roof} />
      <rect x="40" y="104" width="320" height="146" fill="#f6f1e6" />
      <rect x="40" y="190" width="320" height="60" fill="#30353b" />
      {R(16).map((i) => R(3).map((j) => <path key={i + '-' + j} d={`M${50 + i * 20} ${200 + j * 16} l8 6 l-8 6 l-8 -6Z`} fill="#f6f1e6" />))}
      <rect x="170" y="150" width="70" height="100" fill="#4a3d33" />
      <Noren x={170} y={150} w={70} h={40} color={v.noren} emblem={v.emblem} panels={2} />
      <Sugidama x={268} y={150} r={18} />
      <rect x="90" y="124" width="28" height="22" fill="#30353b" />
      <rect x="290" y="124" width="28" height="22" fill="#30353b" />
      <Tint v={v} />
    </g>
  );
}

function Sanshin({ x, y, a = -55, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${a}) scale(${s})`}>
      <rect x="-4" y="-150" width="8" height="140" rx="3" fill="#1d1d22" />
      <path d="M-6 -150 Q-10 -166 0 -172 Q8 -170 6 -150Z" fill="#1d1d22" />
      {[-158, -152, -146].map((yy) => <rect key={yy} x="-12" y={yy} width="24" height="3" rx="1.5" fill="#e8dcc0" />)}
      <rect x="-26" y="-14" width="52" height="46" rx="12" fill="#2a2a2e" />
      <rect x="-22" y="-10" width="44" height="38" rx="10" fill="#d8c8a0" />
      {R(12).map((i) => <circle key={i} cx={-16 + (i % 4) * 11} cy={-4 + Math.floor(i / 4) * 11} r="3.5" fill="none" stroke="#5a4a2a" strokeWidth="1" opacity="0.6" />)}
      <path d="M-28 -2 H28" stroke={C.red} strokeWidth="4" />
      <path d="M-1 -150 V20 M2 -150 V20" stroke="#f4ecdc" strokeWidth="0.8" />
    </g>
  );
}
function SanshinMain(c) {
  const { u, v } = c;
  return (
    <g>
      <Sky {...c} />
      <rect y="170" width="400" height="40" fill={`url(#${u}sea)`} />
      <path d="M0 170 H400" stroke="#fff" strokeOpacity="0.5" />
      <rect y="206" width="400" height="94" fill="#c9a77a" />
      {R(12).map((i) => <path key={i} d={`M${-20 + i * 40} 300 L${40 + i * 30} 206`} stroke="#a8875a" strokeOpacity="0.4" />)}
      <path d="M0 0 H400 V30 Q200 48 0 30Z" fill="#c8553d" />
      {R(20).map((i) => <path key={i} d={`M${i * 21} 2 V36`} stroke="#f4ecdc" strokeWidth="2" opacity="0.6" />)}
      <rect x="20" y="36" width="10" height="174" fill={C.woodD} />
      <rect x="370" y="36" width="10" height="174" fill={C.woodD} />
      <g>
        {[[340, 120], [356, 140], [326, 146]].map(([x, y], i) => <g key={i}><circle cx={x} cy={y} r="14" fill={C.green} /><circle cx={x} cy={y} r="7" fill={C.red} /></g>)}
      </g>
      <rect x="140" y="222" width="140" height="22" rx="4" fill={C.woodD} />
      <Person x={210} y={236} s={1.2} shirt="#e6e0f0" pants={C.indigo} band={C.red} />
      <Sanshin x={196} y={196} a={-58} s={0.75} />
      <circle cx="222" cy="190" r="5" fill={C.skin} />
      <Tint v={v} />
    </g>
  );
}
function SanshinActivity(c) {
  const { u } = c;
  return (
    <g>
      <rect width="400" height="300" fill="#f2c94c" />
      {R(5).map((i) => R(4).map((j) => (
        <g key={i + '-' + j} transform={`translate(${40 + i * 84 + (j % 2) * 42} ${36 + j * 76})`}>
          {R(5).map((k) => <ellipse key={k} cx={Math.cos(k * 1.26) * 12} cy={Math.sin(k * 1.26) * 12} rx="10" ry="6" transform={`rotate(${k * 72} ${Math.cos(k * 1.26) * 12} ${Math.sin(k * 1.26) * 12})`} fill={['#d6453d', '#2b7bb9', '#6aa84f'][(i + j) % 3]} opacity="0.85" />)}
          <circle r="5" fill="#f4ecdc" />
          <path d="M20 20 q14 -4 20 10" stroke="#1f7a4d" strokeWidth="3" fill="none" />
        </g>
      )))}
      <rect width="400" height="300" fill={`url(#${u}light)`} />
      <g opacity="0.25"><Sanshin x={232} y={250} a={-62} s={1.2} /></g>
      <Sanshin x={224} y={240} a={-62} s={1.2} />
      <Vignette u={u} />
    </g>
  );
}
function OkinawaScene(c) {
  const { u, v } = c;
  return (
    <g>
      <Sky {...c} />
      <rect y="150" width="400" height="40" fill={`url(#${u}sea)`} />
      <path d="M0 190 Q200 176 400 190 V210 H0Z" fill="#f2e6c8" />
      <rect y="206" width="400" height="94" fill="#86b86a" />
      <Tree x={50} y={230} s={1.3} c="#3f8a4a" />
      <Tree x={360} y={236} s={1.4} c="#3f8a4a" />
      <House x={210} y={250} w={200} noren={C.indigo} emblem={v.emblem} okinawa />
      <g transform="translate(210 140)"><path d="M-10 0 Q-12 -14 0 -16 Q12 -14 10 0Z" fill="#c8553d" /><circle cx="-3" cy="-10" r="2" fill="#1d1d22" /></g>
      {R(12).map((i) => <rect key={i} x={i * 34} y={262 + (i % 2) * 6} width="32" height="20" rx="6" fill={i % 2 ? '#d8cfbf' : '#cfc4b0'} />)}
      <rect y="282" width="400" height="18" fill="#cfc4b0" />
      <Tint v={v} />
    </g>
  );
}

const Fish = ({ x, y, s = 1, c = '#9fb3c4', a = 0 }) => (
  <g transform={`translate(${x} ${y}) rotate(${a}) scale(${s})`}>
    <path d="M-30 0 Q-10 -16 20 -4 L34 -14 L30 0 L34 14 L20 4 Q-10 16 -30 0Z" fill={c} />
    <path d="M-26 1 Q-6 8 18 2" stroke="#fff" strokeOpacity="0.5" strokeWidth="2.5" fill="none" />
    <circle cx="-20" cy="-2" r="2.2" fill={C.char} />
  </g>
);
function Boat({ x, y, s = 1, c = C.white, stripe = C.red }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-60 -20 H60 L48 0 H-50Z" fill={c} />
      <rect x="-60" y="-20" width="120" height="5" fill={stripe} />
      <rect x="-10" y="-46" width="34" height="26" rx="2" fill={c} />
      <rect x="-4" y="-40" width="10" height="8" fill="#9fc3df" />
      <rect x="10" y="-40" width="10" height="8" fill="#9fc3df" />
      <path d="M-30 -20 V-70" stroke={C.char} strokeWidth="2" />
    </g>
  );
}
function FishingMain(c) {
  const { u, v } = c;
  return (
    <g>
      <Sky {...c} />
      <path d="M0 170 Q100 150 160 168 L0 170Z" fill="#8aa3b8" />
      <rect y="168" width="400" height="132" fill={`url(#${u}sea)`} />
      {R(10).map((i) => <path key={i} d={`M${(i * 53) % 400} ${185 + i * 11} h${20 + (i % 3) * 14}`} stroke="#fff" strokeOpacity="0.35" strokeWidth="2" strokeLinecap="round" />)}
      <Boat x={250} y={238} s={1.4} stripe={v.accent} />
      <Person x={208} y={210} s={0.8} shirt={C.mustard} hat="#e6cf8a" />
      <path d="M222 178 Q280 90 340 80" stroke={C.char} strokeWidth="2.5" fill="none" />
      <path d="M340 80 Q352 150 356 210" stroke="#fff" strokeWidth="1" opacity="0.8" fill="none" />
      {[[90, 80], [130, 60]].map(([x, y], i) => <path key={i} d={`M${x - 10} ${y} q5 -6 10 0 q5 -6 10 0`} stroke={C.char} strokeWidth="2" fill="none" />)}
      <Tint v={v} />
    </g>
  );
}
function FishingActivity(c) {
  const { u, r } = c;
  return (
    <g>
      <rect width="400" height="300" fill="#8a9aa6" />
      {R(8).map((i) => <rect key={i} x="0" y={i * 40} width="400" height="36" fill={i % 2 ? '#7c8c98' : '#8a9aa6'} />)}
      <Shadow cx={210} cy={160} rx={180} ry={130} u={u} />
      <rect x="40" y="40" width="320" height="220" rx="6" fill="#4a7fb0" />
      <rect x="52" y="52" width="296" height="196" rx="3" fill="#e9f2f7" />
      {scatter(r, 40, 200, 150, 140, 90).map(([x, y], i) => <rect key={i} x={x} y={y} width="10" height="8" rx="2" fill="#fff" opacity="0.8" />)}
      {R(6).map((i) => <Fish key={i} x={110 + (i % 3) * 90} y={100 + Math.floor(i / 3) * 90} s={1.4} c={['#9fb3c4', '#d9584a', '#b8c6d2'][(i + 1) % 3]} a={i % 2 ? 8 : -8} />)}
      <Vignette u={u} />
    </g>
  );
}
function HarborScene(c) {
  const { u, v } = c;
  return (
    <g>
      <Sky {...c} />
      <Mountains y={160} c1="#9fb6c8" c2="#7f9ab0" />
      {R(4).map((i) => <g key={i}><rect x={i * 58} y={130 - (i % 2) * 10} width="54" height="44" fill={['#a4573e', '#c9b9a0', '#8a5040', '#d8cfbf'][i]} /><path d={`M${i * 58 - 2} ${130 - (i % 2) * 10} L${i * 58 + 27} ${112 - (i % 2) * 10} L${i * 58 + 56} ${130 - (i % 2) * 10}Z`} fill={C.roof} /></g>)}
      <rect x="0" y="172" width="250" height="12" fill={C.stone} />
      <rect y="184" width="400" height="116" fill={`url(#${u}sea)`} />
      <g><rect x="330" y="96" width="18" height="76" fill={C.white} /><rect x="330" y="112" width="18" height="10" fill={C.red} /><rect x="326" y="88" width="26" height="10" fill={C.char} /></g>
      <rect x="250" y="168" width="150" height="10" fill={C.stone} />
      <Boat x={110} y={226} s={1.1} stripe={C.indigo} />
      <Boat x={260} y={250} s={1.3} stripe={v.accent} />
      {R(8).map((i) => <path key={i} d={`M${(i * 67) % 400} ${236 + i * 7} h24`} stroke="#fff" strokeOpacity="0.35" strokeWidth="2" strokeLinecap="round" />)}
      <Tint v={v} />
      {v.tod !== 'day' && v.tod !== 'morning' && <Glow x={339} y={92} r={30} u={u} />}
    </g>
  );
}

function FarmMain(c) {
  const { u, v } = c;
  return (
    <g>
      <Sky {...c} />
      <Mountains y={160} />
      <path d="M0 160 Q200 140 400 160 V300 H0Z" fill="#7a5a3a" />
      {R(7).map((i) => <path key={i} d={`M${200 - (i - 3) * 20} 150 L${200 + (i - 3) * 120} 300`} stroke="#5f4228" strokeWidth={4 + i % 2} />)}
      {R(7).map((i) => R(6).map((j) => {
        const t = (j + 1) / 6, x = 200 + (i - 3) * (20 + 100 * t) + (i - 3) * 10 * t, y = 152 + t * t * 150;
        return <g key={i + '-' + j}><circle cx={x} cy={y} r={3 + t * 13} fill={(i + j) % 3 ? '#6fb04f' : '#8cc96a'} /><circle cx={x - t * 3} cy={y - t * 3} r={1 + t * 5} fill="#b6e08f" /></g>;
      }))}
      <Person x={300} y={230} s={1} shirt={C.indigo} hat="#e6cf8a" apron={C.cream} />
      <path d="M318 200 h24 l-4 22 h-16z" fill="#b98a4a" />
      <Tint v={v} />
    </g>
  );
}
function FarmActivity(c) {
  const { u } = c;
  return (
    <g>
      <TableFront {...c} wall="#8fbf7a" bokeh={false} />
      <Shadow cx={200} cy={270} rx={150} ry={16} u={u} />
      <path d="M70 180 L90 266 H310 L330 180Z" fill="#b98a4a" />
      {R(5).map((i) => <path key={i} d={`M${74 + i} ${196 + i * 15} H${326 - i}`} stroke="#8a5a35" strokeWidth="3" />)}
      <circle cx="120" cy="170" r="24" fill="#d6453d" />
      <circle cx="160" cy="176" r="22" fill="#e65a4a" />
      <path d="M190 180 Q200 130 236 150 Q250 170 220 186Z" fill="#5a3a6a" />
      <path d="M240 186 L300 120 L306 130 L252 192Z" fill="#ef8a3a" />
      <path d="M298 122 l10 -14 M302 126 l14 -8" stroke="#5c9a55" strokeWidth="4" strokeLinecap="round" />
      <ellipse cx="290" cy="176" rx="30" ry="12" fill="#6fa646" transform="rotate(-10 290 176)" />
      <circle cx="100" cy="150" r="5" fill="#2f7a3a" />
      <Vignette u={u} />
    </g>
  );
}
function RiceTerrace(c) {
  const { u, v } = c;
  return (
    <g>
      <Sky {...c} />
      <Mountains y={140} />
      {R(7).map((i) => <path key={i} d={`M0 ${130 + i * 26} Q120 ${118 + i * 28} 220 ${134 + i * 24} T400 ${126 + i * 27} V300 H0Z`} fill={i % 2 ? '#8cc96a' : '#9fd07a'} />)}
      {R(7).map((i) => <path key={i} d={`M0 ${130 + i * 26} Q120 ${118 + i * 28} 220 ${134 + i * 24} T400 ${126 + i * 27}`} stroke="#6a9a4a" strokeWidth="2" fill="none" />)}
      <House x={320} y={150} w={90} noren={v.noren} emblem={v.emblem} thatch />
      <Tree x={40} y={150} s={0.8} c={C.green} />
      <Tint v={v} />
    </g>
  );
}

function CraftActivity(c) {
  const { v } = c;
  return (
    <Shelf {...c}>
      {R(4).map((i) => <Pot key={i} x={70 + i * 80} y={120} w={36} h={40} c={[v.glaze, C.indigo, '#efe6d6', C.clay][i]} shape={i} />)}
      {R(4).map((i) => <rect key={i} x={50 + i * 80} y={160} width="56" height="54" fill={['#2b4a78', '#f6e8e2', '#e3b23c', '#e8efe0'][i]} />)}
    </Shelf>
  );
}

/* ───────── TOURS ───────── */
function Torii({ x, y, s = 1, c = C.red }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-80 -150 Q0 -160 80 -150 L84 -138 Q0 -146 -84 -138Z" fill={C.char} />
      <rect x="-72" y="-138" width="144" height="10" fill={c} />
      <rect x="-64" y="-114" width="128" height="9" fill={c} />
      <rect x="-5" y="-128" width="10" height="16" fill={c} />
      <path d="M-56 -128 L-52 0 H-40 L-44 -128Z M56 -128 L52 0 H40 L44 -128Z" fill={c} />
      <rect x="-55" y="-8" width="18" height="8" fill={C.char} />
      <rect x="37" y="-8" width="18" height="8" fill={C.char} />
    </g>
  );
}
const StoneLantern = ({ x, y, s = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} fill="#a7a197">
    <rect x="-12" y="-6" width="24" height="6" />
    <rect x="-4" y="-30" width="8" height="24" />
    <rect x="-12" y="-36" width="24" height="6" />
    <rect x="-9" y="-52" width="18" height="16" fill="#8f897f" />
    <rect x="-5" y="-48" width="10" height="8" fill="#e9dcb8" />
    <path d="M-18 -52 L0 -66 L18 -52Z" fill="#8f897f" />
  </g>
);
const Deer = ({ x, y, s = 1, flip }) => (
  <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
    <ellipse cx="0" cy="0" rx="16" ry="3" fill={C.char} opacity="0.15" />
    <path d="M-14 -2 V-22 M-8 -2 V-22 M8 -2 V-22 M14 -2 V-22" stroke="#a8763e" strokeWidth="3.5" strokeLinecap="round" />
    <ellipse cx="0" cy="-27" rx="19" ry="10" fill="#b9874e" />
    {[-8, 0, 8].map((d) => <circle key={d} cx={d} cy="-30" r="1.6" fill="#f4ecdc" />)}
    <path d="M14 -30 L22 -48 L28 -46 L22 -28Z" fill="#b9874e" />
    <ellipse cx="27" cy="-50" rx="8" ry="5" fill="#b9874e" />
    <path d="M22 -55 l-4 -6 M26 -54 l2 -6" stroke="#a8763e" strokeWidth="2.5" strokeLinecap="round" />
  </g>
);
function WalkMain(c) {
  const { u, v } = c;
  return (
    <g>
      <Sky {...c} />
      <path d="M90 150 L130 120 H270 L310 150Z" fill={mix(C.roof, v.sky[1], 0.3)} />
      <rect x="120" y="150" width="160" height="40" fill={mix(C.cream, v.sky[1], 0.3)} />
      <path d="M110 108 L150 86 H250 L290 108Z" fill={mix(C.roof, v.sky[1], 0.3)} />
      <rect x="140" y="108" width="120" height="14" fill={mix(C.red, v.sky[1], 0.35)} />
      <Tree x={50} y={210} s={1.6} c={C.green} pine />
      <Tree x={360} y={214} s={1.7} c="#3f7a4a" pine />
      <Tree x={20} y={230} s={1.2} c="#e9a7b8" />
      <path d="M0 200 Q200 186 400 200 V300 H0Z" fill={`url(#${u}grass)`} />
      <path d="M170 300 L188 196 H212 L230 300Z" fill="#d9ccb0" />
      {R(6).map((i) => <path key={i} d={`M${172 + i * 1.5} ${290 - i * 18} H${228 - i * 1.5}`} stroke="#c3b493" />)}
      <Torii x={200} y={238} s={0.95} />
      <StoneLantern x={140} y={256} s={1} />
      <StoneLantern x={260} y={256} s={1} />
      {v.deer && <Deer x={96} y={272} s={1.1} />}
      {v.deer && <Deer x={318} y={282} s={0.9} flip />}
      <Tint v={v} />
    </g>
  );
}
function Stall({ x, y, w, c, items }) {
  return (
    <g>
      <rect x={x + 4} y={y - 70} width="4" height="70" fill={C.char} />
      <rect x={x + w - 8} y={y - 70} width="4" height="70" fill={C.char} />
      <path d={`M${x - 6} ${y - 70} H${x + w + 6} L${x + w} ${y - 92} H${x}Z`} fill={c} />
      {R(Math.floor(w / 16)).map((i) => <rect key={i} x={x + i * 16 + 4} y={y - 90} width="8" height="20" fill="#fff" opacity="0.5" />)}
      <rect x={x} y={y - 32} width={w} height="32" fill={C.wood} />
      <rect x={x} y={y - 32} width={w} height="6" fill={C.woodD} />
      {R(Math.floor(w / 24)).map((i) => <circle key={i} cx={x + 12 + i * 24} cy={y - 38} r="9" fill={items[i % items.length]} />)}
    </g>
  );
}
function MarketMain(c) {
  const { u, v } = c;
  return (
    <g>
      <Sky {...c} />
      <rect x="0" y="80" width="400" height="140" fill={mix(v.wall2, '#fff', 0.2)} />
      <rect x="0" y="70" width="400" height="12" fill={C.roof} />
      <rect y="220" width="400" height="80" fill={`url(#${u}ground)`} />
      <Stall x={10} y={226} w={120} c={C.red} items={['#9fb3c4', '#d9584a', '#9fb3c4']} />
      <Stall x={144} y={222} w={112} c={C.green} items={['#6fb04f', '#ef8a3a', '#d6453d']} />
      <Stall x={270} y={226} w={120} c={C.indigo} items={['#e3b23c', '#c9a06c', '#f2a7b5']} />
      <path d="M0 100 Q200 130 400 100" stroke={C.char} strokeWidth="1" fill="none" />
      {R(8).map((i) => <circle key={i} cx={25 + i * 50} cy={106 + Math.sin((i / 7) * Math.PI) * 13} r="4" fill="#ffe7a8" />)}
      <Person x={120} y={290} s={0.9} shirt={v.accent} back bag={C.woodD} />
      <Person x={240} y={286} s={0.85} shirt={C.cream} back />
      <Person x={300} y={294} s={0.95} shirt={C.indigo} back hat="#e6cf8a" />
      <Tint v={v} />
    </g>
  );
}
function NightMain(c) {
  const { u, v } = c;
  const nv = { ...v, tod: 'night', sky: SKIES.night };
  return (
    <g>
      <Sky {...c} v={nv} />
      <path d="M0 40 L130 120 V230 L0 300Z" fill="#3a3238" />
      <path d="M400 40 L270 120 V230 L400 300Z" fill="#33303a" />
      {R(4).map((i) => <rect key={i} x={10 + i * 28} y={110 + i * 8} width="16" height="40" fill="#f6cf8c" opacity="0.5" transform={`skewY(${30 - i * 0})`} />)}
      <rect y="230" width="400" height="70" fill="#2a2c34" />
      <path d="M130 230 L0 300 H400 L270 230Z" fill="#33363f" />
      {R(5).map((i) => <path key={i} d={`M${170 + i * 15} 236 L${110 + i * 45} 300`} stroke="#ffd98a" strokeOpacity="0.07" strokeWidth="6" />)}
      <g>
        <rect x="150" y="166" width="100" height="58" fill={C.woodD} />
        <rect x="140" y="150" width="120" height="10" fill={C.roof} />
        <Noren x={152} y={160} w={96} h={24} color={v.noren === C.char ? C.red : v.noren} emblem={v.emblem} panels={4} />
        <rect x="140" y="214" width="120" height="8" fill={C.wood} />
        <circle cx="166" cy="230" r="9" fill={C.char} />
        <circle cx="234" cy="230" r="9" fill={C.char} />
        <Glow x={200} y={200} r={70} u={u} o={0.9} />
        <Person x={180} y={250} s={0.6} shirt={C.indigo} back />
        <Person x={220} y={250} s={0.6} shirt={C.mustard} back />
      </g>
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <Lantern x={118 - i * 34} y={96 - i * 22} s={0.75 + i * 0.12} u={u} lit color={i % 2 ? C.red : C.mustard} />
          <Lantern x={282 + i * 34} y={96 - i * 22} s={0.75 + i * 0.12} u={u} lit color={i % 2 ? C.mustard : C.red} />
        </g>
      ))}
    </g>
  );
}
function NatureMain(c) {
  const { u, v } = c;
  return (
    <g>
      <Sky {...c} />
      <Mountains y={170} snow />
      <path d="M0 170 Q120 150 240 168 T400 160 V300 H0Z" fill={`url(#${u}grass)`} />
      {R(8).map((i) => <Tree key={i} x={i * 56} y={176 + (i % 2) * 6} s={0.7} c={i % 2 ? C.green : '#4f8f4a'} />)}
      <path d="M180 170 Q220 200 170 240 Q120 280 160 300 H260 Q210 270 250 230 Q290 190 210 168Z" fill="#7fb4d8" />
      <path d="M100 236 Q200 200 300 236" stroke={C.red} strokeWidth="6" fill="none" />
      {R(6).map((i) => <line key={i} x1={120 + i * 32} y1={228 - Math.sin((i / 5) * Math.PI) * 18} x2={120 + i * 32} y2="246" stroke={C.red} strokeWidth="3" />)}
      <Tint v={v} />
    </g>
  );
}


function Bicycle({ x, y, s = 1, shirt = C.red, helmet = C.cream }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} strokeLinecap="round" fill="none">
      <ellipse cx="0" cy="14" rx="36" ry="3" fill={C.char} opacity="0.15" stroke="none" />
      <circle cx="-22" cy="0" r="14" stroke={C.char} strokeWidth="2.5" />
      <circle cx="22" cy="0" r="14" stroke={C.char} strokeWidth="2.5" />
      <path d="M-22 0 L-4 0 L12 -20 L-10 -20 Z M-4 0 L-12 -26 M12 -20 L22 0 M12 -20 L10 -28" stroke={shirt} strokeWidth="2.5" />
      <path d="M-11 -30 Q-2 -42 4 -48" stroke={shirt} strokeWidth="9" />
      <path d="M4 -46 L12 -28" stroke={shirt} strokeWidth="4" />
      <path d="M-10 -28 L-2 -12 L-4 0" stroke={C.char} strokeWidth="5" />
      <circle cx="8" cy="-56" r="6.5" fill={C.skin} stroke="none" />
      <path d="M1 -57 Q8 -66 15 -57Z" fill={helmet} stroke="none" />
    </g>
  );
}
function CyclingMain(c) {
  const { u, v } = c;
  return (
    <g>
      <Sky {...c} />
      <Mountains y={170} />
      <path d="M0 170 Q200 150 400 172 V300 H0Z" fill={`url(#${u}grass)`} />
      {R(5).map((i) => <path key={i} d={`M0 ${190 + i * 20} Q200 ${176 + i * 22} 400 ${192 + i * 20}`} stroke="#8cc96a" strokeWidth="2" fill="none" />)}
      <path d="M-20 300 Q140 236 240 196 Q290 176 330 168 L344 170 Q300 186 270 206 Q180 264 140 300Z" fill="#9aa0a6" />
      <path d="M60 280 Q160 232 300 178" stroke="#fff" strokeWidth="2" strokeDasharray="10 10" fill="none" opacity="0.7" />
      <House x={330} y={172} w={70} noren={v.noren} emblem={v.emblem} thatch />
      <Tree x={40} y={190} s={1} c={C.green} />
      <Bicycle x={150} y={250} s={1.25} shirt={v.flag} />
      <Bicycle x={230} y={214} s={0.95} shirt={C.indigo} helmet={C.mustard} />
      <Tint v={v} />
    </g>
  );
}
function TrainMain(c) {
  const { u, v } = c;
  return (
    <g>
      <Sky {...c} />
      <Mountains y={180} />
      <path d="M0 180 Q200 166 400 180 V300 H0Z" fill={`url(#${u}grass)`} />
      {R(6).map((i) => <line key={i} x1={40 + i * 70} y1="150" x2={40 + i * 70} y2="232" stroke={C.woodD} strokeWidth="3" />)}
      <path d="M0 160 Q35 166 70 162 T140 162 T210 162 T280 162 T350 162 T420 162" stroke={C.char} strokeWidth="1" fill="none" />
      <rect y="226" width="400" height="14" fill="#a89a86" />
      {R(28).map((i) => <rect key={i} x={i * 15} y="228" width="8" height="10" fill="#6a5a4a" />)}
      <rect y="229" width="400" height="2.5" fill="#c7cdd3" />
      <rect y="234" width="400" height="2.5" fill="#c7cdd3" />
      <path d="M70 226 V176 Q70 164 82 164 H296 Q326 164 330 196 L332 226Z" fill={C.cream} />
      <rect x="70" y="204" width="262" height="10" fill={v.flag} />
      <rect x="70" y="214" width="262" height="12" fill={mix(v.flag, '#000', 0.25)} />
      {R(6).map((i) => <rect key={i} x={90 + i * 34} y="176" width="24" height="20" rx="3" fill="#9fc3df" />)}
      <path d="M302 176 H318 Q326 180 327 196 H302Z" fill="#9fc3df" />
      <rect x="290" y="174" width="8" height="40" fill={mix(C.cream, '#000', 0.1)} />
      {[100, 130, 270, 300].map((x) => <circle key={x} cx={x} cy="228" r="7" fill={C.char} />)}
      {R(30).map((i) => <circle key={i} cx={(i * 47) % 400} cy={250 + ((i * 13) % 46)} r="3" fill={i % 3 ? '#f2d24c' : '#e3b23c'} />)}
      <Tint v={v} />
    </g>
  );
}
function Ekiben(c) {
  const { u, v } = c;
  return (
    <g>
      <Table {...c} />
      <Tray x={60} y={50} w={280} h={200} c={C.woodD} />
      <rect x="76" y="66" width="248" height="168" fill={C.cream} />
      <path d="M200 66 V234 M200 150 H324 M262 66 V150" stroke={C.wood} strokeWidth="4" />
      <rect x="80" y="70" width="116" height="160" fill="#fdfaf2" />
      {R(20).map((i) => <ellipse key={i} cx={90 + (i * 29) % 100} cy={80 + ((i * 43) % 140)} rx="3" ry="1.6" fill="#ece5d4" />)}
      <circle cx="138" cy="150" r="12" fill="#c8323a" />
      {R(3).map((i) => <circle key={i} cx={218 + i * 14} cy={98 + (i % 2) * 18} r="13" fill={i % 2 ? '#b8692e' : '#cb8640'} />)}
      <rect x="270" y="80" width="46" height="18" rx="3" fill="#f2c64e" />
      <rect x="270" y="104" width="46" height="18" rx="3" fill="#f2c64e" />
      <path d="M212 170 Q260 150 312 176 L306 200 Q260 186 214 196Z" fill="#f08a4b" />
      {R(4).map((i) => <circle key={i} cx={222 + i * 26} cy="216" r="9" fill={i % 2 ? '#a6c86a' : '#f2d24c'} />)}
      <rect x="350" y="70" width="30" height="80" rx="8" fill="#9fc3a0" opacity="0.9" />
      <rect x="356" y="62" width="18" height="12" rx="3" fill={v.flag} />
      <Vignette u={u} />
    </g>
  );
}

function TourMap(c) {
  const { u, v, r } = c;
  const pts = R(5).map((i) => [70 + i * 64 + (r() - 0.5) * 30, 90 + r() * 130]);
  const route = 'M' + pts.map((p) => p.join(' ')).join(' L');
  return (
    <g>
      <rect width="400" height="300" fill={`url(#${u}table)`} />
      <g transform="rotate(-3 200 150)">
        <rect x="34" y="34" width="340" height="240" rx="4" fill="#000" opacity="0.15" />
        <rect x="28" y="26" width="340" height="240" rx="4" fill="#f6efdf" />
        <path d="M28 200 Q120 180 160 220 T368 210 V266 H28Z" fill="#bcd8ea" />
        <path d="M250 40 Q330 60 340 120 Q300 150 250 120 Q220 80 250 40Z" fill="#cfe5b8" />
        <circle cx="100" cy="80" r="30" fill="#cfe5b8" />
        {R(5).map((i) => <path key={i} d={`M28 ${60 + i * 44} H368`} stroke="#e2d6bd" strokeWidth={i % 2 ? 3 : 6} />)}
        {R(5).map((i) => <path key={i} d={`M${70 + i * 70} 26 V266`} stroke="#e2d6bd" strokeWidth={i % 2 ? 3 : 6} />)}
        <path d={route} stroke={v.flag} strokeWidth="4" strokeDasharray="2 9" strokeLinecap="round" fill="none" />
        {pts.slice(1, -1).map(([x, y], i) => <circle key={i} cx={x} cy={y} r="6" fill="#fff" stroke={C.char} strokeWidth="2" />)}
        {[pts[0], pts[4]].map(([x, y], i) => (
          <g key={i} transform={`translate(${x} ${y})`}>
            <ellipse cx="0" cy="2" rx="6" ry="2" fill="#000" opacity="0.2" />
            <path d="M0 0 C-12 -14 -12 -32 0 -32 C12 -32 12 -14 0 0Z" fill={i ? C.red : C.green} />
            <circle cx="0" cy="-22" r="4.5" fill="#fff" />
          </g>
        ))}
        <g transform="translate(330 70)"><circle r="16" fill="#fff" stroke={C.char} strokeWidth="1.5" /><path d="M0 -12 L4 0 L0 12 L-4 0Z" fill={C.red} /><path d="M0 0 L4 0 L0 12 L-4 0Z" fill={C.char} /></g>
      </g>
      <g transform="rotate(30 320 260)"><rect x="270" y="252" width="100" height="10" rx="3" fill={C.mustard} /><path d="M370 252 l14 5 l-14 5Z" fill="#e9cfa0" /></g>
      <Vignette u={u} />
    </g>
  );
}
function TourGroup(c) {
  const { u, v, s } = c;
  const sea = s === 'harbor';
  return (
    <g>
      <Sky {...c} />
      {sea ? <rect y="150" width="400" height="80" fill={`url(#${u}sea)`} /> : <Mountains y={180} />}
      {!sea && <path d="M0 180 Q200 160 400 182 V300 H0Z" fill={`url(#${u}grass)`} />}
      {sea && <rect y="226" width="400" height="74" fill="#d8ccb0" />}
      {sea && <path d="M0 226 H400" stroke={C.stone} strokeWidth="6" />}
      {!sea && <path d="M120 300 Q180 240 210 180 H240 Q230 240 300 300Z" fill="#e2d6b8" />}
      {!sea && R(4).map((i) => <Tree key={i} x={30 + i * 26 + (i > 1 ? 280 : 0)} y={200 + (i % 2) * 10} s={1.1} c={i % 2 ? C.green : '#4f8f4a'} pine={s === 'walk'} />)}
      {s === 'walk' && <Torii x={226} y={190} s={0.35} />}
      <Person x={190} y={252} s={0.85} shirt={C.cream} back flag={v.flag} />
      <Person x={226} y={270} s={0.95} shirt={v.accent} back bag={C.woodD} />
      <Person x={168} y={284} s={1} shirt={C.indigo} back hat="#e6cf8a" />
      <Person x={258} y={296} s={1.05} shirt="#6b4a3a" back bag={C.green} />
      {v.deer && <Deer x={110} y={262} s={0.9} />}
      <Tint v={v} />
    </g>
  );
}
function NightGroup(c) {
  const { u, v } = c;
  return (
    <g>
      <rect width="400" height="300" fill="#2a2228" />
      <Glow x={200} y={150} r={220} u={u} o={0.45} />
      <rect y="0" width="400" height="34" fill={C.roof} />
      <Noren x={20} y={34} w={360} h={44} color={v.noren === C.char ? C.red : v.noren} emblem={v.emblem} panels={6} />
      {[60, 200, 340].map((x) => <Lantern key={x} x={x} y={88} s={0.9} u={u} lit color={x === 200 ? C.mustard : C.red} />)}
      <rect y="186" width="400" height="20" fill={C.wood} />
      <rect y="206" width="400" height="94" fill={C.woodD} />
      <Tokkuri x={70} y={186} />
      <Mug x={330} y={186} />
      <Person x={130} y={300} s={1.3} shirt={C.indigo} back />
      <Person x={220} y={300} s={1.35} shirt={C.mustard} back />
      <Person x={308} y={300} s={1.25} shirt={C.cream} back />
      <Vignette u={u} />
    </g>
  );
}
function MarketTasting(c) {
  const { u, v } = c;
  return (
    <g>
      <TableFront {...c} wall={mix(v.wall2, '#000', 0.05)} bokeh={false} />
      <path d="M0 0 H400 V40 H0Z" fill={C.red} />
      {R(13).map((i) => <rect key={i} x={i * 32} y="0" width="16" height="40" fill="#fff" opacity="0.6" />)}
      <path d={'M0 40 ' + R(13).map(() => 'q16 12 32 0').join(' ')} fill={C.red} />
      <Person x={290} y={236} s={0.95} shirt={C.white} apron={C.indigo} band={C.white} />
      <rect x="0" y="176" width="400" height="10" fill={C.woodD} />
      <rect x="40" y="170" width="140" height="80" rx="4" fill="#4a7fb0" />
      <rect x="46" y="176" width="128" height="68" fill="#e9f2f7" />
      {R(4).map((i) => <Fish key={i} x={80 + (i % 2) * 60} y={194 + Math.floor(i / 2) * 32} s={0.8} c={i % 2 ? '#d9584a' : '#9fb3c4'} />)}
      <rect x="210" y="180" width="160" height="70" rx="4" fill="#b98a4a" />
      {R(6).map((i) => <circle key={i} cx={230 + (i % 3) * 50} cy={198 + Math.floor(i / 3) * 30} r="14" fill={['#d6453d', '#ef8a3a', '#6fb04f'][i % 3]} />)}
      <Vignette u={u} />
    </g>
  );
}

/* ───────── scene registry ───────── */
const EXP = {
  tea: { main: TeaMain, activity: TeaActivity, scene: TeaField },
  pottery: { main: PotteryMain, activity: PotteryActivity },
  indigo: { main: IndigoMain, activity: IndigoActivity },
  washi: { main: WashiMain, activity: WashiActivity },
  cooking: { main: CookMain, activity: CookActivity },
  sake: { main: SakeMain, activity: SakeActivity, scene: SakeScene },
  sanshin: { main: SanshinMain, activity: SanshinActivity, scene: OkinawaScene },
  fishing: { main: FishingMain, activity: FishingActivity, scene: HarborScene },
  farm: { main: FarmMain, activity: FarmActivity, scene: RiceTerrace },
  glass: { main: GlassMain, activity: GlassActivity },
  wood: { main: WoodMain, activity: CraftActivity },
  craft: { main: WoodMain, activity: CraftActivity },
};
const TOUR = {
  walk: { main: WalkMain },
  market: { main: MarketMain, activity: MarketTasting },
  night: { main: NightMain, activity: NightGroup },
  harbor: { main: HarborScene },
  nature: { main: NatureMain },
  cycling: { main: CyclingMain },
  train: { main: TrainMain, activity: Ekiben },
};
const PROPS = {
  indigo: <g>{[0, 1].map((i) => <IndigoCloth key={i} x={316 + i * 30} y={196} w={24} h={44} c={i ? '#4c74a6' : '#1d3557'} pat={i} />)}<path d="M310 196 H376" stroke={C.wood} strokeWidth="3" /></g>,
  pottery: <g><rect x="40" y="250" width="70" height="6" fill={C.woodD} />{R(3).map((i) => <Pot key={i} x={52 + i * 24} y={250} w={18} h={20 + (i % 2) * 6} c={[C.clay, '#9fc2b0', '#4a3426'][i]} shape={i} />)}</g>,
  washi: <g>{R(3).map((i) => <rect key={i} x={300 + i * 22} y={206} width="18" height="40" fill="#fbf6ea" stroke={C.wood} strokeWidth="2" />)}</g>,
  glass: <g>{R(4).map((i) => <circle key={i} cx={300 + i * 16} cy={244} r="7" fill={['#5aa9d6', '#7cc4a4', '#e3a23c', '#c96a8a'][i]} opacity="0.8" />)}</g>,
  cooking: <g>{[60, 92].map((x) => <Barrel key={x} x={x} y={262} w={28} h={30} />)}</g>,
};

function render(kind, c) {
  const { cat, s, s2 } = c;
  if (cat === 'restaurant') {
    if (kind === 'food') return (FOOD[s] ?? TeishokuFood)(c);
    if (kind === 'inside') return Inside(c);
    return StoreMain(c);
  }
  if (cat === 'experience') {
    const set = EXP[s] ?? EXP.craft;
    if (kind === 'activity') {
      // two crafts in one studio (e.g. clay & indigo): show the second one here
      const crafts = ['pottery', 'indigo', 'washi', 'glass'];
      if (crafts.includes(s) && crafts.includes(s2)) return EXP[s2].main(c);
      return (set.activity ?? CraftActivity)(c);
    }
    if (kind === 'scene') {
      if (set.scene) return set.scene(c);
      if (v2(c)) return OkinawaScene(c);
      return Countryside(c, PROPS[s] ?? PROPS[s2]);
    }
    return set.main(c);
  }
  // tours
  const set = TOUR[s] ?? TOUR.nature;
  if (kind === 'scene') return TourMap(c);
  if (kind === 'activity') return (set.activity ?? TourGroup)(c);
  return set.main(c);
}
const v2 = (c) => c.v.okinawa;

const LABELS = {
  ramen: 'ramen', sushi: 'sushi', noodles: 'soba and udon noodles', okonomiyaki: 'okonomiyaki', yakitori: 'skewers', izakaya: 'izakaya',
  cafe: 'café', teishoku: 'Japanese set meal', curry: 'curry', veggie: 'vegetarian bowl', tea: 'matcha tea', tempura: 'tempura',
  pottery: 'pottery', indigo: 'indigo dyeing', washi: 'washi paper making', cooking: 'cooking class', sake: 'sake brewery',
  sanshin: 'sanshin music', fishing: 'fishing', farm: 'farm experience', craft: 'craft workshop',
  seafood: 'seafood rice bowl', grill: 'grilled lamb barbecue', glass: 'glass blowing', wood: 'woodworking',
  cycling: 'cycling tour', train: 'local train trip',
  walk: 'temple walking tour', market: 'market tour', night: 'night food tour', harbor: 'harbor tour', nature: 'nature tour',
};
const KIND_LABEL = {
  restaurant: { main: 'storefront', food: 'dish', inside: 'counter seating' },
  experience: { main: 'hands-on', activity: 'finished works', scene: 'location' },
  tour: { main: 'scenery', activity: 'group on the tour', scene: 'route map' },
};

export default function PlaceArt({ place, kind = 'main', className = '' }) {
  const u = 'pa' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const { cat, main, second } = useMemo(() => placeSubject(place), [place]);
  const v = useMemo(() => variant(place), [place]);
  const k = artKinds(place).includes(kind) ? kind : 'main';
  const c = { u, v, cat, s: main, s2: second, place, r: rng(hash(`${place?.id ?? place?.name ?? ''}:${k}`)) };
  const label = `Illustration: ${LABELS[main] ?? cat} ${KIND_LABEL[cat]?.[k] ?? ''}`.trim();
  return (
    <svg
      className={className}
      viewBox="0 0 400 300"
      preserveAspectRatio="xMidYMid slice"
      width="100%"
      height="100%"
      role="img"
      aria-label={label}
      style={{ display: 'block' }}
    >
      <Defs u={u} v={v} />
      {render(k, c)}
    </svg>
  );
}
