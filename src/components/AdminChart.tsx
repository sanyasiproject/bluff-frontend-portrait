import { gameInfo, type AdminDayStats, type GameKind } from "../types";

const W = 340;
const H = 150;
const TOP = 14;
const BASE = 128;

/** "2026-11-28" → "28" */
const dayNum = (day: string) => String(Number(day.slice(8, 10)));
/** "2026-11-28" → "28 Nov" */
const dayLabel = (day: string) =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

/** 14 days of games and new accounts as hand-drawn bars, with a table for screen readers */
export function AdminChart({ days }: { days: AdminDayStats[] }) {
  const max = Math.max(1, ...days.map((d) => Math.max(d.games, d.newAccounts)));
  const slot = W / Math.max(1, days.length);
  const bar = Math.max(3, slot * 0.34);
  const y = (n: number) => BASE - ((BASE - TOP) * n) / max;
  return (
    <figure className="as-chart">
      <div className="as-legend" aria-hidden>
        <span className="as-key games" />
        <span>Games</span>
        <span className="as-key new" />
        <span>New accounts</span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Games and new accounts per day, last 14 days"
      >
        <line x1={0} x2={W} y1={BASE} y2={BASE} className="as-axis" />
        <line x1={0} x2={W} y1={TOP} y2={TOP} className="as-grid" />
        <text x={2} y={TOP - 4} className="as-max">
          {max}
        </text>
        {days.map((d, i) => {
          const x = i * slot + slot / 2;
          return (
            <g key={d.day}>
              <rect
                className="as-bar games"
                x={x - bar - 0.5}
                y={y(d.games)}
                width={bar}
                height={BASE - y(d.games)}
                rx={1.5}
              >
                <title>{`${dayLabel(d.day)}: ${d.games} games`}</title>
              </rect>
              <rect
                className="as-bar new"
                x={x + 0.5}
                y={y(d.newAccounts)}
                width={bar}
                height={BASE - y(d.newAccounts)}
                rx={1.5}
              >
                <title>{`${dayLabel(d.day)}: ${d.newAccounts} new accounts`}</title>
              </rect>
              <text x={x} y={H - 6} className="as-day" textAnchor="middle">
                {dayNum(d.day)}
              </text>
            </g>
          );
        })}
      </svg>
      <table className="sr-only">
        <caption>Last 14 days</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">Games</th>
            <th scope="col">New accounts</th>
            <th scope="col">Active</th>
          </tr>
        </thead>
        <tbody>
          {days.map((d) => (
            <tr key={d.day}>
              <th scope="row">{dayLabel(d.day)}</th>
              <td>{d.games}</td>
              <td>{d.newAccounts}</td>
              <td>{d.active}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/** the 7-day top games as labelled bars */
export function TopGames({
  rows,
}: {
  rows: { kind: GameKind; games: number }[];
}) {
  const max = Math.max(1, ...rows.map((r) => r.games));
  return (
    <ol className="as-top">
      {rows.map((r) => {
        const g = gameInfo(r.kind);
        return (
          <li key={r.kind}>
            <span className="as-top-name">
              <span aria-hidden>{g.emoji}</span> <span>{g.name}</span>
            </span>
            <span className="as-top-bar" aria-hidden>
              <i style={{ width: `${(r.games / max) * 100}%` }} />
            </span>
            <b className="as-num">{r.games}</b>
          </li>
        );
      })}
    </ol>
  );
}
