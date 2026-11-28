// A perf's rating over time: one point per rated game, with the low, high and first/last dates

const day = (ts: number) => new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

export function RatingGraph({ history }: { history: [number, number][] }) {
  if (history.length < 2) return <p className="muted small ch-graph-empty">Play a couple of rated games to see your graph.</p>;
  const W = 320;
  const H = 120;
  const pad = 6;
  const rs = history.map(([, r]) => r);
  const lo = Math.floor(Math.min(...rs) / 50) * 50;
  const hi = Math.ceil(Math.max(...rs) / 50) * 50 || lo + 50;
  const t0 = history[0][0];
  const t1 = history[history.length - 1][0];
  const span = Math.max(1, t1 - t0);
  // spread by time, but never closer than an even share, so a busy day stays readable
  const x = (i: number) => pad + ((0.5 * (history[i][0] - t0)) / span + (0.5 * i) / (history.length - 1)) * (W - pad * 2);
  const y = (r: number) => pad + (1 - (r - lo) / Math.max(1, hi - lo)) * (H - pad * 2);
  const pts = history.map(([, r], i) => `${x(i).toFixed(1)},${y(r).toFixed(1)}`);
  const peak = rs.indexOf(Math.max(...rs));
  return (
    <figure className="ch-rgraph">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Rating from ${rs[0]} to ${rs[rs.length - 1]}`}>
        <defs>
          <linearGradient id="ch-rg-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f6c453" stopOpacity="0.45" />
            <stop offset="1" stopColor="#f6c453" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={0} x2={W} y1={pad + f * (H - pad * 2)} y2={pad + f * (H - pad * 2)} className="ch-rg-grid" />
        ))}
        <path d={`M${x(0)},${H} L${pts.join(' L')} L${x(history.length - 1)},${H} Z`} fill="url(#ch-rg-fill)" />
        <polyline points={pts.join(' ')} className="ch-rg-line" />
        <circle cx={x(peak)} cy={y(rs[peak])} r={3.5} className="ch-rg-peak" />
        <circle cx={x(history.length - 1)} cy={y(rs[rs.length - 1])} r={3.5} className="ch-rg-now" />
      </svg>
      <figcaption>
        <span>{day(t0)}</span>
        <span>{`${lo}–${hi}`}</span>
        <span>{day(t1)}</span>
      </figcaption>
    </figure>
  );
}
