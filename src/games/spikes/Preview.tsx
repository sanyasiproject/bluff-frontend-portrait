import { useEffect, useRef, useState } from 'react';
import { SPIKES_LIVES, SPIKES_RADIUS, SPIKES_SPEED, type PluggedMove, type PublicPlayer, type RoomView, type SpikeDir, type SpikesView } from '../../types';
import type { Auth } from '../../useAuth';
import type { Actions } from '../../useBluff';
import { SpikesTable } from './SpikesTable';

// Dev only (?spikesPreview=1): a local Spike Attack against bots, no server needed.
// ?spikesPreview=6 uses the 6 × 6 arena, =fast the fast speed, =over shows the podium.

const NAMES = ['Ravi', 'Asha', 'Bina', 'Meera'];
const IDS = ['me', 'b1', 'b2', 'b3'];
/** how long each bot takes to notice a warning */
const REACT = { b1: 350, b2: 600, b3: 900 } as Record<string, number>;
const DIRS: SpikeDir[] = ['left', 'right', 'top', 'bottom'];
/** the server's views go out at most this often */
const PUSH_MS = 80;
const player = (id: string, name: string, bot: boolean): PublicPlayer =>
  ({ id, name, avatar: null, back: 'classic', table: 'classic', cardCount: 0, handValue: null, connected: true, place: null, registered: true, coins: 5000, username: null, level: 20, bot, ready: true, saza: null }) as PublicPlayer;

type P = [number, number];
interface Sim {
  sp: SpikesView;
  fast: boolean;
  nextWarn: number;
  nextId: number;
  /** the last accepted move per player, for the speed check */
  moved: Record<string, number>;
  /** where each bot is heading */
  goal: Record<string, P>;
}

function start(size: number, fast: boolean): Sim {
  const n = size - 0.5;
  const corners: P[] = [[0.5, 0.5], [n, n], [n, 0.5], [0.5, n]];
  const startsAt = Date.now() + 3000;
  return {
    fast,
    nextWarn: startsAt + 600,
    nextId: 1,
    moved: {},
    goal: {},
    sp: {
      size, phase: 'countdown', startsAt, now: Date.now(), warnings: [], strikes: [], places: {},
      pos: Object.fromEntries(IDS.map((id, i) => [id, corners[i]])),
      lives: Object.fromEntries(IDS.map((id) => [id, SPIKES_LIVES])),
      safeUntil: {},
    },
  };
}

/** the server's hit test: the body overlaps the row or column band, a little forgiving */
const onLine = (p: P, dir: SpikeDir, line: number) => Math.abs((dir === 'left' || dir === 'right' ? p[1] : p[0]) - (line + 0.5)) < 0.5 + SPIKES_RADIUS * 0.85;
const clampIn = (v: number, size: number) => Math.max(SPIKES_RADIUS, Math.min(size - SPIKES_RADIUS, v));

/** the server's move check: no faster than the speed allows (plus lag slack); too far is cut short along the line */
function accept(s: Sim, id: string, to: P, now: number): Sim {
  const from = s.sp.pos[id];
  const elapsed = (now - (s.moved[id] ?? now - 100)) / 1000;
  const max = SPIKES_SPEED * elapsed + 0.35;
  const d = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const k = d > max ? max / d : 1;
  const p: P = [clampIn(from[0] + (to[0] - from[0]) * k, s.sp.size), clampIn(from[1] + (to[1] - from[1]) * k, s.sp.size)];
  return { ...s, moved: { ...s.moved, [id]: now }, sp: { ...s.sp, pos: { ...s.sp.pos, [id]: p } } };
}

