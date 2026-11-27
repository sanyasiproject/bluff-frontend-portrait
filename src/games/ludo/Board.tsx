import { memo } from 'react';
import { LUDO_COLORS, LUDO_LANE_CELLS, LUDO_RING_CELLS, LUDO_SAFE_RING, ludoStartOf, type LudoColor } from '../../types';
import { rotCell } from './geometry';

// The flat Ludo board, drawn once per turn of the board; gotis sit on top of it

const BASE_AT: Record<LudoColor, [number, number]> = { red: [0, 0], green: [9, 0], yellow: [9, 9], blue: [0, 9] };
const START_OF = new Map(LUDO_COLORS.map((c) => [ludoStartOf(c), c]));

/** a five-point star centred on (x, y) */
function starPath(x: number, y: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.45;
    pts.push(`${(x + Math.cos(a) * rr).toFixed(3)},${(y + Math.sin(a) * rr).toFixed(3)}`);
  }
  return `M${pts.join('L')}Z`;
}

function BoardSvg({ turns, colors }: { turns: number; colors: LudoColor[] }) {
  const k = turns;
  const cell = (xy: readonly [number, number]) => rotCell([xy[0], xy[1]], k);
  const inPlay = new Set(colors);
  return (
    <svg className="ld-svg" viewBox="0 0 15 15" aria-hidden>
      <rect className="ld-bg" x="0" y="0" width="15" height="15" rx="0.35" />
      {/* bases: drawn turned, as they are square */}
      <g transform={`rotate(${k * 90} 7.5 7.5)`}>
        {LUDO_COLORS.map((c) => {
          const [x, y] = BASE_AT[c];
          return (
            <g key={c} className={`ld-base ld-${c}`} opacity={inPlay.has(c) ? 1 : 0.45}>
              <rect className="ld-base-out" x={x + 0.08} y={y + 0.08} width="5.84" height="5.84" rx="0.45" />
              <rect className="ld-base-in" x={x + 0.9} y={y + 0.9} width="4.2" height="4.2" rx="0.5" />
              {[[1.5, 1.5], [3.5, 1.5], [1.5, 3.5], [3.5, 3.5]].map(([dx, dy]) => (
                <circle key={`${dx}${dy}`} className="ld-spot" cx={x + 0.5 + dx} cy={y + 0.5 + dy} r="0.62" />
              ))}
            </g>
          );
        })}
        {/* home: four triangles meeting in the middle */}
        <polygon className="ld-tri ld-red" points="6,6 7.5,7.5 6,9" />
        <polygon className="ld-tri ld-green" points="6,6 9,6 7.5,7.5" />
        <polygon className="ld-tri ld-yellow" points="9,6 9,9 7.5,7.5" />
        <polygon className="ld-tri ld-blue" points="6,9 7.5,7.5 9,9" />
        <circle className="ld-home-dot" cx="7.5" cy="7.5" r="0.42" />
      </g>
      {LUDO_RING_CELLS.map((xy, i) => {
        const [x, y] = cell(xy);
        const start = START_OF.get(i);
        return <rect key={`r${i}`} className={start ? `ld-cell ld-start ld-${start}` : 'ld-cell'} x={x + 0.04} y={y + 0.04} width="0.92" height="0.92" rx="0.12" />;
      })}
      {LUDO_COLORS.map((c) =>
        LUDO_LANE_CELLS[c].map((xy, i) => {
          const [x, y] = cell(xy);
          return <rect key={`${c}${i}`} className={`ld-cell ld-lane ld-${c}`} x={x + 0.04} y={y + 0.04} width="0.92" height="0.92" rx="0.12" />;
        }),
      )}
      {LUDO_SAFE_RING.map((r) => {
        const [x, y] = cell(LUDO_RING_CELLS[r]);
        const start = START_OF.get(r);
        return <path key={`s${r}`} className={start ? 'ld-star on-start' : 'ld-star'} d={starPath(x + 0.5, y + 0.52, 0.34)} />;
      })}
    </svg>
  );
}

export const Board = memo(BoardSvg);
