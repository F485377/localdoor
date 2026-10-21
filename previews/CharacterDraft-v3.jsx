import { useId } from 'react';

// 旅のおともキャラクター（緑の恐竜のドキちゃん）。2頭身で、うろこ模様のある恐竜らしい肌。
// SVG のグラデーションとハイライトで立体感を出し、CSS で動かす（ゆれる・まばたき・しゃべる口・登場）。
//   talking … 口をぱくぱくさせる
//   skipBirth … 登場の演出（ぽんっと飛び出す）を飛ばす
//   pose="head" … 顔だけ（隠れているときの小さなボタン用）

function Defs({ id }) {
  return (
    <defs>
      <radialGradient id={`${id}skin`} cx="35%" cy="28%" r="80%">
        <stop offset="0%" stopColor="#a6ee96" />
        <stop offset="45%" stopColor="#5cc45e" />
        <stop offset="100%" stopColor="#2f8f3c" />
      </radialGradient>
      <radialGradient id={`${id}cream`} cx="45%" cy="30%" r="75%">
        <stop offset="0%" stopColor="#fffbe0" />
        <stop offset="60%" stopColor="#fbe58a" />
        <stop offset="100%" stopColor="#ecc24a" />
      </radialGradient>
      <linearGradient id={`${id}red`} x1="0" y1="0" x2="0.3" y2="1">
        <stop offset="0%" stopColor="#ff8a72" />
        <stop offset="55%" stopColor="#ec4b3c" />
        <stop offset="100%" stopColor="#c0302a" />
      </linearGradient>
      <radialGradient id={`${id}iris`} cx="50%" cy="65%" r="60%">
        <stop offset="0%" stopColor="#c27a3e" />
        <stop offset="60%" stopColor="#7a3e18" />
        <stop offset="100%" stopColor="#3d1c08" />
      </radialGradient>
      <radialGradient id={`${id}cheek`} cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#ff7f8f" stopOpacity="0.85" />
        <stop offset="100%" stopColor="#ff7f8f" stopOpacity="0" />
      </radialGradient>
      <linearGradient id={`${id}boot`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#c08850" />
        <stop offset="100%" stopColor="#6b401c" />
      </linearGradient>
      <linearGradient id={`${id}pack`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#f6b25f" />
        <stop offset="100%" stopColor="#c46d22" />
      </linearGradient>
      <linearGradient id={`${id}mouth`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#6e1f22" />
        <stop offset="100%" stopColor="#a8343a" />
      </linearGradient>
      {/* うろこ：小さな丸を互い違いに並べる */}
      <pattern id={`${id}scales`} width="14" height="12" patternUnits="userSpaceOnUse">
        <ellipse cx="3.5" cy="3" rx="4" ry="2.8" fill="#1d6a2b" opacity="0.16" />
        <ellipse cx="10.5" cy="9" rx="4" ry="2.8" fill="#1d6a2b" opacity="0.16" />
      </pattern>
    </defs>
  );
}

const OUTLINE = '#2c7a37';

function Head({ id }) {
  const u = (name) => `url(#${id}${name})`;
  return (
    <g className="chr-head">
      {/* 頭から背中へのトゲ（頭の後ろに描く） */}
      <g fill={u('red')} stroke="#c0302a" strokeWidth="5" strokeLinejoin="round">
        <path d="M84 42 L94 8 L110 32 Z" />
        <path d="M110 30 L126 0 L138 30 Z" />
        <path d="M138 32 L160 8 L162 44 Z" />
        <path d="M162 46 L190 30 L182 66 Z" />
        <path d="M182 70 L210 66 L194 94 Z" />
      </g>
      <g fill="#fff" opacity="0.45">
        <ellipse cx="96" cy="22" rx="2.5" ry="6" transform="rotate(20 96 22)" />
        <ellipse cx="126" cy="14" rx="2.5" ry="6" />
        <ellipse cx="156" cy="22" rx="2.5" ry="6" transform="rotate(-25 156 22)" />
      </g>

      {/* 頭（大きくて丸い） */}
      <ellipse cx="120" cy="92" rx="80" ry="66" fill={u('skin')} stroke={OUTLINE} strokeWidth="2.5" />
      {/* うろこと斑点（恐竜らしい肌） */}
      <ellipse cx="120" cy="92" rx="78" ry="64" fill={u('scales')} />
      <g fill="#226f2f" opacity="0.28">
        <ellipse cx="150" cy="44" rx="7" ry="5" />
        <ellipse cx="170" cy="60" rx="4.5" ry="3.5" />
        <ellipse cx="104" cy="36" rx="5" ry="3.5" />
        <ellipse cx="182" cy="84" rx="3.5" ry="3" />
        <ellipse cx="58" cy="90" rx="3.5" ry="3" />
      </g>
      {/* 口元（クリーム色） */}
      <ellipse cx="120" cy="124" rx="52" ry="31" fill={u('cream')} />
      {/* つや（控えめ） */}
      <ellipse cx="84" cy="48" rx="20" ry="8" fill="#fff" opacity="0.3" transform="rotate(-24 84 48)" />

      {/* 眉 */}
 <path d="M80 60 Q92 53 104 59" fill="none" stroke={OUTLINE} strokeWidth="3.5" strokeLinecap="round" />
 <path d="M136 59 Q148 53 160 60" fill="none" stroke={OUTLINE} strokeWidth="3.5" strokeLinecap="round" />

      {/* 目（大きく、キラキラ） */}
      <g className="chr-eyes">
        {[92, 148].map((x) => (
          <g key={x}>
            <ellipse cx={x} cy="86" rx="15" ry="17" fill="#fff" stroke={OUTLINE} strokeWidth="2" />
            <ellipse cx={x + 1} cy="89" rx="10.5" ry="12.5" fill={u('iris')} />
            <ellipse cx={x + 1} cy="90" rx="6" ry="7" fill="#241005" />
            <circle cx={x - 3} cy="84" r="3.6" fill="#fff" />
          </g>
        ))}
      </g>

      {/* ほっぺ（ふんわり） */}
      <ellipse cx="64" cy="114" rx="17" ry="11" fill={u('cheek')} />
      <ellipse cx="176" cy="114" rx="17" ry="11" fill={u('cheek')} />

      {/* 鼻の穴 */}
      <ellipse cx="110" cy="108" rx="2.6" ry="2" fill={OUTLINE} />
      <ellipse cx="130" cy="108" rx="2.6" ry="2" fill={OUTLINE} />

      {/* 口（しゃべるとき動く） */}
      <g className="chr-mouth">
        <path d="M94 119 Q120 124 146 119 Q143 150 120 150 Q97 150 94 119 Z" fill={u('mouth')} />
        <ellipse cx="120" cy="141" rx="15" ry="8" fill="#ff8f8f" />
        <path d="M104 121 L111 121.6 L107.5 129 Z" fill="#fff" />
        <path d="M129 121.6 L136 121 L132.5 129 Z" fill="#fff" />
      </g>
    </g>
  );
}

export default function Character({ talking = false, skipBirth = false, pose = 'full', className = '' }) {
  // 同じ画面にキャラクターが2体あってもグラデーションが混ざらないように、id を分ける
  const id = `c${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const u = (name) => `url(#${id}${name})`;

  if (pose === 'head') {
    return (
      <svg className={`character head-only ${className}`} viewBox="34 -6 184 166" aria-hidden="true">
        <Defs id={id} />
        <Head id={id} />
      </svg>
    );
  }

  return (
    <svg className={`character${talking ? ' talking' : ''}${skipBirth ? '' : ' birth'} ${className}`} viewBox="0 -4 240 266" aria-hidden="true">
      <Defs id={id} />
      {/* 足元の影 */}
      <ellipse cx="120" cy="252" rx="64" ry="7" fill="#1c2536" opacity="0.12" />
      <g className="chr-bob">
        {/* しっぽ */}
        <path d="M82 206 C56 212 34 226 16 210 C26 238 66 240 96 224 Z" fill={u('skin')} stroke={OUTLINE} strokeWidth="2.5" strokeLinejoin="round" />
        {/* リュック（背中から少し見える） */}
        <rect x="58" y="160" width="32" height="52" rx="14" fill={u('pack')} stroke="#a85a17" strokeWidth="2" />

        {/* 足とブーツ */}
        <ellipse cx="98" cy="226" rx="17" ry="14" fill={u('skin')} stroke={OUTLINE} strokeWidth="2.5" />
        <ellipse cx="142" cy="226" rx="17" ry="14" fill={u('skin')} stroke={OUTLINE} strokeWidth="2.5" />
        <path d="M74 240 Q74 224 96 224 Q118 224 120 240 Q120 250 98 250 Q74 250 74 240 Z" fill={u('boot')} stroke="#5a3414" strokeWidth="2" />
        <path d="M120 240 Q122 224 144 224 Q166 224 166 240 Q166 250 144 250 Q120 250 120 240 Z" fill={u('boot')} stroke="#5a3414" strokeWidth="2" />
        <ellipse cx="90" cy="231" rx="8" ry="3" fill="#fff" opacity="0.35" />
        <ellipse cx="136" cy="231" rx="8" ry="3" fill="#fff" opacity="0.35" />

        {/* 体とおなか（ぽってり） */}
        <ellipse cx="120" cy="192" rx="54" ry="48" fill={u('skin')} stroke={OUTLINE} strokeWidth="2.5" />
        <ellipse cx="120" cy="192" rx="52" ry="46" fill={u('scales')} />
        <g fill="#226f2f" opacity="0.28">
          <ellipse cx="160" cy="210" rx="6" ry="4.5" />
          <ellipse cx="166" cy="190" rx="3.5" ry="3" />
          <ellipse cx="78" cy="214" rx="4" ry="3" />
        </g>
        <ellipse cx="120" cy="202" rx="35" ry="35" fill={u('cream')} />
        {/* おなかの段々 */}
        <g fill="none" stroke="#dcaa38" strokeWidth="2.2" strokeLinecap="round" opacity="0.7">
          <path d="M96 184 Q120 191 144 184" />
          <path d="M90 200 Q120 208 150 200" />
          <path d="M92 216 Q120 224 148 216" />
        </g>

        {/* リュックのベルトとコンパス */}
        <path d="M80 160 Q74 192 86 224" fill="none" stroke={u('pack')} strokeWidth="9" strokeLinecap="round" />
        <circle cx="79" cy="188" r="9.5" fill="#fbecc6" stroke="#a85a17" strokeWidth="2.5" />
        <path d="M79 181 L81.5 188 L79 195 L76.5 188 Z" fill="#e2483d" />

        {/* サムズアップの腕（頭に隠れないよう外に出す） */}
        <ellipse cx="64" cy="176" rx="12" ry="22" fill={u('skin')} stroke={OUTLINE} strokeWidth="2.5" transform="rotate(50 64 176)" />
        <circle cx="44" cy="160" r="13" fill={u('skin')} stroke={OUTLINE} strokeWidth="2.5" />
        <rect x="37" y="132" width="12" height="25" rx="6" fill={u('skin')} stroke={OUTLINE} strokeWidth="2.5" />

        {/* スカーフ */}
        <path d="M74 146 Q120 166 166 146 L154 168 Q120 194 86 168 Z" fill={u('red')} stroke="#b02a24" strokeWidth="2" strokeLinejoin="round" />
        <ellipse cx="104" cy="160" rx="10" ry="3.5" fill="#fff" opacity="0.35" transform="rotate(12 104 160)" />

        <Head id={id} />

        {/* スマホを体の前で持つ */}
        <ellipse cx="170" cy="188" rx="12" ry="20" fill={u('skin')} stroke={OUTLINE} strokeWidth="2.5" transform="rotate(-30 170 188)" />
        <g className="chr-phone">
          <g transform="rotate(-10 158 194)">
            <rect x="140" y="164" width="38" height="62" rx="9" fill="#2d3138" />
            <rect x="144" y="170" width="30" height="48" rx="5" fill="#eaf5ff" />
            <path d="M144 202 L160 186 L174 194" fill="none" stroke="#8fc3f5" strokeWidth="3.5" />
            <path d="M152 170 L158 218" stroke="#8fc3f5" strokeWidth="3" />
            <circle cx="155" cy="180" r="4.5" fill="#e2483d" />
            <circle cx="166" cy="204" r="4" fill="#4cb553" />
            <rect x="147" y="209" width="24" height="6" rx="3" fill="#e2483d" />
            <rect x="142" y="166" width="8" height="40" rx="4" fill="#fff" opacity="0.12" />
          </g>
        </g>
        <circle cx="174" cy="210" r="12" fill={u('skin')} stroke={OUTLINE} strokeWidth="2.5" />
        <circle cx="146" cy="214" r="9" fill={u('skin')} stroke={OUTLINE} strokeWidth="2.5" />
      </g>
    </svg>
  );
}
