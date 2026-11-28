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
