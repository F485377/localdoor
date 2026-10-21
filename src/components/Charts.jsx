// 円グラフ（ドーナツ）と凡例
export function Donut({ parts, center }) {
  const total = parts.reduce((n, p) => n + p.value, 0);
  const R = 15.9155; // 円周 100
  let offset = 25;
  return (
    <div className="donut-wrap">
      <svg viewBox="0 0 42 42" className="donut" aria-hidden="true">
        <circle cx="21" cy="21" r={R} fill="none" stroke="var(--surface-2)" strokeWidth="6" />
        {total > 0 &&
          parts.map((p) => {
            const len = (p.value / total) * 100;
            const el = <circle key={p.key} cx="21" cy="21" r={R} fill="none" stroke={p.color} strokeWidth="6" strokeDasharray={`${len} ${100 - len}`} strokeDashoffset={offset} />;
            offset -= len;
            return el;
          })}
        {center && (
          <text x="21" y="23.5" textAnchor="middle" className="donut-center">
            {center}
          </text>
        )}
      </svg>
      <ul className="legend">
        {parts.map((p) => (
          <li key={p.key}>
            <i style={{ background: p.color }} />
            <span>{p.label}</span>
            <b>{total ? Math.round((p.value / total) * 100) : 0}%</b>
          </li>
        ))}
      </ul>
    </div>
  );
}
