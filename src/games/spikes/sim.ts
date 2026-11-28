import { SPIKES_LIVES, SPIKES_RADIUS, SPIKES_SPEED, type SpikeDir, type SpikesView, type SpikeWarning } from '../../types';
import { boxCount, DIRS, gapTo, hitBy, pairUp, reaches, shieldedSpot, walk, type Box, type P } from './geometry';

// Dev only: the local Spike Attack rules the preview plays (crates, whole-side walls, crate shifts), shaped like the server's

export const IDS = ['me', 'b1', 'b2', 'b3'];
/** how long each bot takes to notice a warning */
const REACT: Record<string, number> = { b1: 300, b2: 550, b3: 850 };
const MAX_MS = 180_000;
/** the server's move check: speed plus lag slack */
const SLACK = 0.35;
/** crate shifts, as on the server: from 8 × 8, every 40 s, ghosts 2 s, calm 0.7 s after, 3 tries */
const SHIFT_FROM = 8;
const SHIFT_MS = 40_000;
const SHIFT_WARN_MS = 2_000;
const SHIFT_CALM_MS = 700;
const SHIFT_TRIES = 3;
/** the chance a wall is aimed at the side hitting the most players */
const AIM = 0.6;
/** extra warning per size above 6 (ms) */
const WARN_PER_SIZE = 125;

