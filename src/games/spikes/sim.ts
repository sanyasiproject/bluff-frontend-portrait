import { SPIKES_LIVES, SPIKES_SPEED, type SpikeDir, type SpikesView, type SpikeWarning } from '../../types';
import { DIRS, walk, hitBy, reaches, type Box, type P } from './geometry';

// Dev only: the local Spike Attack rules the preview plays (crates, whole-side walls), shaped like the server's

export const IDS = ['me', 'b1', 'b2', 'b3'];
/** how long each bot takes to notice a warning */
const REACT: Record<string, number> = { b1: 300, b2: 550, b3: 850 };
const MAX_MS = 180_000;
/** the server's move check: speed plus lag slack */
const SLACK = 0.35;

export interface Sim {
  sp: SpikesView;
  fast: boolean;
  nextWarn: number;
  nextId: number;
  moved: Record<string, number>;
  /** each bot's path of squares to run along */
  path: Record<string, P[]>;
  seed: number;
}

/** a small seeded random, so a game's crates are the same every time */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const key = (c: number, r: number) => `${c},${r}`;
const centre = (c: number, r: number): P => [c + 0.5, r + 0.5];

/** open squares reachable from (c, r), with the first step of the shortest path to each */
function bfs(size: number, boxes: readonly Box[], from: [number, number]): Map<string, [number, number][]> {
  const blocked = new Set(boxes.map(([c, r]) => key(c, r)));
  const paths = new Map<string, [number, number][]>([[key(from[0], from[1]), [from]]]);
  const queue: [number, number][] = [from];
  while (queue.length) {
    const [c, r] = queue.shift()!;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n: [number, number] = [c + dc, r + dr];
      if (n[0] < 0 || n[1] < 0 || n[0] >= size || n[1] >= size || blocked.has(key(n[0], n[1])) || paths.has(key(n[0], n[1]))) continue;
      paths.set(key(n[0], n[1]), [...paths.get(key(c, r))!, n]);
      queue.push(n);
    }
  }
  return paths;
}

/** squares safe from every one of these walls */
function safeSquares(size: number, boxes: readonly Box[], dirs: SpikeDir[]): [number, number][] {
  const reach = reaches(size, boxes);
  const blocked = new Set(boxes.map(([c, r]) => key(c, r)));
  const out: [number, number][] = [];
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (!blocked.has(key(c, r)) && dirs.every((d) => !hitBy(centre(c, r), d, reach[d], size))) out.push([c, r]);
  return out;
}

/** 4 crates on 5 × 5, 6 on 6 × 6: off the start corners and their neighbours, every side has a shield, nothing walled in */
export function makeBoxes(size: number, seed: number): Box[] {
  const rnd = seeded(seed);
  const n = size >= 6 ? 6 : 4;
  const corners = [[0, 0], [size - 1, 0], [0, size - 1], [size - 1, size - 1]];
  const nearCorner = (c: number, r: number) => corners.some(([a, b]) => Math.abs(a - c) <= 1 && Math.abs(b - r) <= 1);
  for (let tries = 0; tries < 2000; tries++) {
    const loose = tries > 600;
    const out: Box[] = [];
    for (let g = 0; g < 200 && out.length < n; g++) {
      const c = Math.floor(rnd() * size);
      const r = Math.floor(rnd() * size);
      if (nearCorner(c, r) || out.some(([a, b]) => (loose ? Math.abs(a - c) + Math.abs(b - r) : Math.max(Math.abs(a - c), Math.abs(b - r))) <= 1)) continue;
      out.push([c, r]);
    }
    if (out.length < n) continue;
    const open = bfs(size, out, [0, 0]);
    if (open.size !== size * size - n) continue;
    if (DIRS.every((d) => safeSquares(size, out, [d]).length > 0)) return out;
  }
  return [[2, 0], [0, 2], [size - 1, 2], [2, size - 1]];
}

export function start(size: number, fast: boolean, seed = Math.floor(Math.random() * 1e9)): Sim {
  const n = size - 0.5;
  const corners: P[] = [[0.5, 0.5], [n, n], [n, 0.5], [0.5, n]];
  const startsAt = Date.now() + 3000;
  return {
    fast,
    seed,
    nextWarn: startsAt + 800,
    nextId: 1,
    moved: {},
    path: {},
    sp: {
      size, phase: 'countdown', startsAt, now: Date.now(), warnings: [], strikes: [], places: {}, boxes: makeBoxes(size, seed),
      pos: Object.fromEntries(IDS.map((id, i) => [id, corners[i]])),
      lives: Object.fromEntries(IDS.map((id) => [id, SPIKES_LIVES])),
      safeUntil: {},
    },
  };
}

/** a move: no faster than the speed allows, and pushed out of crates */
export function accept(s: Sim, id: string, to: P, now: number): Sim {
  const from = s.sp.pos[id];
  const elapsed = (now - (s.moved[id] ?? now - 100)) / 1000;
  const max = SPIKES_SPEED * elapsed + SLACK;
  const d = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const k = d > max ? max / d : 1;
  const p = walk(from, [from[0] + (to[0] - from[0]) * k, from[1] + (to[1] - from[1]) * k], s.sp.boxes, s.sp.size);
  return { ...s, moved: { ...s.moved, [id]: now }, sp: { ...s.sp, pos: { ...s.sp.pos, [id]: p } } };
}

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

