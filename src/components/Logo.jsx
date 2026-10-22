// LocalDoor のロゴ（いただいた写真のロゴを正面から見た形に描いたもの）：丸い木の梁・柱・格子と障子の引き戸2枚・敷居・腕に下がる「地元」のちょうちん
//   DoorLogo … 最初の画面の大きなロゴ。open にすると引き戸が左右にすべって開く
//   扉のまん中は viewBox の x=134（ちょうちんを除いた扉のまん中）
function Lattice({ x, id }) {
  return (
    <g>
      <rect x={x} y="44" width="86" height="200" fill={`url(#${id}-paper)`} />
      <g fill="#5a3820">
        <rect x={x + 27} y="44" width="4" height="200" />
        <rect x={x + 55} y="44" width="4" height="200" />
        <rect x={x} y="92" width="86" height="4" />
        <rect x={x} y="142" width="86" height="4" />
        <rect x={x} y="192" width="86" height="4" />
      </g>
      <rect x={x} y="44" width="86" height="200" fill="none" stroke={`url(#${id}-wood)`} strokeWidth="7" />
    </g>
  );
}

export function DoorLogo({ open = false }) {
  const id = 'ld';
  return (
    <svg className={`door-logo${open ? ' open' : ''}`} viewBox="0 0 340 280" role="img" aria-label="LocalDoor">
      <defs>
        <linearGradient id={`${id}-wood`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#4a2c16" />
          <stop offset="0.35" stopColor="#6e4526" />
          <stop offset="0.7" stopColor="#5a3820" />
          <stop offset="1" stopColor="#3c2412" />
        </linearGradient>
        <linearGradient id={`${id}-beam`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8a5c38" />
          <stop offset="0.35" stopColor="#6e4526" />
          <stop offset="1" stopColor="#3c2412" />
        </linearGradient>
        <radialGradient id={`${id}-paper`} cx="0.5" cy="0.45" r="0.7">
          <stop offset="0" stopColor="#fff6e2" />
          <stop offset="0.6" stopColor="#f6e2bd" />
          <stop offset="1" stopColor="#e5c793" />
        </radialGradient>
        <radialGradient id={`${id}-lantern`} cx="0.38" cy="0.32" r="0.75">
          <stop offset="0" stopColor="#ff8a9c" />
          <stop offset="0.4" stopColor="#ff1f45" />
          <stop offset="1" stopColor="#a8001f" />
        </radialGradient>
        <radialGradient id={`${id}-halo`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ff3355" stopOpacity="0.3" />
          <stop offset="1" stopColor="#ff3355" stopOpacity="0" />
        </radialGradient>
        <clipPath id={`${id}-opening`}>
          <rect x="46" y="44" width="176" height="200" />
        </clipPath>
      </defs>
      <ellipse cx="134" cy="266" rx="128" ry="9" fill="#3c2412" opacity="0.12" />
      <ellipse className="door-lantern" cx="300" cy="120" rx="58" ry="78" fill={`url(#${id}-halo)`} />
      <rect x="34" y="34" width="14" height="222" fill={`url(#${id}-wood)`} />
      <rect x="220" y="34" width="14" height="222" fill={`url(#${id}-wood)`} />
      <rect x="28" y="244" width="212" height="14" rx="2" fill={`url(#${id}-beam)`} />
      {/* 戸の向こう：開くと白い光 */}
      <rect className="door-inside" x="46" y="44" width="176" height="200" fill="#ffffff" />
      <g clipPath={`url(#${id}-opening)`}>
        <g className="door-left">
          <Lattice x={47} id={id} />
          <rect x="128" y="138" width="3" height="16" rx="1.5" fill="#2a1a0e" />
        </g>
        <g className="door-right">
          <Lattice x={135} id={id} />
          <rect x="138" y="138" width="3" height="16" rx="1.5" fill="#2a1a0e" />
        </g>
      </g>
      <rect x="20" y="18" width="228" height="24" rx="12" fill={`url(#${id}-beam)`} />
      <rect x="30" y="21" width="208" height="4" rx="2" fill="#ffffff" opacity="0.22" />
      <g className="door-lantern">
        <rect x="240" y="26" width="64" height="6" rx="3" fill="#8a5a2a" />
        <circle cx="242" cy="29" r="5" fill="#3c2412" />
        <g className="door-lantern-body">
          <line x1="300" y1="32" x2="300" y2="46" stroke="#2a1a0e" strokeWidth="2.5" />
          <rect x="285" y="44" width="30" height="10" rx="3" fill="#2a1a0e" />
          <ellipse cx="300" cy="104" rx="34" ry="50" fill={`url(#${id}-lantern)`} />
          <g stroke="#a8001f" strokeWidth="1" opacity="0.45" fill="none">
            <path d="M268 74 Q300 80 332 74" />
            <path d="M266 92 Q300 98 334 92" />
            <path d="M266 112 Q300 118 334 112" />
            <path d="M268 132 Q300 138 332 132" />
          </g>
          <ellipse cx="286" cy="80" rx="6" ry="14" fill="#ffffff" opacity="0.35" />
          <text x="300" y="100" textAnchor="middle" fontWeight="900" fontSize="24" fill="#ffffff">
            地
          </text>
          <text x="300" y="130" textAnchor="middle" fontWeight="900" fontSize="24" fill="#ffffff">
            元
          </text>
          <rect x="285" y="152" width="30" height="10" rx="3" fill="#2a1a0e" />
          <line x1="300" y1="162" x2="300" y2="172" stroke="#d9a43b" strokeWidth="2.5" />
          <circle cx="300" cy="175" r="4" fill="#d9a43b" />
        </g>
      </g>
    </svg>
  );
}
