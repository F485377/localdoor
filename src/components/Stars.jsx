export default function Stars({ value }) {
  const rounded = Math.round(value ?? 0);
  return (
    <span className="stars" aria-label={`${value?.toFixed(1) ?? 0} / 5`}>
      {'★'.repeat(rounded)}
      <span className="stars-empty">{'★'.repeat(5 - rounded)}</span>
    </span>
  );
}
