import { LADDERS, SNAKES, SNAKES_GOAL, snakesCellOf, type SnakesLastMove, type SnakesSeat } from '../../types';

// Board maths for Saanp Seedhi: cell centres, our own curvy snakes and ladders, token spots and move paths (board units: 10×10)

export type Pt = [number, number];

/** a square's centre in board units; 0 sits just below square 1 */
export function centerOf(square: number): Pt {
  const cell = snakesCellOf(Math.max(1, Math.min(SNAKES_GOAL, square)));
  if (!cell) return [0.5, 9.5];
  return [cell[0] + 0.5, cell[1] + 0.5];
}

/** a seeded wobble per snake, so each one curls its own way */
const seedOf = (head: number) => ((head * 7919) % 97) / 97;

/** points along a snake from head to tail: a sine wiggle that is zero at both ends */
export function snakePoints(head: number, tail: number, n = 48): Pt[] {
  const [hx, hy] = centerOf(head);
  const [tx, ty] = centerOf(tail);
  const dx = tx - hx;
  const dy = ty - hy;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const waves = Math.max(1, Math.round(len / 2.4));
  const amp = Math.min(0.55, 0.18 + len * 0.05) * (seedOf(head) > 0.5 ? 1 : -1);
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const w = amp * Math.sin(t * Math.PI * waves);
    pts.push([hx + dx * t + nx * w, hy + dy * t + ny * w]);
  }
  return pts;
}