function tick(s: Sim): Sim {
  const now = Date.now();
  let sp: SpikesView = { ...s.sp, now };
  let { nextWarn, nextId, goal } = s;
  if (sp.phase === 'countdown') return { ...s, sp: now >= sp.startsAt ? { ...sp, phase: 'play' } : sp };
  if (sp.phase !== 'play') return { ...s, sp };
  const elapsed = now - sp.startsAt;
  // a new warning: shorter and more often as time goes on
  if (now >= nextWarn) {
    const base = s.fast ? 2000 : 3000;
    const warnMs = Math.max(1000, base - elapsed * 0.03);
    const dir = DIRS[Math.floor(Math.random() * 4)];
    sp = { ...sp, warnings: [...sp.warnings, { id: nextId++, dir, line: Math.floor(Math.random() * sp.size), warnAt: now, strikeAt: now + warnMs }] };
    nextWarn = now + Math.max(500, (s.fast ? 1500 : 2000) - elapsed * 0.025) * (0.6 + Math.random() * 0.6);
  }
  // strikes
  for (const w of sp.warnings.filter((x) => x.strikeAt <= now)) {
    const hit = IDS.filter((id) => sp.lives[id] > 0 && (sp.safeUntil[id] ?? 0) <= now && onLine(sp.pos[id], w.dir, w.line));
    const lives = { ...sp.lives };
    const safeUntil = { ...sp.safeUntil };
    hit.forEach((id) => ((lives[id] -= 1), (safeUntil[id] = now + 1000)));
    const dead = hit.filter((id) => lives[id] <= 0);
    const alive = IDS.filter((id) => lives[id] > 0);
    const places = { ...sp.places };
    dead.forEach((id) => (places[id] = alive.length + 1));
    let phase: SpikesView['phase'] = sp.phase;
    if (alive.length <= 1) {
      alive.forEach((id) => (places[id] = 1));
      phase = 'over';
    }
    sp = { ...sp, lives, safeUntil, places, phase, warnings: sp.warnings.filter((x) => x.id !== w.id), strikes: [...sp.strikes, { id: w.id, dir: w.dir, line: w.line, at: now, hit }].slice(-8) };
  }
  // bots run (not step) to the nearest safe box once they've noticed the warnings, otherwise wander
  let next: Sim = { ...s, sp, nextWarn, nextId, goal };
  for (const id of IDS.slice(1)) {
    if (sp.lives[id] <= 0) continue;
    const pos = next.sp.pos[id];
    const seen = sp.warnings.filter((w) => now - w.warnAt >= REACT[id]);
    const safe = (p: P) => !seen.some((w) => onLine(p, w.dir, w.line));
    let g = goal[id];
    if (!g || !safe(g) || (Math.hypot(g[0] - pos[0], g[1] - pos[1]) < 0.05 && Math.random() < 0.04)) {
      const cells: P[] = [];
      for (let r = 0; r < sp.size; r++) for (let c = 0; c < sp.size; c++) cells.push([c + 0.5, r + 0.5]);
      const ok = cells.filter(safe).sort((a, b) => Math.hypot(a[0] - pos[0], a[1] - pos[1]) - Math.hypot(b[0] - pos[0], b[1] - pos[1]));
      g = safe(pos) && Math.random() < 0.7 ? (ok[1 + Math.floor(Math.random() * 3)] ?? ok[0] ?? pos) : (ok[0] ?? pos);
      goal = { ...goal, [id]: g };
    }
    const d = Math.hypot(g[0] - pos[0], g[1] - pos[1]);
    const step = Math.min(d, SPIKES_SPEED * 0.92 * (PUSH_MS / 1000));
    if (d > 0.01) next = accept(next, id, [pos[0] + ((g[0] - pos[0]) / d) * step, pos[1] + ((g[1] - pos[1]) / d) * step], now);
  }
  return { ...next, goal };
}

function finished(size: number): Sim {
  const s = start(size, false);
  return { ...s, sp: { ...s.sp, phase: 'over', lives: { me: 2, b1: 0, b2: 0, b3: 0 }, places: { me: 1, b1: 2, b2: 3, b3: 3 } } };
}

export function SpikesPreview({ auth }: { auth: Auth }) {
  const arg = new URLSearchParams(location.search).get('spikesPreview') ?? '';
  const size = arg === '6' ? 6 : 5;
  const [sim, setSim] = useState<Sim>(() => (arg === 'over' ? finished(size) : start(size, arg === 'fast')));
  const ref = useRef(sim);
  ref.current = sim;

  useEffect(() => {
    const t = window.setInterval(() => setSim((s) => tick(s)), PUSH_MS);
    return () => window.clearInterval(t);
  }, []);

  const actions = new Proxy({} as Actions, {
    get: (_, key) =>
      key === 'gameMove' || key === 'gameMoveQuiet'
        ? async (m: PluggedMove) => {
            if (m.kind !== 'spikes') return false;
            const { x, y } = m.move;
            // a little network lag before the server sees it
            window.setTimeout(() => setSim((s) => (s.sp.phase === 'play' && s.sp.lives.me > 0 ? accept(s, 'me', [x, y], Date.now()) : s)), 60);
            return true;
          }
        : key === 'rematch'
          ? async () => setSim(start(size, arg === 'fast'))
          : async () => null,
  });
  const players = IDS.map((id, i) => player(id, NAMES[i], i > 0));
  const over = sim.sp.phase === 'over';
  const winners = over ? IDS.filter((id) => sim.sp.places[id] === 1) : [];
  const view = {
    code: 'SPIKE', meId: 'me', hostId: 'me', phase: over ? 'over' : 'playing', players, watchers: [], leftPlayers: [], turnId: null, turnMsLeft: null,
    config: { game: 'spikes', stake: 0, opts: { size, speed: arg === 'fast' ? 'fast' : 'normal' }, turnTimer: false, voice: false, teams: false },
    watchRequests: [], winnerIds: winners, loserIds: over ? IDS.filter((id) => !winners.includes(id)) : [], teams: null, slots: null, swapAsks: [], coinResults: null, stopped: false, awards: [],
    plugged: { kind: 'spikes', spikes: sim.sp }, crazy7: null, rang: null, hand: [], pileCount: 0, pileTopBy: [], passedIds: [], endedEarly: false,
  } as unknown as RoomView;
  return <SpikesTable view={view} actions={actions} bubbles={[]} auth={auth} />;
}
