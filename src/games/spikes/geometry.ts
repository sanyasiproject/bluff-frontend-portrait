import { SPIKES_RADIUS, spikeReach, type SpikeDir } from '../../types';

// Spike Attack geometry shared by the table and the local sim: crate collision and who a spike wall reaches

export type P = [number, number];
export type Box = [number, number];
/** a little forgiving: only this share of the body counts for a hit (same as the server) */
export const HIT_SHARE = 0.85;
/** the arena's gutter and grid, in % of its side */
export const G = 9;
export const GRID = 100 - 2 * G;
export const DIRS: SpikeDir[] = ['left', 'right', 'top', 'bottom'];

export const across = (d: SpikeDir) => d === 'left' || d === 'right';
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** pushes a body out of every crate (circle vs square) and keeps it in the arena, twice like the server; moving into a crate slides along it */
export function collide(p: P, boxes: readonly Box[], size: number, r = SPIKES_RADIUS): P {
  let [x, y] = p;
  for (let k = 0; k < 2; k++) {
    x = clamp(x, r, size - r);
    y = clamp(y, r, size - r);
    for (const [c, row] of boxes) {
      const nx = clamp(x, c, c + 1);
      const ny = clamp(y, row, row + 1);
      const dx = x - nx;
      const dy = y - ny;
      const d = Math.hypot(dx, dy);
      if (d >= r) continue;
      if (d > 1e-9) {
        x = nx + (dx / d) * r;
        y = ny + (dy / d) * r;
      } else {
        // centre inside the crate: out through the nearest face
        const faces: [number, number, number][] = [
          [x - c, c - r, y],
          [c + 1 - x, c + 1 + r, y],
          [y - row, x, row - r],
          [row + 1 - y, x, row + 1 + r],
        ];
        faces.sort((a, b) => a[0] - b[0]);
        x = faces[0][1];
        y = faces[0][2];
      }
    }
  }
  return [clamp(x, r, size - r), clamp(y, r, size - r)];
}

/** the server's walk: from `from` towards `to` in steps of at most 0.2, pushed out of crates after each */
export function walk(from: P, to: P, boxes: readonly Box[], size: number): P {
  const n = Math.max(1, Math.ceil(Math.hypot(to[0] - from[0], to[1] - from[1]) / 0.2));
  let p: P = from;
  for (let i = 1; i <= n; i++) p = collide([p[0] + (to[0] - from[0]) / n, p[1] + (to[1] - from[1]) / n], boxes, size);
  return p;
}

/** every side's reach per line, for this arena's crates */
export function reaches(size: number, boxes: readonly Box[]): Record<SpikeDir, number[]> {
  return Object.fromEntries(DIRS.map((d) => [d, spikeReach(size, boxes, d)])) as Record<SpikeDir, number[]>;
}

/** a wall from `dir` hits this body: any of it inside the reached part of a line it overlaps */
export function hitBy(p: P, dir: SpikeDir, reach: readonly number[], size: number): boolean {
  const r = SPIKES_RADIUS * HIT_SHARE;
  const side = across(dir) ? p[1] : p[0];
  const along = across(dir) ? p[0] : p[1];
  const fromSide = dir === 'left' || dir === 'top' ? along - r : size - along - r;
  for (let line = 0; line < size; line++) {
    if (Math.abs(side - (line + 0.5)) >= 0.5 + r) continue;
    if (fromSide < reach[line]) return true;
  }
  return false;
}

/** the square (col, row) is in the reached part of a wall from `dir` */
export function cellHit(c: number, r: number, dir: SpikeDir, reach: readonly number[], size: number): boolean {
  const line = across(dir) ? r : c;
  const along = dir === 'left' ? c : dir === 'right' ? size - 1 - c : dir === 'top' ? r : size - 1 - r;
  return along < reach[line];
}

