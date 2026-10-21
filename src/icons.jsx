// タブのアイコン（線画）
const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', viewBox: '0 0 24 24', 'aria-hidden': true };

export const SearchIcon = () => (
  <svg {...S}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);
export const FilterIcon = () => (
  <svg {...S}>
    <path d="M4 6h16M7 12h10M10 18h4" />
  </svg>
);
export const ChatIcon = () => (
  <svg {...S}>
    <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />
  </svg>
);
export const CalendarIcon = () => (
  <svg {...S}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M16 3v4M8 3v4M3 10h18" />
  </svg>
);
export const UserIcon = () => (
  <svg {...S}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </svg>
);
export const ShopIcon = () => (
  <svg {...S}>
    <path d="M4 10v10h16V10M3 10l2-6h14l2 6M3 10h18M9 20v-6h6v6" />
  </svg>
);
export const ListIcon = () => (
  <svg {...S}>
    <rect x="5" y="4" width="14" height="17" rx="2" />
    <path d="M9 4V2.8h6V4M9 10h6M9 14h6M9 18h3" />
  </svg>
);
export const StopIcon = () => (
  <svg {...S}>
    <circle cx="12" cy="12" r="9" />
    <path d="m5.6 5.6 12.8 12.8" />
  </svg>
);
