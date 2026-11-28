import { useMemo } from 'react';
import { cx } from '../../lib/cards';
import { usePanZoom } from './usePanZoom';

// Five in a Row board: a wooden board with grid lines and star points, glossy stones, last-move ring, the winning line

/** star points for each board size */
const STARS: Record<number, number[]> = { 15: [3, 7, 11], 19: [3, 9, 15] };

/** a hex colour mixed toward white (t > 0) or black (t < 0) */
export function shade(hex: string, t: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => Math.round(t >= 0 ? c + (255 - c) * t : c * (1 + t)));
  return `rgb(${ch.join(',')})`;
}

/** faint wood grain lines, the same every time */
function grain(S: number): string[] {
  return Array.from({ length: 14 }, (_, i) => {
    const y = ((i + 0.5) / 14) * S;
    const a = 0.12 + (i % 3) * 0.06;
    return `M0 ${y} C ${S * 0.3} ${y - a} ${S * 0.6} ${y + a} ${S} ${y - a / 2}`;
  });
}

export interface StoneBoardProps {
  size: number;
  board: number[];
  colors: string[];
  last: number | null;
  ghost: number | null;
  ghostSeat: number;
  line: number[] | null;
  /** my turn: taps choose a point */
  can: boolean;
  onTap: (at: number) => void;
  /** a quick second tap: zoom toggles instead */
  zoomable: boolean;
}

export function StoneBoard({ size, board, colors, last, ghost, ghostSeat, line, can, onTap, zoomable }: StoneBoardProps) {
  const S = size + 1;
  const stars = STARS[size] ?? [];
  const grainPaths = useMemo(() => grain(S), [S]);
  const pz = usePanZoom({ enabled: zoomable, onTap: (fx, fy) => {
    const x = Math.round(fx * S - 1);
    const y = Math.round(fy * S - 1);
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    onTap(y * size + x);
  } });
  const inLine = new Set(line ?? []);
  const at = (i: number) => [(i % size) + 1, Math.floor(i / size) + 1] as const;
  const lineEnds = line && line.length > 1 ? [at(line[0]), at(line[line.length - 1])] : null;

  return (
    <div className={cx('gk-board', can && 'live', pz.zoomed && 'zoomed')} {...pz.bind}>
      <div className={cx('gk-pan', !pz.moving && 'glide')} style={{ transform: `translate(${pz.tx}px, ${pz.ty}px) scale(${pz.z})` }}>
        <svg ref={pz.svgRef} className="gk-svg" viewBox={`0 0 ${S} ${S}`} role="img" aria-label={`${size} by ${size} board`}>
          <defs>
            <linearGradient id="gk-wood" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#f0c987" />
              <stop offset="0.55" stopColor="#dcae68" />
              <stop offset="1" stopColor="#c8934e" />
            </linearGradient>
            {colors.map((c, i) => (
              <radialGradient key={i} id={`gk-st-${i}`} cx="0.36" cy="0.3" r="0.75">
                <stop offset="0" stopColor={shade(c, 0.75)} />
                <stop offset="0.35" stopColor={shade(c, 0.12)} />
                <stop offset="1" stopColor={shade(c, -0.45)} />
              </radialGradient>
            ))}
          </defs>
          <rect x="0" y="0" width={S} height={S} rx="0.35" fill="url(#gk-wood)" />
          <g className="gk-grain">
            {grainPaths.map((d, i) => (
              <path key={i} d={d} />
            ))}
          </g>
          <g className="gk-lines">
            {Array.from({ length: size }, (_, i) => (
              <g key={i}>
                <line x1={1} y1={i + 1} x2={size} y2={i + 1} />
                <line x1={i + 1} y1={1} x2={i + 1} y2={size} />
              </g>
            ))}
          </g>
          {stars.flatMap((y) => stars.map((x) => <circle key={`${x}-${y}`} className="gk-star" cx={x + 1} cy={y + 1} r={0.12} />))}
          {board.map((seat, i) => {
            if (seat < 0) return null;
            const [x, y] = at(i);
            return (
              <g key={i} className={cx('gk-stone', i === last && 'new', inLine.has(i) && 'win')}>
                <circle className="gk-shadow" cx={x + 0.06} cy={y + 0.09} r={0.45} />
                <circle cx={x} cy={y} r={0.45} fill={`url(#gk-st-${seat})`} />
              </g>
            );
          })}
          {last !== null && board[last] >= 0 && <circle className="gk-last" cx={at(last)[0]} cy={at(last)[1]} r={0.2} />}
          {ghost !== null && board[ghost] < 0 && (
            <g className="gk-ghost">
              <circle cx={at(ghost)[0]} cy={at(ghost)[1]} r={0.45} fill={`url(#gk-st-${ghostSeat})`} />
              <circle className="gk-ghost-ring" cx={at(ghost)[0]} cy={at(ghost)[1]} r={0.62} />
            </g>
          )}
          {lineEnds && <line className="gk-strike" x1={lineEnds[0][0]} y1={lineEnds[0][1]} x2={lineEnds[1][0]} y2={lineEnds[1][1]} />}
        </svg>
      </div>
      {zoomable && (
        <button className="gk-zoom" aria-label={pz.zoomed ? 'Zoom out' : 'Zoom in'} onPointerDown={(e) => e.stopPropagation()} onClick={pz.toggle}>
          {pz.zoomed ? '➖' : '🔍'}
        </button>
      )}
    </div>
  );
}