export interface Sim {
  sp: SpikesView;
  fast: boolean;
  nextWarn: number;
  nextId: number;
  moved: Record<string, number>;
  /** each bot's path of squares to run along */
  path: Record<string, P[]>;
  seed: number;
  nextShift: number;
  shiftTries: number;
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

/** open squares reachable from (c, r), with the shortest path to each */
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

/** the server's fair layout: no two crates side by side, nothing walled in, every side shields a square, no spot hidden from all four walls */
export function fairBoxes(size: number, boxes: readonly Box[]): boolean {
  const has = new Set(boxes.map(([c, r]) => key(c, r)));
  if (boxes.some(([c, r]) => has.has(key(c + 1, r)) || has.has(key(c, r + 1)))) return false;
  if (bfs(size, boxes, [0, 0]).size !== size * size - boxes.length) return false;
  if (!DIRS.every((d) => safeSquares(size, boxes, [d]).length > 0)) return false;
  return shieldedSpot(size, boxes) === null;
}

/** boxCount(size) crates off the start corners, none on a square `avoid` rules out; random up to 6 × 6, one by one on bigger arenas */
export function drawBoxes(size: number, rnd: () => number, avoid: (b: Box) => boolean = () => false, tries = 500): Box[] | null {
  const count = boxCount(size);
  const near = (v: number) => v <= 1 || v >= size - 2;
  const spots: Box[] = [];
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (!(near(c) && near(r)) && !avoid([c, r])) spots.push([c, r]);
  for (let t = 0; t < tries; t++) {
    const pool = [...spots];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    let pick: Box[];
    if (size <= 6) pick = pool.slice(0, count);
    else {
      pick = [];
      const has = new Set<string>();
      for (const [c, r] of pool) {
        if (pick.length >= count) break;
        if (has.has(key(c + 1, r)) || has.has(key(c - 1, r)) || has.has(key(c, r + 1)) || has.has(key(c, r - 1))) continue;
        pick.push([c, r]);
        has.add(key(c, r));
      }
      if (pick.length < count) continue;
    }
    pick.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
    if (fairBoxes(size, pick)) return pick;
  }
  return null;
}

export function makeBoxes(size: number, seed: number): Box[] {
  return drawBoxes(size, seeded(seed)) ?? drawBoxes(size, seeded(12345), () => false, 5000) ?? [];
}

export function start(size: number, fast: boolean, seed = Math.floor(Math.random() * 1e9), firstShiftMs = SHIFT_MS): Sim {
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
    nextShift: size >= SHIFT_FROM ? startsAt + firstShiftMs : Infinity,
    shiftTries: 0,
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
const aliveIds = (sp: SpikesView) => IDS.filter((id) => sp.lives[id] > 0);

/** the next wall (or two, later on, when a square is safe from both); often aimed at the side hitting the most players */
function warn(s: Sim, now: number): Sim {
  const sp = s.sp;
  const k = Math.min(1, (now - sp.startsAt) / 120_000);
  const warnMs = lerp(s.fast ? 2000 : 3000, 1500, k) + Math.max(0, sp.size - 6) * WARN_PER_SIZE;
  let sides = DIRS;
  if (Math.random() < AIM) {
    const reach = reaches(sp.size, sp.boxes);
    const count = (d: SpikeDir) => aliveIds(sp).filter((id) => hitBy(sp.pos[id], d, reach[d], sp.size)).length;
    const best = Math.max(...DIRS.map(count));
    if (best > 0) sides = DIRS.filter((d) => count(d) === best);
  }
  let dirs: SpikeDir[] = [sides[Math.floor(Math.random() * sides.length)]];
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

/** a living player's circle overlaps square b (with `margin` to spare) */
const onCell = (sp: SpikesView, b: Box, margin: number) => aliveIds(sp).some((id) => gapTo(b, sp.pos[id]) < SPIKES_RADIUS + margin);

/** no shift this time: try again in 40 s */
function callOff(s: Sim, now: number): Sim {
  const { boxesNext: _n, boxesAt: _a, ...sp } = s.sp;
  return { ...s, shiftTries: 0, nextShift: now + SHIFT_MS, sp };
}

/** the ghosts of a new fair layout clear of every player; walls wait until it lands */
function planShift(s: Sim, now: number): Sim {
  const sp = s.sp;
  const was = new Set(sp.boxes.map(([c, r]) => key(c, r)));
  let next: Box[] | null = null;
  for (let t = 0; t < 4 && !next; t++) {
    const d = drawBoxes(sp.size, Math.random, (b) => onCell(sp, b, 0.15), 120);
    if (d && d.some(([c, r]) => !was.has(key(c, r)))) next = pairUp(sp.boxes, d);
  }
  if (!next) return callOff(s, now);
  const boxesAt = now + SHIFT_WARN_MS;
  return { ...s, path: {}, nextWarn: Math.max(s.nextWarn, boxesAt + SHIFT_CALM_MS), sp: { ...sp, boxesNext: next, boxesAt } };
}

/** the crates land, unless someone stands on a target: then another layout (3 tries at most) */
function landShift(s: Sim, now: number): Sim {
  const next = s.sp.boxesNext!;
  if (next.some((b) => onCell(s.sp, b, 0))) return s.shiftTries + 1 >= SHIFT_TRIES ? callOff(s, now) : planShift({ ...s, shiftTries: s.shiftTries + 1 }, now);
  const { boxesNext: _n, boxesAt: _a, ...sp } = s.sp;
  return { ...s, path: {}, shiftTries: 0, nextShift: now + SHIFT_MS, sp: { ...sp, boxes: next } };
}

/** a bot runs along open squares to the nearest square shielded from what it has noticed, keeping off ghost crates */
function botStep(s: Sim, id: string, now: number, dtMs: number): Sim {
  const sp = s.sp;
  const pos = sp.pos[id];
  const here: [number, number] = [Math.min(sp.size - 1, Math.floor(pos[0])), Math.min(sp.size - 1, Math.floor(pos[1]))];
  const seen = sp.warnings.filter((w) => now - w.warnAt >= REACT[id]).map((w) => w.dir);
  const ghosts = sp.boxesNext ?? [];
  const onGhost = (p: P) => ghosts.some((g) => gapTo(g, p) < SPIKES_RADIUS + 0.1);
  let path = s.path[id] ?? [];
  const goal = path[path.length - 1];
  const reach = reaches(sp.size, sp.boxes);
  const goalOk = goal && !onGhost(goal) && seen.every((d) => !hitBy(goal, d, reach[d], sp.size));
  if (!goalOk || (!path.length && (Math.random() < 0.01 || onGhost(pos)))) {
    const paths = bfs(sp.size, ghosts.length ? [...sp.boxes, ...ghosts] : sp.boxes, here);
    const wander = onGhost(pos) ? 1 : 0.3;
    const ok = (seen.length ? safeSquares(sp.size, sp.boxes, seen) : [...paths.values()].map((p) => p[p.length - 1]).filter(() => Math.random() < wander)).filter(
      ([c, r]) => !onGhost(centre(c, r)),
    );
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
    const { boxesNext: _n, boxesAt: _a, ...rest } = sp;
    return { ...next, sp: { ...rest, phase: 'over', warnings: [], places: Object.fromEntries(IDS.map((id) => [id, sp.lives[id] === best ? 1 : 2])) } };
  }
  if (sp.boxesNext && now >= (sp.boxesAt ?? 0)) next = landShift(next, now);
  else if (!sp.boxesNext && !sp.warnings.length && now >= next.nextShift) next = planShift(next, now);
  if (now >= next.nextWarn && !next.sp.warnings.length && !next.sp.boxesNext) next = warn(next, now);
  for (const w of next.sp.warnings.filter((x) => x.strikeAt <= now)) next = { ...next, sp: strike(next.sp, w, now) };
  for (const id of IDS.slice(1)) if (next.sp.lives[id] > 0 && next.sp.phase === 'play') next = botStep(next, id, now, dtMs);
  return next;
}

export function finished(size: number): Sim {
  const s = start(size, false);
  return { ...s, sp: { ...s.sp, phase: 'over', lives: { me: 2, b1: 0, b2: 0, b3: 0 }, places: { me: 1, b1: 2, b2: 3, b3: 3 } } };
}