/** the square sits in a crate's shadow from `dir` (past the crate in its line) */
export function cellShadow(c: number, r: number, dir: SpikeDir, reach: readonly number[], size: number): boolean {
  const line = across(dir) ? r : c;
  const along = dir === 'left' ? c : dir === 'right' ? size - 1 - c : dir === 'top' ? r : size - 1 - r;
  return reach[line] < size && along > reach[line];
}

/** the layout check is this much looser than the real hit test (arena units), like the server's shield.ts */
const SHIELD_SLACK = 0.02;
const SHIELD_STEP = 0.025;

/** a spot no wall reaches where a body fits clear of the crates (null if none): the server's shieldedSpot */
export function shieldedSpot(size: number, boxes: readonly Box[], hitR = SPIKES_RADIUS * HIT_SHARE): P | null {
  const hr = hitR - SHIELD_SLACK;
  const R = SPIKES_RADIUS - SHIELD_SLACK;
  const w = 0.5 + hr;
  const { left: L, right: Rt, top: T, bottom: B } = reaches(size, boxes);
  const vals: number[] = [];
  for (let k = Math.ceil(R / SHIELD_STEP); k * SHIELD_STEP <= size - R + 1e-9; k++) vals.push(k * SHIELD_STEP);
  // the lanes a centre at v overlaps
  const lanes = (v: number): number[] => {
    const out: number[] = [];
    for (let l = Math.max(0, Math.floor(v - w - 0.5)); l <= Math.min(size - 1, Math.ceil(v + w - 0.5)); l++) if (Math.abs(v - (l + 0.5)) < w) out.push(l);
    return out;
  };
  const span = (near: number[], far: number[]) => (v: number): [number, number] => {
    const ls = lanes(v);
    return [Math.max(...ls.map((l) => near[l])) + hr, size - Math.max(...ls.map((l) => far[l])) - hr];
  };
  const xSafe = vals.map(span(L, Rt));
  const ySafe = vals.map(span(T, B));
  const clear = (x: number, y: number) => boxes.every(([c, r]) => Math.hypot(x - clamp(x, c, c + 1), y - clamp(y, r, r + 1)) >= R);
  for (let j = 0; j < vals.length; j++) {
    const [xl, xh] = xSafe[j];
    if (xl > xh) continue;
    for (let i = 0; i < vals.length; i++) {
      const x = vals[i];
      if (x < xl || x > xh) continue;
      const y = vals[j];
      const [yl, yh] = ySafe[i];
      if (y >= yl && y <= yh && clear(x, y)) return [x, y];
    }
  }
  return null;
}

/** crates per arena size: 4 on 5 × 5, 6 on 6 × 6, 10 on 8 × 8, 14 on 10 × 10 */
export function boxCount(size: number): number {
  if (size <= 5) return 4;
  if (size <= 6) return 6;
  if (size <= 8) return 10;
  return 14;
}

/** reorders `to` so to[i] is the square crate from[i] slides to: nearest pairs first */
export function pairUp(from: readonly Box[], to: readonly Box[]): Box[] {
  const out: (Box | null)[] = from.map(() => null);
  const left = new Set(to.map((_, j) => j));
  const pairs: [number, number, number][] = [];
  from.forEach(([a, b], i) => to.forEach(([c, d], j) => pairs.push([Math.abs(a - c) + Math.abs(b - d), i, j])));
  pairs.sort((p, q) => p[0] - q[0] || p[1] - q[1] || p[2] - q[2]);
  for (const [, i, j] of pairs) {
    if (out[i] || !left.has(j)) continue;
    out[i] = [to[j][0], to[j][1]];
    left.delete(j);
  }
  return [...(out.filter(Boolean) as Box[]), ...[...left].map((j) => [to[j][0], to[j][1]] as Box)];
}

/** gap from a body's centre to square [c, r] (0 inside it) */
export const gapTo = ([c, r]: Box, [x, y]: P): number => Math.hypot(x - clamp(x, c, c + 1), y - clamp(y, r, r + 1));
