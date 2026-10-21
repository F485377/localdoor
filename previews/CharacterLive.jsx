// 旅のおともキャラクター（緑の恐竜のドキちゃん）。写真から切り抜いた絵（character.png）に、
// 口（半開き・閉じた口）とまぶたの絵を重ね、CSS で動かす。
//   talking … 口をぱくぱく（開く → 半開き → 閉じる → 半開き）
//   skipBirth … 登場の演出（ぽんっと飛び出す）を飛ばす
//   pose="head" … 顔だけ（隠れているときの小さなボタン用）
// 座標はすべて character.png（559×658）のピクセル
const SRC = new URL('./character-cutout.png', import.meta.url).href;
const W = 559;
const H = 658;

function Overlay() {
  return (
    <svg className="chr-overlay" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <defs>
        <radialGradient id="chrMuzzle" cx="50%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#f3c862" />
          <stop offset="70%" stopColor="#ecbd57" />
          <stop offset="100%" stopColor="#df9f42" />
        </radialGradient>
        <radialGradient id="chrLid" cx="45%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#8cc35a" />
          <stop offset="100%" stopColor="#6aa451" />
        </radialGradient>
        {/* 塗ったふちをぼかして、写真になじませる */}
        <filter id="chrSoft" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
      </defs>

      {/* 半開きの口 */}
      <g className="chr-mouth-half">
        <path d="M148 244 Q158 292 225 308 Q278 300 290 236 Q220 262 148 244 Z" fill="url(#chrMuzzle)" filter="url(#chrSoft)" />
        <path d="M158 250 Q218 264 278 242 Q262 284 222 288 Q178 286 158 250 Z" fill="#5a2a1e" />
        <path d="M188 280 Q222 268 256 279 Q240 288 222 288 Q202 288 188 280 Z" fill="#e4675a" />
        <path d="M236 256 L246 254 L242 263 Z" fill="#fff8ec" />
        <path d="M156 249 Q218 266 280 241" fill="none" stroke="#3a2418" strokeWidth="3" strokeLinecap="round" />
      </g>

      {/* 閉じた口（にっこり） */}
      <g className="chr-mouth-closed">
        <path d="M148 244 Q158 292 225 308 Q278 300 290 236 Q220 262 148 244 Z" fill="url(#chrMuzzle)" filter="url(#chrSoft)" />
        <path d="M156 252 Q218 276 280 243" fill="none" stroke="#3a2418" strokeWidth="4" strokeLinecap="round" />
        <path d="M152 246 Q154 252 160 255" fill="none" stroke="#3a2418" strokeWidth="3" strokeLinecap="round" />
        <path d="M284 238 Q282 245 276 247" fill="none" stroke="#3a2418" strokeWidth="3" strokeLinecap="round" />
      </g>

      {/* まぶた（まばたき） */}
      <g className="chr-lids">
        <ellipse cx="160" cy="165" rx="30" ry="39" fill="url(#chrLid)" filter="url(#chrSoft)" />
        <path d="M133 174 Q160 192 187 174" fill="none" stroke="#1a4f30" strokeWidth="4.5" strokeLinecap="round" />
        <ellipse cx="277" cy="174" rx="38" ry="40" fill="url(#chrLid)" filter="url(#chrSoft)" />
        <path d="M243 184 Q277 204 311 184" fill="none" stroke="#1a4f30" strokeWidth="4.5" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export default function Character({ talking = false, skipBirth = false, pose = 'full', className = '' }) {
  const cls = `character photo${talking ? ' talking' : ''}${skipBirth ? '' : ' birth'}${pose === 'head' ? ' head-only' : ''} ${className}`;
  const figure = (
    <div className="chr-figure">
      <img src={SRC} alt="" draggable="false" />
      <Overlay />
    </div>
  );
  return (
    <div className={cls} aria-hidden="true">
      {pose === 'head' ? <div className="chr-head-crop">{figure}</div> : <div className="chr-body">{figure}</div>}
    </div>
  );
}
