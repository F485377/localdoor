// 料理・体験の「写真風イラスト」。写真が登録されていないお店の、お店の画面の一番上に出す（「イメージ」と書く）。
// 木のテーブル・後ろのぼけた灯り・器の影・つや で、写真らしく見せる。kind ごとに器と中身を描く
const W = 400;
const H = 260;

// 料理名（日本語）・ジャンルから、どの絵にするか
const KIND_OF_NAME = [
  [/ラーメン|中華そば|チャーシュー|拉麺/, 'ramen'],
  [/餃子/, 'gyoza'],
  [/天ぷらうどん|天ぷら/, 'tempura'],
  [/うどん/, 'udon'],
  [/そば|蕎麦/, 'soba'],
  [/握り|寿司|鮨|巻/, 'sushi'],
  [/刺身|お造り/, 'sashimi'],
  [/唐揚げ|からあげ/, 'karaage'],
  [/焼鳥|焼き鳥|ねぎま|串|おまかせ\d本/, 'yakitori'],
  [/日本酒|地酒|酒/, 'sake'],
  [/カレー/, 'curry'],
  [/コーヒー|珈琲/, 'coffee'],
  [/プリン/, 'pudding'],
  [/ナポリタン|パスタ|スパゲッティ/, 'pasta'],
  [/定食|御膳|生姜焼き|膳/, 'teishoku'],
  [/煮物|お通し|小鉢|おばんざい/, 'kobachi'],
  [/抹茶|お茶/, 'matcha'],
  [/和菓子|団子|菓子/, 'wagashi'],
];
export const dishKindOf = (name) => KIND_OF_NAME.find(([re]) => re.test(name ?? ''))?.[1] ?? null;

const GENRE_KINDS = {
  washoku: ['teishoku', 'kobachi', 'sashimi'],
  yoshoku: ['pasta', 'curry', 'coffee'],
  chuka: ['ramen', 'gyoza'],
  izakaya: ['yakitori', 'sashimi', 'karaage', 'sake'],
  restaurant: ['teishoku', 'pasta', 'kobachi'],
  cafe: ['coffee', 'pudding', 'pasta'],
  sweets: ['wagashi', 'matcha'],
  bar: ['sake', 'kobachi'],
  other_food: ['teishoku', 'kobachi'],
  cooking: ['wagashi', 'soba', 'teishoku'],
  craft: ['pottery', 'indigo'],
  culture: ['matcha', 'calligraphy', 'wagashi'],
  nature: ['farm', 'sake'],
  other_exp: ['matcha', 'pottery'],
};
// 体験の名前から（陶芸・藍染め・収穫・書道 など）
const KIND_OF_PLACE = [
  [/陶|器づくり|焼き物/, ['pottery', 'matcha']],
  [/染|織|藍/, ['indigo']],
  [/農園|収穫|畑|果樹/, ['farm']],
  [/書道/, ['calligraphy', 'matcha']],
  [/茶園|茶道|抹茶/, ['matcha', 'wagashi']],
  [/菓子/, ['wagashi', 'matcha']],
  [/酒造|酒蔵/, ['sake', 'kobachi']],
  [/そば打ち/, ['soba']],
];

// 絵の名前（メニューから作った絵でないときの説明）
const v = (en, zh, zt, ko, ja) => ({ en, zh, zt, ko, ja });
const KIND_NAMES = {
  ramen: v('Ramen', '拉面', '拉麵', '라멘', 'ラーメン'),
  gyoza: v('Gyoza', '煎饺', '煎餃', '교자', '餃子'),
  udon: v('Udon', '乌冬面', '烏龍麵', '우동', 'うどん'),
  soba: v('Soba', '荞麦面', '蕎麥麵', '소바', 'そば'),
  tempura: v('Tempura udon', '天妇罗乌冬面', '天婦羅烏龍麵', '튀김 우동', '天ぷらうどん'),
  sushi: v('Sushi', '寿司', '壽司', '스시', '寿司'),
  sashimi: v('Sashimi', '刺身', '生魚片', '사시미', '刺身'),
  karaage: v('Karaage', '日式炸鸡', '日式炸雞', '가라아게', '唐揚げ'),
  yakitori: v('Yakitori', '烤鸡串', '烤雞串', '야키토리', '焼き鳥'),
  sake: v('Sake', '日本酒', '日本酒', '사케', '日本酒'),
  curry: v('Curry rice', '咖喱饭', '咖哩飯', '카레라이스', 'カレーライス'),
  coffee: v('Coffee', '咖啡', '咖啡', '커피', 'コーヒー'),
  pudding: v('Pudding', '布丁', '布丁', '푸딩', 'プリン'),
  pasta: v('Pasta', '意大利面', '義大利麵', '파스타', 'パスタ'),
  teishoku: v('Set meal', '套餐', '套餐', '정식', '定食'),
  kobachi: v('Small dishes', '小菜', '小菜', '작은 반찬', '小鉢'),
  matcha: v('Matcha', '抹茶', '抹茶', '말차', '抹茶'),
  wagashi: v('Wagashi', '和果子', '和菓子', '화과자', '和菓子'),
  pottery: v('Pottery', '陶艺', '陶藝', '도예', '陶芸'),
  indigo: v('Indigo dyeing', '蓝染', '藍染', '쪽염색', '藍染め'),
  farm: v('Harvest', '采摘', '採摘', '수확', '収穫'),
  calligraphy: v('Calligraphy', '书法', '書法', '서예', '書道'),
};

