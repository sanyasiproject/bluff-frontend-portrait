import { memo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { cx } from '../../lib/cards';
import { dotsLineAt, dotsLineCount, type DotsView } from '../../types';

// The Dots and Boxes page: flat graph paper, big dots, marker lines in each player's colour, closed boxes with the owner's icon.
// Tap near a gap or drag from dot to dot: the nearest free line previews and is drawn when you let go

/** each seat's box icon (unit box, centre 0,0): star, heart, diamond, triangle */
const ICONS = [
  'M0 -1 L0.24 -0.33 L0.95 -0.31 L0.39 0.13 L0.59 0.81 L0 0.41 L-0.59 0.81 L-0.39 0.13 L-0.95 -0.31 L-0.24 -0.33Z',
  'M0 0.88 C-1.25 0.05 -0.95 -1.05 0 -0.42 C0.95 -1.05 1.25 0.05 0 0.88Z',
  'M0 -1 L0.78 0 L0 1 L-0.78 0Z',
  'M0 -0.92 L0.92 0.72 L-0.92 0.72Z',
];
export const iconPath = (i: number) => ICONS[((i % ICONS.length) + ICONS.length) % ICONS.length];

/** a player's box icon as a small inline picture, for chips and the score rows */
export function PlayerIcon({ i, color }: { i: number; color: string }) {
  return (
    <svg className="db-icon" viewBox="-1.1 -1.1 2.2 2.2" aria-hidden style={{ '--pc': color } as CSSProperties}>
      <path d={iconPath(i)} />
    </svg>
  );
}

/** a finger reaches lines this far away (px), so every line keeps a 44 px hit band however small the board is drawn */
const REACH_PX = 22;

/** the nearest free line to a point in board units (dots at whole numbers), within `reach` units */
function nearest(size: number, taken: Record<number, string>, x: number, y: number, reach = 0.5): number | null {
  const h = size * (size + 1);
  let best: number | null = null;
  let bestD = reach;
  // only lines near the point can win, so look at the few cells round it
  const span = Math.ceil(reach) + 1;
  for (let r = Math.max(0, Math.round(y) - span); r <= Math.min(size, Math.round(y) + span); r++)
    for (let c = Math.max(0, Math.floor(x) - span); c <= Math.min(size - 1, Math.floor(x) + span); c++) {
      const line = r * size + c;
      const d = Math.hypot(x - Math.max(c, Math.min(c + 1, x)), y - r);
      if (taken[line] === undefined && d < bestD) ((best = line), (bestD = d));
    }
  for (let r = Math.max(0, Math.floor(y) - span); r <= Math.min(size - 1, Math.floor(y) + span); r++)
    for (let c = Math.max(0, Math.round(x) - span); c <= Math.min(size, Math.round(x) + span); c++) {
      const line = h + r * (size + 1) + c;
      const d = Math.hypot(x - c, y - Math.max(r, Math.min(r + 1, y)));
      if (taken[line] === undefined && d < bestD) ((best = line), (bestD = d));
    }
  return best;
}

const Paper = memo(function Paper({ size }: { size: number }) {
  const n = size * 4;
  return (
    <>
      <rect className="db-paper" x={-0.5} y={-0.5} width={size + 1} height={size + 1} rx={0.22} />
      {Array.from({ length: n + 1 }, (_, i) => {
        const v = -0.5 + (i * (size + 1)) / n;
        return (
          <g key={i} className="db-rule">
            <line x1={v} x2={v} y1={-0.5} y2={size + 0.5} />
            <line x1={-0.5} x2={size + 0.5} y1={v} y2={v} />
          </g>
        );
      })}
    </>
  );
});

export function Grid({ dv, colorOf, iconOf, canDraw, onDraw }: { dv: DotsView; colorOf: (id: string) => string; iconOf: (id: string) => number; canDraw: boolean; onDraw: (line: number) => void }) {
  const size = dv.size;
  const svg = useRef<SVGSVGElement>(null);
  const start = useRef<[number, number] | null>(null);
  const [pick, setPick] = useState<number | null>(null);
  const fresh = new Set(dv.last?.closed ?? []);

  // how many board units the finger's reach is at this drawn size
  const unitsOf = (px: number) => {
    const w = svg.current?.getBoundingClientRect().width ?? 0;
    return w > 0 ? Math.max(0.5, (px * (size + 1)) / w) : 0.5;
  };
  const toBoard = (e: ReactPointerEvent): [number, number] => {
    const r = svg.current!.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * (size + 1) - 0.5, ((e.clientY - r.top) / r.height) * (size + 1) - 0.5];
  };
  // a drag aims at the line between where it started and where it is; a tap at the line under the finger
  const aim = (p: [number, number]) => {
    const s = start.current;
    const reach = unitsOf(REACH_PX);
    if (s && Math.hypot(p[0] - s[0], p[1] - s[1]) > Math.max(0.45, unitsOf(18))) return nearest(size, dv.lines, (s[0] + p[0]) / 2, (s[1] + p[1]) / 2, reach);
    return nearest(size, dv.lines, p[0], p[1], reach);
  };
  const handlers = {
    onPointerDown: (e: ReactPointerEvent<SVGSVGElement>) => {
      if (!canDraw) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      const p = toBoard(e);
      start.current = [Math.round(p[0]), Math.round(p[1])];
      // starting off a dot: aim from the finger itself
      if (Math.hypot(p[0] - start.current[0], p[1] - start.current[1]) > 0.3) start.current = p;
      setPick(nearest(size, dv.lines, p[0], p[1], unitsOf(REACH_PX)));
    },
    onPointerMove: (e: ReactPointerEvent<SVGSVGElement>) => {
      if (!canDraw || !start.current) return;
      setPick(aim(toBoard(e)));
    },
    onPointerUp: (e: ReactPointerEvent<SVGSVGElement>) => {
      if (!start.current) return;
      const line = aim(toBoard(e));
      start.current = null;
      setPick(null);
      if (canDraw && line !== null) onDraw(line);
    },
    onPointerCancel: () => ((start.current = null), setPick(null)),
  };

  /** a line's two ends, pulled in a little so the dots stay round */
  const ends = (line: number) => {
    const { dir, row, col } = dotsLineAt(size, line);
    return dir === 'h' ? { x1: col + 0.12, y1: row, x2: col + 0.88, y2: row, dir } : { x1: col, y1: row + 0.12, x2: col, y2: row + 0.88, dir };
  };
  const all = Array.from({ length: dotsLineCount(size) }, (_, i) => i);

  return (
    <svg ref={svg} className={cx('db-svg', canDraw && 'live')} viewBox={`-0.5 -0.5 ${size + 1} ${size + 1}`} {...handlers} role="img" aria-label="Dots and boxes board">
      <Paper size={size} />
      {Object.entries(dv.boxes).map(([b, owner]) => {
        const box = Number(b);
        const r = Math.floor(box / size);
        const c = box % size;
        return (
          <g key={box} className={cx('db-box', fresh.has(box) && 'fresh')} style={{ '--pc': colorOf(owner) } as CSSProperties}>
            <rect x={c + 0.06} y={r + 0.06} width={0.88} height={0.88} rx={0.08} />
            <path d={iconPath(iconOf(owner))} transform={`translate(${c + 0.5} ${r + 0.52}) scale(0.24)`} />
          </g>
        );
      })}
      {canDraw &&
        all
          .filter((l) => dv.lines[l] === undefined)
          .map((l) => {
            const s = ends(l);
            return <line key={`f${l}`} className="db-free" x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} />;
          })}
      {Object.entries(dv.lines).map(([l, owner]) => {
        const line = Number(l);
        const s = ends(line);
        return <line key={line} className={cx('db-line', s.dir, dv.last?.line === line && 'last')} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} style={{ '--pc': colorOf(owner) } as CSSProperties} />;
      })}
      {pick !== null &&
        (() => {
          const s = ends(pick);
          return <line className="db-pick" x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} />;
        })()}
      {Array.from({ length: (size + 1) * (size + 1) }, (_, i) => (
        <circle key={i} className="db-dot" cx={i % (size + 1)} cy={Math.floor(i / (size + 1))} r={0.12} />
      ))}
    </svg>
  );
}
