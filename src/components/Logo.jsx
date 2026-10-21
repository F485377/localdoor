// LocalDoor のロゴ（採用案：縦組み。格子の引き戸は閉じたまま、すきまから灯りが少しもれる。横に「地元」のちょうちん）
//   DoorLogo … 最初の画面の大きなロゴ。open にすると引き戸が左右に開いて、奥の灯りが見える
//   DoorMark … 上のバーの小さな扉の印
const BROWN = '#6e4526';
const BROWN_DARK = '#4c2f1a';
const PAPER = '#e9d6ad';
const LATTICE = '#8a5a35';
const LIGHT = '#d9a43b';

// 引き戸の片方（格子つき）。x は左上
function Panel({ x }) {
  return (
    <g>
      <rect x={x} y="20" width="50" height="124" fill={PAPER} />
      <g stroke={LATTICE} strokeWidth="3.5">
        <line x1={x} y1="51" x2={x + 50} y2="51" />
        <line x1={x} y1="82" x2={x + 50} y2="82" />
        <line x1={x} y1="113" x2={x + 50} y2="113" />
        <line x1={x + 17} y1="20" x2={x + 17} y2="144" />
        <line x1={x + 34} y1="20" x2={x + 34} y2="144" />
      </g>
      <rect x={x} y="20" width="50" height="124" fill="url(#ld-panel-sheen)" />
      <rect x={x} y="20" width="50" height="124" fill="none" stroke={BROWN} strokeWidth="4" />
    </g>
  );
}

export function DoorLogo({ open = false }) {
  return (
    <svg className={`door-logo${open ? ' open' : ''}`} viewBox="0 0 220 160" role="img" aria-label="LocalDoor">
      <defs>
        <linearGradient id="ld-frame" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9a6a42" />
          <stop offset="0.5" stopColor={BROWN} />
          <stop offset="1" stopColor={BROWN_DARK} />
        </linearGradient>
        <linearGradient id="ld-panel-sheen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.45" />
          <stop offset="0.4" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="1" stopColor="#7a4a26" stopOpacity="0.12" />
        </linearGradient>
        <radialGradient id="ld-glow" cx="0.5" cy="0.55" r="0.6">
          <stop offset="0" stopColor="#fff8e0" />
          <stop offset="0.6" stopColor="#ffd98a" />
          <stop offset="1" stopColor="#f2b45a" />
        </radialGradient>
        <radialGradient id="ld-lantern" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#ff8aa0" />
          <stop offset="0.35" stopColor="#ff2d55" />
          <stop offset="1" stopColor="#b80029" />
        </radialGradient>
        <clipPath id="ld-opening">
          <rect x="12" y="20" width="104" height="124" />
        </clipPath>
      </defs>
      <g transform="translate(20 0)">
        {/* 枠 */}
        <rect x="0" y="0" width="128" height="14" rx="3" fill="url(#ld-frame)" />
        <rect x="4" y="14" width="120" height="136" fill="url(#ld-frame)" />
        {/* 奥の灯り（開くと見える） */}
        <rect x="12" y="20" width="104" height="124" fill="url(#ld-glow)" />
        <g clipPath="url(#ld-opening)">
          <rect className="door-seam" x="62" y="20" width="4" height="124" fill={LIGHT} />
          <g className="door-left">
            <Panel x={12} />
          </g>
          <g className="door-right">
            <Panel x={66} />
          </g>
        </g>
        <rect x="0" y="146" width="128" height="8" rx="2" fill={BROWN_DARK} />
        <rect x="2" y="1" width="124" height="3" rx="1.5" fill="#ffffff" opacity="0.35" />
      </g>
      {/* 「地元」のちょうちん */}
      <g transform="translate(166 18)">
        <line x1="20" y1="0" x2="20" y2="10" stroke="#3a2b22" strokeWidth="2.5" />
        <rect x="9" y="8" width="22" height="7" rx="2" fill="#3a2b22" />
        <ellipse cx="20" cy="42" rx="20" ry="28" fill="url(#ld-lantern)" />
        <path d="M2 32 h36 M0 42 h40 M2 52 h36" stroke="#b80029" strokeWidth="1.6" opacity="0.7" />
        <ellipse cx="13" cy="28" rx="5" ry="8" fill="#ffffff" opacity="0.35" />
        <text x="20" y="38" textAnchor="middle" fontSize="11" fontWeight="800" fill="#fff6e8">
          地
        </text>
        <text x="20" y="54" textAnchor="middle" fontSize="11" fontWeight="800" fill="#fff6e8">
          元
        </text>
        <rect x="9" y="68" width="22" height="7" rx="2" fill="#3a2b22" />
      </g>
    </svg>
  );
}

// 上のバーの小さな扉の印
export function DoorMark() {
  return (
    <svg className="door-mark" viewBox="0 0 32 38" aria-hidden="true" focusable="false">
      <rect x="0" y="0" width="32" height="4" rx="1" fill={BROWN} />
      <rect x="1" y="4" width="30" height="34" fill={BROWN} />
      <rect x="4" y="6" width="24" height="30" fill={PAPER} />
      <path d="M4 16 H28 M4 26 H28 M10 6 V36 M22 6 V36" stroke={LATTICE} strokeWidth="1.6" />
      <rect x="15" y="6" width="2" height="30" fill={LIGHT} />
    </svg>
  );
}