/** the next wall (or two, later on, when a square is safe from both) */
function warn(s: Sim, now: number): Sim {
  const sp = s.sp;
  const k = Math.min(1, (now - sp.startsAt) / 120_000);
  const warnMs = lerp(s.fast ? 2000 : 3000, 1500, k);
  const pick = () => DIRS[Math.floor(Math.random() * 4)];
  let dirs: SpikeDir[] = [pick()];
  if (k > 0.3 && Math.random() < 0.15 + 0.35 * k) {
    const other = DIRS.filter((d) => d !== dirs[0] && safeSquares(sp.size, sp.boxes, [dirs[0], d]).length > 0);
    if (other.length) dirs = [...dirs, other[Math.floor(Math.random() * other.length)]];
  }
  let nextId = s.nextId;
  const ws: SpikeWarning[] = dirs.map((dir) => ({ id: nextId++, dir, warnAt: now, strikeAt: now + warnMs }));
  const gap = lerp(1500 + Math.random() * 1500, 700 + Math.random() * 800, k);
  return { ...s, nextId, nextWarn: now + warnMs + gap, sp: { ...sp, warnings: [...sp.warnings, ...ws] } };
}

function strike(sp: SpikesView, w: SpikeWarning, now: number): SpikesView {
  const reach = reaches(sp.size, sp.boxes)[w.dir];
  const hit = IDS.filter((id) => sp.lives[id] > 0 && (sp.safeUntil[id] ?? 0) <= now && hitBy(sp.pos[id], w.dir, reach, sp.size));
  const lives = { ...sp.lives };
  const safeUntil = { ...sp.safeUntil };
  hit.forEach((id) => ((lives[id] -= 1), (safeUntil[id] = now + 1000)));
  const alive = IDS.filter((id) => lives[id] > 0);
  const places = { ...sp.places };
  hit.filter((id) => lives[id] <= 0).forEach((id) => (places[id] = alive.length + 1));
  let phase = sp.phase;
  if (alive.length <= 1) {
    alive.forEach((id) => (places[id] = 1));
    phase = 'over';
  }
  return { ...sp, lives, safeUntil, places, phase, warnings: sp.warnings.filter((x) => x.id !== w.id), strikes: [...sp.strikes, { id: w.id, dir: w.dir, at: now, hit }].slice(-8) };
}

/** a bot runs along open squares to the nearest square shielded from what it has noticed */
function botStep(s: Sim, id: string, now: number, dtMs: number): Sim {
  const sp = s.sp;
  const pos = sp.pos[id];
  const here: [number, number] = [Math.min(sp.size - 1, Math.floor(pos[0])), Math.min(sp.size - 1, Math.floor(pos[1]))];
  const seen = sp.warnings.filter((w) => now - w.warnAt >= REACT[id]).map((w) => w.dir);
  let path = s.path[id] ?? [];
  const goal = path[path.length - 1];
  const reach = reaches(sp.size, sp.boxes);
  const goalOk = goal && seen.every((d) => !hitBy(goal, d, reach[d], sp.size));
  if (!goalOk || (!path.length && Math.random() < 0.01)) {
    const paths = bfs(sp.size, sp.boxes, here);
    const ok = seen.length ? safeSquares(sp.size, sp.boxes, seen) : [...paths.values()].map((p) => p[p.length - 1]).filter(() => Math.random() < 0.3);
    const best = ok.map((c) => paths.get(key(c[0], c[1]))).filter(Boolean).sort((a, b) => a!.length - b!.length)[0];
    path = best ? best.slice(1).map(([c, r]) => centre(c, r)) : [];
    if (best && best.length === 1) path = [centre(here[0], here[1])];
  }
  if (!path.length) return { ...s, path: { ...s.path, [id]: path } };
  const [tx, ty] = path[0];
  const d = Math.hypot(tx - pos[0], ty - pos[1]);
  const step = Math.min(d, SPIKES_SPEED * 0.92 * (dtMs / 1000));
  if (d < 0.06) path = path.slice(1);
  const next = d > 0.01 ? accept(s, id, [pos[0] + ((tx - pos[0]) / d) * step, pos[1] + ((ty - pos[1]) / d) * step], now) : s;
  return { ...next, path: { ...next.path, [id]: path } };
}

export function tick(s: Sim, dtMs: number): Sim {
  const now = Date.now();
  let next: Sim = { ...s, sp: { ...s.sp, now } };
  const sp = next.sp;
  if (sp.phase === 'countdown') return { ...next, sp: now >= sp.startsAt ? { ...sp, phase: 'play' } : sp };
  if (sp.phase !== 'play') return next;
  // the 3-minute cap: most hearts wins
  if (now - sp.startsAt >= MAX_MS) {
    const best = Math.max(...IDS.map((id) => sp.lives[id]));
    return { ...next, sp: { ...sp, phase: 'over', warnings: [], places: Object.fromEntries(IDS.map((id) => [id, sp.lives[id] === best ? 1 : 2])) } };
  }
  if (now >= next.nextWarn && !sp.warnings.length) next = warn(next, now);
  for (const w of next.sp.warnings.filter((x) => x.strikeAt <= now)) next = { ...next, sp: strike(next.sp, w, now) };
  for (const id of IDS.slice(1)) if (next.sp.lives[id] > 0 && next.sp.phase === 'play') next = botStep(next, id, now, dtMs);
  return next;
}

export function finished(size: number): Sim {
  const s = start(size, false);
  return { ...s, sp: { ...s.sp, phase: 'over', lives: { me: 2, b1: 0, b2: 0, b3: 0 }, places: { me: 1, b1: 2, b2: 3, b3: 3 } } };
}