// お店に出す絵の一覧：[{ kind, caption }]。メニューがあればメニューから、なければ店名・ジャンルから
export function dishSlides(place, lang = 'en') {
  const out = [];
  const add = (kind, caption) => kind && !out.some((x) => x.kind === kind) && out.push({ kind, caption });
  for (const m of place.menu ?? []) add(dishKindOf(m.nameJa ?? m.name), m.name);
  if (!out.length) {
    const byName = KIND_OF_PLACE.find(([re]) => re.test(place.nameJa ?? place.name ?? ''))?.[1];
    for (const k of byName ?? GENRE_KINDS[place.genre] ?? GENRE_KINDS[place.category === 'experience' ? 'other_exp' : 'other_food']) add(k, KIND_NAMES[k]?.[lang] ?? KIND_NAMES[k]?.en);
  }
  return out.slice(0, 6);
}

export default function DishArt({ kind, seed = 0 }) {
  const id = `d${kind}${seed}`;
  const Dish = DISHES[kind] ?? DISHES.teishoku;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="dish-art" role="img" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={`${id}wall`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3b2a20" />
          <stop offset="1" stopColor="#6b4a33" />
        </linearGradient>
        <linearGradient id={`${id}wood`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a8753f" />
          <stop offset="1" stopColor="#6e4423" />
        </linearGradient>
        <radialGradient id={`${id}light`} cx="0.35" cy="0.25" r="0.9">
          <stop offset="0" stopColor="#fff6dc" stopOpacity="0.55" />
          <stop offset="0.6" stopColor="#fff6dc" stopOpacity="0" />
        </radialGradient>
        <filter id={`${id}blur`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <filter id={`${id}soft`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.2" />
        </filter>
        <radialGradient id={`${id}vig`} cx="0.5" cy="0.5" r="0.75">
          <stop offset="0.6" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.45" />
        </radialGradient>
      </defs>
      {/* 後ろの壁と、ぼけた灯り */}
      <rect width={W} height={H} fill={`url(#${id}wall)`} />
      <g filter={`url(#${id}blur)`} opacity="0.7">
        <circle cx="60" cy="40" r="16" fill="#ffd27a" />
        <circle cx="330" cy="30" r="12" fill="#ffbf69" />
        <circle cx="250" cy="55" r="9" fill="#ffe2a6" />
        <circle cx="140" cy="22" r="7" fill="#ffcf8a" />
      </g>
      {/* 木のテーブル（木目） */}
      <path d={`M0 92 L${W} 80 L${W} ${H} L0 ${H} Z`} fill={`url(#${id}wood)`} />
      <g stroke="#5a361b" strokeOpacity="0.25" fill="none">
        {[110, 140, 172, 205, 238].map((y, i) => (
          <path key={y} d={`M0 ${y} C 120 ${y - 6 + i} 260 ${y + 8 - i} ${W} ${y - 4}`} strokeWidth={1 + (i % 2)} />
        ))}
      </g>
      <Dish id={id} />
      {/* 光と周辺の暗さ（写真らしく） */}
      <rect width={W} height={H} fill={`url(#${id}light)`} />
      <rect width={W} height={H} fill={`url(#${id}vig)`} />
    </svg>
  );
}

// 器の影
const Shadow = ({ id, cx = 200, cy = 200, rx = 120, ry = 26 }) => <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#000" opacity="0.35" filter={`url(#${id}blur)`} />;
// 丼（ラーメン・うどん・そば）
function Bowl({ id, soup, children, color = '#7a1f1f' }) {
  return (
    <g>
      <Shadow id={id} cy={214} rx={135} ry={24} />
      <path d="M70 150 Q200 255 330 150 Z" fill={color} />
      <path d="M70 150 Q200 255 330 150" fill="none" stroke="#000" strokeOpacity="0.25" strokeWidth="4" />
      <path d="M95 175 Q140 205 170 210" stroke="#fff" strokeOpacity="0.25" strokeWidth="5" fill="none" strokeLinecap="round" />
      <ellipse cx="200" cy="150" rx="132" ry="40" fill="#f3ede4" />
      <ellipse cx="200" cy="152" rx="120" ry="33" fill={soup} />
      <ellipse cx="170" cy="140" rx="60" ry="10" fill="#fff" opacity="0.18" />
      {children}
    </g>
  );
}
const Noodles = ({ color = '#f2d58a', thick = 3 }) => (
  <g stroke={color} strokeWidth={thick} fill="none" strokeLinecap="round" opacity="0.95">
    {[0, 1, 2, 3, 4].map((i) => (
      <path key={i} d={`M${110 + i * 8} ${150 + (i % 2) * 6} q 20 -12 40 0 t 40 0 t 40 0 t 40 0`} />
    ))}
  </g>
);
const Onion = () => (
  <g fill="#5fae4b">
    {[[150, 140], [162, 146], [175, 138], [240, 150], [252, 142], [230, 160], [188, 156]].map(([x, y]) => (
      <ellipse key={`${x}${y}`} cx={x} cy={y} rx="5" ry="3" />
    ))}
  </g>
);
function Plate({ id, rx = 140, ry = 44, cy = 160, fill = '#f7f4ee', rim = '#e2ddd3' }) {
  return (
    <g>
      <Shadow id={id} cy={cy + 34} rx={rx + 6} ry={ry * 0.6} />
      <ellipse cx="200" cy={cy} rx={rx} ry={ry} fill={rim} />
      <ellipse cx="200" cy={cy - 2} rx={rx - 14} ry={ry - 8} fill={fill} />
      <ellipse cx="160" cy={cy - 18} rx={rx * 0.4} ry="6" fill="#fff" opacity="0.5" />
    </g>
  );
}
const Rice = ({ cx, cy, rx = 30, ry = 18 }) => (
  <g>
    <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#fbfaf6" />
    <ellipse cx={cx - rx * 0.3} cy={cy - ry * 0.35} rx={rx * 0.4} ry={ry * 0.25} fill="#fff" />
  </g>
);
const SmallBowl = ({ id, cx, cy, r = 32, color = '#3b2b25', inner = '#8a4a20', children }) => (
  <g>
    <ellipse cx={cx} cy={cy + r * 0.75} rx={r + 4} ry={r * 0.3} fill="#000" opacity="0.3" filter={`url(#${id}blur)`} />
    <path d={`M${cx - r} ${cy} Q${cx} ${cy + r * 1.3} ${cx + r} ${cy} Z`} fill={color} />
    <ellipse cx={cx} cy={cy} rx={r} ry={r * 0.32} fill="#efe7da" />
    <ellipse cx={cx} cy={cy + 1} rx={r - 5} ry={r * 0.26} fill={inner} />
    {children}
  </g>
);

const DISHES = {
  ramen: ({ id }) => (
    <Bowl id={id} soup="#c98a3a">
      <Noodles />
      <ellipse cx="250" cy="146" rx="30" ry="15" fill="#d9a07f" />
      <ellipse cx="250" cy="146" rx="22" ry="10" fill="#e9b997" />
      <ellipse cx="230" cy="160" rx="28" ry="13" fill="#cf9372" />
      <g>
        <ellipse cx="150" cy="150" rx="20" ry="13" fill="#fffaf0" />
        <ellipse cx="150" cy="151" rx="11" ry="7" fill="#f2a71b" />
      </g>
      <rect x="275" y="118" width="26" height="40" rx="2" fill="#1d2b1d" transform="rotate(12 288 138)" />
      <circle cx="195" cy="132" r="11" fill="#fff" />
      <path d="M190 132 q5 -6 10 0 t-10 0" stroke="#e86a8a" strokeWidth="2.5" fill="none" />
      <Onion />
    </Bowl>
  ),
  udon: ({ id }) => (
    <Bowl id={id} soup="#d9b26a" color="#2d2420">
      <Noodles color="#fbf2dc" thick={7} />
      <rect x="215" y="128" width="62" height="34" rx="6" fill="#c0782f" />
      <rect x="219" y="132" width="54" height="26" rx="5" fill="#d58d3e" />
      <Onion />
    </Bowl>
  ),
  soba: ({ id }) => (
    <Bowl id={id} soup="#7b4a25" color="#2d2420">
      <Noodles color="#a99272" thick={3} />
      <Onion />
      <ellipse cx="240" cy="150" rx="18" ry="8" fill="#e9e3d6" />
    </Bowl>
  ),
  tempura: ({ id }) => (
    <Bowl id={id} soup="#d4a85d" color="#2d2420">
      <Noodles color="#fbf2dc" thick={7} />
      {[0, 1].map((i) => (
        <g key={i} transform={`rotate(${-20 + i * 30} 230 140)`}>
          <ellipse cx="235" cy={135 + i * 8} rx="55" ry="15" fill="#e3a63f" />
          <ellipse cx="235" cy={133 + i * 8} rx="48" ry="9" fill="#f2c165" />
          <path d={`M285 ${130 + i * 8} l18 -10 l-4 14 z`} fill="#e3542d" />
        </g>
      ))}
      <Onion />
    </Bowl>
  ),
  sushi: ({ id }) => (
    <g>
      <Shadow id={id} cy={212} rx={150} ry={20} />
      <rect x="55" y="150" width="290" height="46" rx="6" fill="#c89a62" />
      <rect x="55" y="146" width="290" height="40" rx="6" fill="#ddb37a" />
      {[
        [95, '#f08a4b', '#ffd0b0'],
        [150, '#c8273a', '#ef7a85'],
        [205, '#f3ece2', '#ffffff'],
        [260, '#f08a4b', '#ffd0b0'],
      ].map(([x, fish, hi]) => (
        <g key={x}>
          <ellipse cx={x} cy="160" rx="24" ry="13" fill="#fbfaf5" />
          <path d={`M${x - 28} 154 Q${x} 132 ${x + 28} 152 Q${x} 160 ${x - 28} 154 Z`} fill={fish} />
          <path d={`M${x - 16} 148 q10 -6 24 -4`} stroke={hi} strokeWidth="3" fill="none" opacity="0.8" />
        </g>
      ))}
      <g>
        <circle cx="312" cy="158" r="18" fill="#1b2a1d" />
        <circle cx="312" cy="158" r="13" fill="#fbfaf5" />
        <circle cx="312" cy="158" r="5" fill="#6fae58" />
      </g>
      <path d="M320 128 q20 -10 30 6 q-14 2 -30 -6 z" fill="#5c9e3d" />
    </g>
  ),
  sashimi: ({ id }) => (
    <g>
      <Plate id={id} rx={150} ry={46} fill="#e8eef0" rim="#9fb3bb" />
      <path d="M260 140 q40 -30 60 10 q-30 20 -60 -10 z" fill="#4f8f36" />
      <ellipse cx="275" cy="160" rx="30" ry="12" fill="#f4f4ef" />
      {[0, 1, 2, 3, 4].map((i) => (
        <path key={i} d={`M${110 + i * 22} 170 q14 -40 34 -36 q-6 30 -20 40 z`} fill={i % 2 ? '#e05a4f' : '#c82a3a'} />
      ))}
      {[0, 1, 2].map((i) => (
        <path key={i} d={`M${220 + i * 18} 175 q12 -30 28 -28 q-4 24 -16 32 z`} fill="#f39a63" />
      ))}
    </g>
  ),
  karaage: ({ id }) => (
    <g>
      <Plate id={id} />
      <g fill="#7fbf5a">
        <ellipse cx="270" cy="150" rx="45" ry="16" />
        <ellipse cx="285" cy="145" rx="30" ry="10" fill="#a7d982" />
      </g>
      {[
        [130, 150],
        [165, 142],
        [190, 160],
        [150, 168],
        [210, 140],
      ].map(([x, y]) => (
        <g key={`${x}${y}`}>
          <ellipse cx={x} cy={y} rx="24" ry="17" fill="#a85e1e" />
          <ellipse cx={x - 4} cy={y - 4} rx="17" ry="11" fill="#cf8a33" />
          <ellipse cx={x - 8} cy={y - 7} rx="6" ry="3" fill="#f1c070" />
        </g>
      ))}
      <path d="M232 168 l30 -12 l-6 22 z" fill="#f6e04a" />
    </g>
  ),
  yakitori: ({ id }) => (
    <g>
      <Shadow id={id} cy={206} rx={150} ry={18} />
      <rect x="60" y="150" width="280" height="40" rx="8" fill="#20232a" />
      <rect x="60" y="146" width="280" height="36" rx="8" fill="#2f333c" />
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`rotate(${-6 + i * 4} 200 ${150 + i * 6})`}>
          <line x1="70" y1={150 + i * 9} x2="330" y2={150 + i * 9} stroke="#e5c995" strokeWidth="3" />
          {[0, 1, 2, 3].map((j) => (
            <g key={j}>
              <ellipse cx={120 + j * 46} cy={150 + i * 9} rx="16" ry="11" fill={j % 2 && i === 1 ? '#e8e3c6' : '#8a4a1f'} />
              <ellipse cx={116 + j * 46} cy={146 + i * 9} rx="8" ry="4" fill="#c27a3a" opacity="0.8" />
            </g>
          ))}
        </g>
      ))}
    </g>
  ),
  sake: ({ id }) => (
    <g>
      <Shadow id={id} cx={170} cy={214} rx={70} ry={14} />
      <path d="M150 210 Q120 175 140 140 Q150 115 158 90 L182 90 Q190 115 200 140 Q220 175 190 210 Z" fill="#e9e1d2" />
      <path d="M150 210 Q120 175 140 140 Q150 115 158 90 L166 90 Q160 120 152 145 Q140 180 160 210 Z" fill="#fff" opacity="0.5" />
      <rect x="156" y="82" width="28" height="10" rx="3" fill="#d8cdb8" />
      <path d="M140 160 Q170 168 200 160" stroke="#2b5c8a" strokeWidth="5" fill="none" />
      {[260, 315].map((x) => (
        <g key={x}>
          <ellipse cx={x} cy="205" rx="26" ry="7" fill="#000" opacity="0.3" filter={`url(#${id}blur)`} />
          <path d={`M${x - 24} 175 Q${x} 215 ${x + 24} 175 Z`} fill="#f2ede4" />
          <ellipse cx={x} cy="175" rx="24" ry="7" fill="#e7dfcf" />
          <ellipse cx={x} cy="176" rx="19" ry="5" fill="#f3e9c8" />
          <circle cx={x} cy="182" r="5" fill="none" stroke="#2b5c8a" strokeWidth="2" />
        </g>
      ))}
    </g>
  ),
  curry: ({ id }) => (
    <g>
      <Plate id={id} rx={150} ry={46} />
      <Rice cx={160} cy={150} rx={60} ry={24} />
      <path d="M200 135 Q290 120 315 150 Q300 180 210 178 Q190 160 200 135 Z" fill="#8a4e17" />
      <path d="M215 145 Q270 132 300 152" stroke="#b46e2c" strokeWidth="5" fill="none" opacity="0.7" />
      {[
        [240, 150, '#e8873a'],
        [270, 160, '#f4d8a4'],
        [255, 168, '#e8873a'],
      ].map(([x, y, c]) => (
        <rect key={`${x}${y}`} x={x} y={y} width="16" height="12" rx="3" fill={c} />
      ))}
      <path d="M120 135 l12 -4 l-2 8 z" fill="#c8273a" />
    </g>
  ),
  coffee: ({ id }) => (
    <g>
      <Plate id={id} rx={95} ry={30} cy={180} />
      <path d="M140 120 L150 185 Q200 198 250 185 L260 120 Z" fill="#f4efe7" />
      <path d="M260 135 q34 0 30 24 q-4 18 -36 16" fill="none" stroke="#f4efe7" strokeWidth="9" />
      <ellipse cx="200" cy="120" rx="60" ry="14" fill="#e8e1d6" />
      <ellipse cx="200" cy="121" rx="52" ry="10" fill="#4a2a17" />
      <ellipse cx="190" cy="119" rx="24" ry="4" fill="#a8703f" opacity="0.6" />
      <g stroke="#fff" strokeOpacity="0.35" strokeWidth="4" fill="none" strokeLinecap="round" filter={`url(#${id}soft)`}>
        <path d="M185 100 q-10 -15 0 -30 q10 -15 0 -30" />
        <path d="M210 100 q10 -15 0 -30 q-10 -15 0 -28" />
      </g>
      <rect x="290" y="175" width="40" height="8" rx="3" fill="#c9c2b6" transform="rotate(-8 310 179)" />
    </g>
  ),
  pudding: ({ id }) => (
    <g>
      <Plate id={id} rx={120} ry={38} cy={175} />
      <path d="M150 170 L165 108 Q200 98 235 108 L250 170 Q200 182 150 170 Z" fill="#f2cf6e" />
      <path d="M163 116 Q200 104 237 116 L240 128 Q200 118 160 128 Z" fill="#8a4512" />
      <ellipse cx="200" cy="108" rx="35" ry="8" fill="#6a300a" />
      <path d="M170 140 q4 18 2 28" stroke="#fff" strokeOpacity="0.4" strokeWidth="5" fill="none" strokeLinecap="round" />
      <circle cx="275" cy="160" r="9" fill="#d3263b" />
      <path d="M275 151 q4 -8 10 -10" stroke="#3a7a2a" strokeWidth="2" fill="none" />
      <ellipse cx="245" cy="172" rx="22" ry="7" fill="#fbf7ef" />
    </g>
  ),
  pasta: ({ id }) => (
    <g>
      <Plate id={id} rx={150} ry={46} />
      <g stroke="#e0662f" strokeWidth="5" fill="none" strokeLinecap="round">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <path key={i} d={`M${140 + i * 6} ${165 - i * 3} q30 -30 60 -6 t50 -4 q-30 26 -70 18`} opacity={0.75 + (i % 2) * 0.25} />
        ))}
      </g>
      {[
        [175, 140],
        [235, 152],
        [205, 165],
      ].map(([x, y]) => (
        <path key={`${x}${y}`} d={`M${x} ${y} q8 -10 16 0 q-8 6 -16 0 z`} fill="#3f9a3a" />
      ))}
      {[
        [190, 150],
        [250, 140],
      ].map(([x, y]) => (
        <circle key={`${x}${y}`} cx={x} cy={y} r="7" fill="#b9472e" />
      ))}
      <path d="M260 125 l40 -40" stroke="#c9c2b6" strokeWidth="5" strokeLinecap="round" />
    </g>
  ),
  teishoku: ({ id }) => (
    <g>
      <Shadow id={id} cy={214} rx={160} ry={20} />
      <rect x="40" y="110" width="320" height="110" rx="10" fill="#4a2a17" />
      <rect x="46" y="114" width="308" height="100" rx="8" fill="#6b3d20" />
      <SmallBowl id={id} cx={105} cy={175} r={36} color="#f2ede4" inner="#fbfaf6" />
      <SmallBowl id={id} cx={190} cy={180} r={30} color="#5a1e16" inner="#a8682f" />
      <ellipse cx="280" cy="150" rx="62" ry="24" fill="#e9e3d8" />
      <ellipse cx="280" cy="148" rx="54" ry="18" fill="#f6f2ea" />
      {[0, 1, 2].map((i) => (
        <path key={i} d={`M${245 + i * 22} 150 q12 -14 26 -4 q-10 12 -26 4 z`} fill="#a65a22" />
      ))}
      <ellipse cx="310" cy="142" rx="18" ry="6" fill="#8fc46a" />
      <SmallBowl id={id} cx={300} cy={190} r={20} color="#3b2b25" inner="#e9c36a" />
    </g>
  ),
  kobachi: ({ id }) => (
    <g>
      <SmallBowl id={id} cx={150} cy={150} r={60} color="#2d3c4f" inner="#7a4a22">
        {[
          [130, 148, '#e88a3a'],
          [160, 144, '#c86a2a'],
          [150, 156, '#f0d48a'],
          [172, 152, '#4f8f36'],
        ].map(([x, y, c]) => (
          <ellipse key={`${x}${y}`} cx={x} cy={y} rx="12" ry="7" fill={c} />
        ))}
      </SmallBowl>
      <SmallBowl id={id} cx={290} cy={170} r={40} color="#e9e3d6" inner="#7fbf5a">
        <ellipse cx="290" cy="170" rx="18" ry="5" fill="#a7d982" />
      </SmallBowl>
      <g stroke="#3a2a1e" strokeWidth="5" strokeLinecap="round">
        <line x1="220" y1="215" x2="350" y2="200" />
        <line x1="225" y1="225" x2="355" y2="212" />
      </g>
    </g>
  ),
  gyoza: ({ id }) => (
    <g>
      <Plate id={id} rx={150} ry={44} fill="#f2f2ee" rim="#2c4f6e" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <g key={i} transform={`translate(${118 + i * 30} ${150 - Math.abs(i - 2.5) * 2})`}>
          <path d="M-18 6 Q0 -26 18 6 Q0 14 -18 6 Z" fill="#f4e7c9" />
          <path d="M-18 6 Q0 14 18 6 Q0 18 -18 6 Z" fill="#b8742c" />
          <path d="M-10 -6 q4 3 6 0 q4 3 6 0 q4 3 6 0" stroke="#e0cfa6" strokeWidth="1.5" fill="none" />
        </g>
      ))}
      <SmallBowl id={id} cx={310} cy={190} r={18} color="#f2ede4" inner="#5a2a10" />
    </g>
  ),
  matcha: ({ id }) => (
    <g>
      <Shadow id={id} cx={180} cy={212} rx={90} ry={18} />
      <path d="M100 140 Q105 215 180 215 Q255 215 260 140 Z" fill="#3c3530" />
      <path d="M108 150 Q118 200 160 208" stroke="#fff" strokeOpacity="0.15" strokeWidth="6" fill="none" />
      <ellipse cx="180" cy="140" rx="80" ry="22" fill="#5a4f47" />
      <ellipse cx="180" cy="142" rx="70" ry="17" fill="#6f9a2c" />
      <ellipse cx="170" cy="140" rx="40" ry="8" fill="#a6c75a" opacity="0.7" />
      <g fill="#c9dc8a" opacity="0.8">
        {[150, 175, 200, 190, 160].map((x, i) => (
          <circle key={i} cx={x} cy={138 + (i % 3) * 3} r="2" />
        ))}
      </g>
      <g transform="translate(300 150)">
        <ellipse cx="0" cy="55" rx="26" ry="6" fill="#000" opacity="0.3" filter={`url(#${id}blur)`} />
        <rect x="-5" y="-40" width="10" height="45" rx="3" fill="#d8c08a" />
        <path d="M-22 5 Q0 70 22 5 Z" fill="#e8d6a3" />
        <g stroke="#c7ad6f" strokeWidth="1.5">
          {[-16, -10, -4, 2, 8, 14].map((x) => (
            <line key={x} x1={x} y1="8" x2={x * 0.6} y2="44" />
          ))}
        </g>
      </g>
    </g>
  ),
  wagashi: ({ id }) => (
    <g>
      <Plate id={id} rx={150} ry={44} fill="#2b2b2b" rim="#111" />
      {[
        [130, '#f3a9c0', '#fbd7e2'],
        [200, '#9cc76b', '#cfe6a8'],
        [270, '#f2e6c9', '#fff7e4'],
      ].map(([x, c, hi]) => (
        <g key={x}>
          <ellipse cx={x} cy="170" rx="30" ry="9" fill="#000" opacity="0.35" filter={`url(#${id}blur)`} />
          <ellipse cx={x} cy="150" rx="30" ry="22" fill={c} />
          <ellipse cx={x - 8} cy="141" rx="12" ry="7" fill={hi} opacity="0.8" />
          <path d={`M${x - 12} 152 q12 -10 24 0`} stroke="#fff" strokeOpacity="0.5" strokeWidth="2" fill="none" />
        </g>
      ))}
      <path d="M300 120 l40 30" stroke="#b58b4d" strokeWidth="4" strokeLinecap="round" />
    </g>
  ),
  pottery: ({ id }) => (
    <g>
      <Shadow id={id} cy={214} rx={140} ry={20} />
      <ellipse cx="200" cy="190" rx="130" ry="30" fill="#595f66" />
      <ellipse cx="200" cy="184" rx="120" ry="25" fill="#7b828a" />
      <path d="M140 175 Q130 110 160 95 L240 95 Q270 110 260 175 Q200 190 140 175 Z" fill="#b5835a" />
      <ellipse cx="200" cy="95" rx="40" ry="10" fill="#8f603d" />
      <ellipse cx="200" cy="96" rx="30" ry="6" fill="#5e3c25" />
      <g stroke="#9a6a45" strokeWidth="2" fill="none" opacity="0.6">
        <path d="M150 130 Q200 140 250 130" />
        <path d="M146 150 Q200 162 254 150" />
      </g>
      <path d="M155 160 Q150 120 170 100" stroke="#e0b48a" strokeWidth="5" fill="none" opacity="0.5" strokeLinecap="round" />
    </g>
  ),
  indigo: ({ id }) => (
    <g>
      <Shadow id={id} cy={214} rx={150} ry={20} />
      {[
        [70, 120, '#1d3b6e'],
        [150, 128, '#28508f'],
        [230, 118, '#16325c'],
      ].map(([x, y, c], i) => (
        <g key={x}>
          <rect x={x} y={y} width="110" height="80" rx="4" fill={c} transform={`rotate(${-4 + i * 4} ${x + 55} ${y + 40})`} />
          <g fill="none" stroke="#c9d8ee" strokeOpacity="0.75" strokeWidth="2.5" transform={`rotate(${-4 + i * 4} ${x + 55} ${y + 40})`}>
            {i === 0 && [0, 1, 2].map((j) => <circle key={j} cx={x + 30 + j * 25} cy={y + 40} r="9" />)}
            {i === 1 && [0, 1, 2, 3].map((j) => <path key={j} d={`M${x + 10} ${y + 15 + j * 18} q25 -10 50 0 t50 0`} />)}
            {i === 2 && [0, 1, 2].map((j) => <rect key={j} x={x + 15 + j * 30} y={y + 25} width="18" height="18" transform={`rotate(45 ${x + 24 + j * 30} ${y + 34})`} />)}
          </g>
        </g>
      ))}
    </g>
  ),
  farm: ({ id }) => (
    <g>
      <Shadow id={id} cy={214} rx={140} ry={22} />
      <path d="M80 140 L320 140 L295 210 L105 210 Z" fill="#b07a3e" />
      <g stroke="#8a5a28" strokeWidth="3">
        {[150, 170, 190].map((y) => (
          <line key={y} x1={86 + (y - 140) / 3} y1={y} x2={314 - (y - 140) / 3} y2={y} />
        ))}
      </g>
      {[
        [120, 130, '#e2452f', 22],
        [160, 122, '#f39a2b', 24],
        [205, 128, '#e2452f', 22],
        [250, 120, '#7a3fa0', 20],
        [290, 132, '#f2c12e', 22],
      ].map(([x, y, c, r]) => (
        <g key={x}>
          <circle cx={x} cy={y} r={r} fill={c} />
          <ellipse cx={x - r * 0.35} cy={y - r * 0.4} rx={r * 0.35} ry={r * 0.22} fill="#fff" opacity="0.35" />
        </g>
      ))}
      <path d="M150 100 q10 -20 25 -10 q-10 10 -25 10 z" fill="#4f8f36" />
      <path d="M240 98 q-12 -18 -26 -6 q12 8 26 6 z" fill="#4f8f36" />
    </g>
  ),
  calligraphy: ({ id }) => (
    <g>
      <Shadow id={id} cx={190} cy={210} rx={120} ry={16} />
      <rect x="90" y="96" width="200" height="120" fill="#f6f1e6" transform="rotate(-4 190 156)" />
      <g stroke="#1b1b1b" strokeLinecap="round" fill="none" transform="rotate(-4 190 156)">
        <path d="M150 120 q10 30 0 70" strokeWidth="10" />
        <path d="M130 140 q40 -6 60 0" strokeWidth="8" />
        <path d="M215 118 q-6 40 6 74" strokeWidth="9" />
        <path d="M200 150 q30 -10 50 10" strokeWidth="7" />
      </g>
      <rect x="292" y="150" width="50" height="34" rx="4" fill="#222" />
      <ellipse cx="317" cy="165" rx="16" ry="8" fill="#000" />
      <g transform="rotate(-30 300 120)">
        <rect x="270" y="112" width="90" height="7" rx="3" fill="#b5834a" />
        <path d="M262 110 q-14 4 -18 6 q4 2 18 8 z" fill="#111" />
      </g>
    </g>
  ),
};
