import { useId } from 'react';

// 旅のおともキャラクター「リュウ」（忍者）。形はデザイン案のまま、ソフビ人形のような、やわらかいつやをつけたイラスト。
//   NinjaBody … 全身（印を結ぶ姿）。最初の会話の画面など
//   NinjaFace … 丸い枠の顔。右下のボタン・会話の画面のアイコン
// グラデーションの id がページの中で重ならないように useId でつける
const uid = (id) => id.replace(/[^a-zA-Z0-9]/g, '');

export function NinjaBody({ className = '' }) {
  const u = uid(useId());
  return (
    <svg viewBox="0 0 270 420" className={className} aria-hidden="true" focusable="false">
    <defs>
      <radialGradient id={`hood${u}`} cx="0.36" cy="0.28" r="0.85"><stop offset="0" stopColor="#5a8cb4"/><stop offset="0.45" stopColor="#2f5f86"/><stop offset="1" stopColor="#173552"/></radialGradient>
      <radialGradient id={`body${u}`} cx="0.35" cy="0.2" r="0.95"><stop offset="0" stopColor="#4f80a8"/><stop offset="0.5" stopColor="#2b5876"/><stop offset="1" stopColor="#173552"/></radialGradient>
      <linearGradient id={`leg${u}`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#3b6c92"/><stop offset="0.6" stopColor="#2b5876"/><stop offset="1" stopColor="#18374f"/></linearGradient>
      <linearGradient id={`skin${u}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#e9b896"/><stop offset="0.25" stopColor="#f8dcc4"/><stop offset="1" stopColor="#efc3a2"/></linearGradient>
      <radialGradient id={`hand${u}`} cx="0.4" cy="0.3" r="0.8"><stop offset="0" stopColor="#fde6d2"/><stop offset="1" stopColor="#e8b490"/></radialGradient>
      <linearGradient id={`belt${u}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#55504c"/><stop offset="0.45" stopColor="#2a2522"/><stop offset="1" stopColor="#151210"/></linearGradient>
      <linearGradient id={`foot${u}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3a4a5e"/><stop offset="1" stopColor="#121a24"/></linearGradient>
      <pattern id={`mesh${u}`} width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="10" height="10" fill="#b4b8be"/><path d="M0 5 H10 M5 0 V10" stroke="#80868e" strokeWidth="1.6"/></pattern>
      <linearGradient id={`meshShade${u}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffffff" stopOpacity="0.35"/><stop offset="1" stopColor="#000000" stopOpacity="0.25"/></linearGradient>
      <filter id={`soft${u}`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4"/></filter>
      <filter id={`soft2${u}`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.4"/></filter>
    </defs>
    <ellipse cx="135" cy="368" rx="90" ry="12" fill="#1a2030" opacity="0.18" filter={`url(#soft${u})`}/>
    <ellipse cx="135" cy="365" rx="58" ry="6" fill="#1a2030" opacity="0.22" filter={`url(#soft2${u})`}/>
    <path d="M196 106 q44 -10 66 16 q-32 -4 -58 10 z" fill={`url(#body${u})`}/><path d="M198 124 q38 12 50 44 q-28 -18 -52 -22 z" fill={`url(#body${u})`}/>
    <path d="M206 110 q30 -6 48 8" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
    <path d="M92 284 q-10 46 4 66 h40 l4 -66 z" fill={`url(#leg${u})`}/><path d="M178 284 q10 46 -4 66 h-40 l-4 -66 z" fill={`url(#leg${u})`}/>
    <rect x="98" y="324" width="36" height="26" fill={`url(#mesh${u})`}/><rect x="136" y="324" width="36" height="26" fill={`url(#mesh${u})`}/>
    <rect x="98" y="324" width="36" height="26" fill={`url(#meshShade${u})`}/><rect x="136" y="324" width="36" height="26" fill={`url(#meshShade${u})`}/>
    <path d="M92 348 h46 q4 14 -6 16 h-40 q-10 -4 0 -16 z" fill={`url(#foot${u})`}/><path d="M132 348 h46 q10 12 0 16 h-40 q-10 -2 -6 -16 z" fill={`url(#foot${u})`}/>
    <path d="M96 351 h30" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="2" strokeLinecap="round"/><path d="M146 351 h26" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="2" strokeLinecap="round"/>
    <path d="M78 204 q57 -16 114 0 l6 88 q-63 16 -126 0 z" fill={`url(#body${u})`}/>
    <path d="M88 214 q20 -6 40 -6" stroke="#ffffff" strokeOpacity="0.3" strokeWidth="5" fill="none" strokeLinecap="round" filter={`url(#soft2${u})`}/>
    <path d="M112 204 l23 34 l23 -34" stroke="#173552" strokeWidth="4" fill="none"/>
    <rect x="74" y="262" width="122" height="16" rx="6" fill={`url(#belt${u})`}/><path d="M82 266 h104" stroke="#ffffff" strokeOpacity="0.28" strokeWidth="2" strokeLinecap="round"/>
    <path d="M80 212 q-30 22 -24 58 q20 12 46 2 l2 -44 z" fill={`url(#mesh${u})`}/><path d="M190 212 q30 22 24 58 q-20 12 -46 2 l-2 -44 z" fill={`url(#mesh${u})`}/>
    <path d="M80 212 q-30 22 -24 58 q20 12 46 2 l2 -44 z" fill={`url(#meshShade${u})`}/><path d="M190 212 q30 22 24 58 q-20 12 -46 2 l-2 -44 z" fill={`url(#meshShade${u})`}/>
    <path d="M88 262 q22 -2 36 -14 l6 14 q-20 16 -42 16 z" fill={`url(#mesh${u})`}/><path d="M182 262 q-22 -2 -36 -14 l-6 14 q20 16 42 16 z" fill={`url(#mesh${u})`}/>
    <path d="M117 256 q18 -16 36 0 q-4 20 -18 22 q-14 -2 -18 -22 z" fill={`url(#hand${u})`}/><rect x="130" y="222" width="10" height="38" rx="5" fill={`url(#hand${u})`}/>
    <path d="M133 226 v26" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="2" strokeLinecap="round"/>
    <path d="M50 125 q0 -95 85 -98 q85 3 85 98 q0 62 -85 90 q-85 -28 -85 -90 z" fill={`url(#hood${u})`}/>
    <path d="M124 30 q14 -26 30 -18 q-6 14 -10 26 z" fill={`url(#hood${u})`}/>
    <path d="M211 120 q2 50 -30 74" stroke="#9cc2e0" strokeOpacity="0.35" strokeWidth="4" fill="none" strokeLinecap="round"/>
    <ellipse cx="98" cy="62" rx="30" ry="16" fill="#ffffff" opacity="0.35" transform="rotate(-24 98 62)" filter={`url(#soft${u})`}/>
    <ellipse cx="92" cy="58" rx="11" ry="5" fill="#ffffff" opacity="0.7" transform="rotate(-26 92 58)" filter={`url(#soft2${u})`}/>
    <path d="M64 110 q71 -20 142 0 l0 42 q-71 18 -142 0 z" fill={`url(#skin${u})`}/>
    <path d="M64 110 q71 -20 142 0 l0 9 q-71 -16 -142 0 z" fill="#8a5a40" opacity="0.18"/>
    <path d="M64 152 q71 18 142 0" stroke="#173552" strokeOpacity="0.35" strokeWidth="3" fill="none"/>
    <ellipse cx="80" cy="144" rx="12" ry="7" fill="#ee9f8f" opacity="0.55" filter={`url(#soft2${u})`}/><ellipse cx="190" cy="144" rx="12" ry="7" fill="#ee9f8f" opacity="0.55" filter={`url(#soft2${u})`}/>
    <path d="M86 114 l30 12 M184 114 l-30 12" stroke="#2a2522" strokeWidth="7" strokeLinecap="round"/>
    <ellipse cx="110" cy="136" rx="5.5" ry="7" fill="#1e1a18"/><ellipse cx="160" cy="136" rx="5.5" ry="7" fill="#1e1a18"/>
    <circle cx="111.8" cy="133" r="1.9" fill="#ffffff"/><circle cx="161.8" cy="133" r="1.9" fill="#ffffff"/>
    <circle cx="108.6" cy="139.4" r="0.9" fill="#ffffff" opacity="0.7"/><circle cx="158.6" cy="139.4" r="0.9" fill="#ffffff" opacity="0.7"/>
    </svg>
  );
}

export function NinjaFace({ className = '' }) {
  const u = uid(useId());
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden="true" focusable="false"><defs>
    <radialGradient id={`fb${u}`} cx="0.38" cy="0.3" r="0.8"><stop offset="0" stopColor="#ffffff"/><stop offset="1" stopColor="#f1ece6"/></radialGradient>
    <radialGradient id={`fh${u}`} cx="0.36" cy="0.26" r="0.85"><stop offset="0" stopColor="#5a8cb4"/><stop offset="0.45" stopColor="#2f5f86"/><stop offset="1" stopColor="#173552"/></radialGradient>
    <linearGradient id={`fs${u}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#e9b896"/><stop offset="0.3" stopColor="#f8dcc4"/><stop offset="1" stopColor="#efc3a2"/></linearGradient>
    <linearGradient id={`fr${u}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8a5a34"/><stop offset="1" stopColor="#4f2f18"/></linearGradient>
    <filter id={`fbl${u}`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter></defs>
    <circle cx="100" cy="104" r="94" fill="#1a2030" opacity="0.15" filter={`url(#fbl${u})`}/>
    <circle cx="100" cy="100" r="96" fill={`url(#fb${u})`} stroke={`url(#fr${u})`} strokeWidth="8"/>
    <path d="M22 108 q0 -82 78 -86 q78 4 78 86 q0 56 -78 80 q-78 -24 -78 -80 z" fill={`url(#fh${u})`}/>
    <ellipse cx="62" cy="52" rx="24" ry="12" fill="#ffffff" opacity="0.4" transform="rotate(-28 62 52)" filter={`url(#fbl${u})`}/>
    <ellipse cx="58" cy="48" rx="8" ry="4" fill="#ffffff" opacity="0.75" transform="rotate(-28 58 48)"/>
    <path d="M34 92 q66 -18 132 0 l0 38 q-66 16 -132 0 z" fill={`url(#fs${u})`}/>
    <path d="M34 92 q66 -18 132 0 l0 8 q-66 -14 -132 0 z" fill="#8a5a40" opacity="0.18"/>
    <path d="M56 96 l28 11 M144 96 l-28 11" stroke="#2a2522" strokeWidth="8" strokeLinecap="round"/>
    <ellipse cx="78" cy="116" rx="6" ry="7.5" fill="#1e1a18"/><ellipse cx="122" cy="116" rx="6" ry="7.5" fill="#1e1a18"/>
    <circle cx="80" cy="113" r="2.1" fill="#fff"/><circle cx="124" cy="113" r="2.1" fill="#fff"/></svg>
  );
}