/** a smooth SVG path through points (midpoint quadratic curves) */
export function smoothPath(pts: Pt[]): string {
  if (pts.length < 2) return '';
  let d = `M${pts[0][0].toFixed(3)} ${pts[0][1].toFixed(3)}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2;
    const my = (pts[i][1] + pts[i + 1][1]) / 2;
    d += ` Q${pts[i][0].toFixed(3)} ${pts[i][1].toFixed(3)} ${mx.toFixed(3)} ${my.toFixed(3)}`;
  }
  const z = pts[pts.length - 1];
  return `${d} L${z[0].toFixed(3)} ${z[1].toFixed(3)}`;
}

/** the snake's body as a closed outline, fat behind the head and thin at the tail */
export function snakeBody(pts: Pt[]): string {
  const left: Pt[] = [];
  const right: Pt[] = [];
  pts.forEach((p, i) => {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    const t = i / (pts.length - 1);
    // a chunky body that thins to the tail
    const w = 0.23 * (1 - t) + 0.045 * t + (t < 0.08 ? -0.07 * (1 - t / 0.08) : 0);
    left.push([p[0] - (dy / l) * w, p[1] + (dx / l) * w]);
    right.push([p[0] + (dy / l) * w, p[1] - (dx / l) * w]);
  });
  return `${smoothPath(left)} L${smoothPath(right.reverse()).slice(1)} Z`;
}

/** the heading at a snake's head, in degrees (towards the body's start) */
export function headAngle(pts: Pt[]): number {
  const [a, b] = [pts[0], pts[2]];
  return (Math.atan2(a[1] - b[1], a[0] - b[0]) * 180) / Math.PI;
}

/** a ladder's two rails and its rungs */
export function ladderOf(foot: number, top: number): { rails: [Pt, Pt][]; rungs: [Pt, Pt][] } {
  const [fx, fy] = centerOf(foot);
  const [tx, ty] = centerOf(top);
  const dx = tx - fx;
  const dy = ty - fy;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy * 0.2;
  const ny = ux * 0.2;
  const ext = 0.22;
  const a: Pt = [fx - ux * ext, fy - uy * ext];
  const b: Pt = [tx + ux * ext, ty + uy * ext];
  const rails: [Pt, Pt][] = [
    [[a[0] + nx, a[1] + ny], [b[0] + nx, b[1] + ny]],
    [[a[0] - nx, a[1] - ny], [b[0] - nx, b[1] - ny]],
  ];
  const count = Math.max(2, Math.round((len + ext * 2) / 0.42));
  const rungs: [Pt, Pt][] = [];
  for (let i = 1; i < count; i++) {
    const t = i / count;
    const cx = a[0] + (b[0] - a[0]) * t;
    const cy = a[1] + (b[1] - a[1]) * t;
    rungs.push([[cx + nx, cy + ny], [cx - nx, cy - ny]]);
  }
  return { rails, rungs };
}

export const SNAKE_LIST = Object.entries(SNAKES).map(([h, t]) => ({ head: Number(h), tail: t }));
export const LADDER_LIST = Object.entries(LADDERS).map(([f, t]) => ({ foot: Number(f), top: t }));

/** where each token stands: its cell's top-left in board units, nudged and shrunk when it shares the square */
export interface Spot {
  playerId: string;
  x: number;
  y: number;
  scale: number;
}
const SHARE: Record<number, Pt[]> = {
  1: [[0, 0]],
  2: [[-0.2, 0.05], [0.2, -0.05]],
  3: [[-0.2, 0.15], [0.2, 0.15], [0, -0.18]],
  4: [[-0.2, 0.16], [0.2, 0.16], [-0.2, -0.18], [0.2, -0.18]],
};
export function spotsOf(seats: SnakesSeat[]): Spot[] {
  const out: Spot[] = [];
  const by = new Map<number, SnakesSeat[]>();
  for (const s of seats) if (s.pos > 0) by.set(s.pos, [...(by.get(s.pos) ?? []), s]);
  for (const [sq, list] of by) {
    const [cx, cy] = centerOf(sq);
    const offs = SHARE[Math.min(4, list.length)];
    list.forEach((s, i) => {
      const [ox, oy] = offs[i] ?? [0, 0];
      out.push({ playerId: s.playerId, x: cx - 0.5 + ox, y: cy - 0.5 + oy, scale: list.length > 1 ? 0.72 : 0.92 });
    });
  }
  return out;
}

export const HOP_MS = 200;
export const ENTER_MS = 520;
const SLIDE_MS = 1100;
const CLIMB_MS = 900;

/** the squares the token steps through: forward to the landing, or to 100 and back on a bounce */
export function walkOf(last: SnakesLastMove): number[] {
  if (last.from === 0) return last.landed > 0 ? Array.from({ length: last.landed }, (_, i) => i + 1) : [];
  const out: number[] = [];
  if (last.bounced) {
    for (let s = last.from + 1; s <= SNAKES_GOAL; s++) out.push(s);
    for (let s = SNAKES_GOAL - 1; s >= last.landed; s--) out.push(s);
  } else for (let s = last.from + 1; s <= last.landed; s++) out.push(s);
  return out;
}

/** how long the walk and the slide take */
export function moveTimes(last: SnakesLastMove): { walk: number; via: number } {
  const steps = walkOf(last).length;
  const walk = last.from === 0 && last.landed === 1 ? ENTER_MS : steps * HOP_MS;
  const via = last.via ? (last.via.kind === 'snake' ? SLIDE_MS : CLIMB_MS) : 0;
  return { walk, via };
}
export const moveMs = (last: SnakesLastMove) => {
  const t = moveTimes(last);
  return t.walk + t.via;
};

/** points along the snake or ladder the token rides, from start to end */
export function viaPoints(via: NonNullable<SnakesLastMove['via']>): Pt[] {
  if (via.kind === 'snake') return snakePoints(via.from, via.to, 24);
  const [ax, ay] = centerOf(via.from);
  const [bx, by] = centerOf(via.to);
  return Array.from({ length: 9 }, (_, i) => [ax + ((bx - ax) * i) / 8, ay + ((by - ay) * i) / 8] as Pt);
}

/** a token transform in board units (the token box is one cell) */
export const tf = (x: number, y: number, s = 1) => `translate(${x * 100}%, ${y * 100}%) scale(${s})`;
