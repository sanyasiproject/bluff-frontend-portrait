import { useEffect, useRef, useState } from 'react';
import { SPIKES_LIVES, type PluggedMove, type PublicPlayer, type RoomView, type SpikeDir, type SpikesView } from '../../types';
import type { Auth } from '../../useAuth';
import type { Actions } from '../../useBluff';
import { SpikesTable } from './SpikesTable';

// Dev only (?spikesPreview=1): a local Spike Attack against bots, no server needed.
// ?spikesPreview=6 uses the 6 × 6 arena, =fast the fast speed, =over shows the podium.

const NAMES = ['Ravi', 'Asha', 'Bina', 'Meera'];
const IDS = ['me', 'b1', 'b2', 'b3'];
/** how late each bot reacts to a warning (ms before the strike it starts to move) */
const REACT = { b1: 600, b2: 900, b3: 1300 } as Record<string, number>;
const DIRS: SpikeDir[] = ['left', 'right', 'top', 'bottom'];
const player = (id: string, name: string, bot: boolean): PublicPlayer =>
  ({ id, name, avatar: null, back: 'classic', table: 'classic', cardCount: 0, handValue: null, connected: true, place: null, registered: true, coins: 5000, username: null, level: 20, bot, ready: true, saza: null }) as PublicPlayer;

interface Sim {
  sp: SpikesView;
  fast: boolean;
  nextWarn: number;
  nextId: number;
  botMove: Record<string, number>;
}

function start(size: number, fast: boolean): Sim {
  const n = size - 1;
  const corners: [number, number][] = [[0, 0], [n, n], [n, 0], [0, n]];
  const startsAt = Date.now() + 3000;
  return {
    fast,
    nextWarn: startsAt + 600,
    nextId: 1,
    botMove: {},
    sp: {
      size, phase: 'countdown', startsAt, now: Date.now(), warnings: [], strikes: [], places: {},
      pos: Object.fromEntries(IDS.map((id, i) => [id, corners[i]])),
      lives: Object.fromEntries(IDS.map((id) => [id, SPIKES_LIVES])),
      safeUntil: {},
    },
  };
}

const onLine = (pos: [number, number], dir: SpikeDir, line: number) => (dir === 'left' || dir === 'right' ? pos[1] === line : pos[0] === line);

function move(pos: [number, number], dir: 'up' | 'down' | 'left' | 'right', size: number): [number, number] {
  const [c, r] = pos;
  const n = size - 1;
  return dir === 'left' ? [Math.max(0, c - 1), r] : dir === 'right' ? [Math.min(n, c + 1), r] : dir === 'up' ? [c, Math.max(0, r - 1)] : [c, Math.min(n, r + 1)];
}

function tick(s: Sim): Sim {
  const now = Date.now();
  let sp: SpikesView = { ...s.sp, now };
  let { nextWarn, nextId, botMove } = s;
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
  // bots step off lines about to strike, otherwise wander
  for (const id of IDS.slice(1)) {
    if (sp.lives[id] <= 0 || now < (botMove[id] ?? 0)) continue;
    const pos = sp.pos[id];
    const danger = (p: [number, number], within: number) => sp.warnings.some((w) => w.strikeAt - now < within && onLine(p, w.dir, w.line));
    const steps = (['up', 'down', 'left', 'right'] as const).map((d) => move(pos, d, sp.size)).filter((p) => p[0] !== pos[0] || p[1] !== pos[1]);
    let to: [number, number] | null = null;
    if (danger(pos, REACT[id])) to = steps.find((p) => !danger(p, 9999)) ?? steps[Math.floor(Math.random() * steps.length)];
    else if (Math.random() < 0.25) to = steps.filter((p) => !danger(p, 9999))[0] ?? null;
    if (to) sp = { ...sp, pos: { ...sp.pos, [id]: to } };
    botMove = { ...botMove, [id]: now + 180 + Math.random() * 220 };
  }
  return { ...s, sp, nextWarn, nextId, botMove };
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
  const lastStep = useRef(0);

  useEffect(() => {
    const t = window.setInterval(() => setSim((s) => tick(s)), 50);
    return () => window.clearInterval(t);
  }, []);

  const actions = new Proxy({} as Actions, {
    get: (_, key) =>
      key === 'gameMove' || key === 'gameMoveQuiet'
        ? async (m: PluggedMove) => {
            if (m.kind !== 'spikes') return false;
            const dir = m.move.dir;
            // a little network lag; the server keeps 140 ms between steps
            window.setTimeout(() => {
              if (Date.now() - lastStep.current < 130) return;
              lastStep.current = Date.now();
              setSim((s) => (s.sp.phase === 'play' && s.sp.lives.me > 0 ? { ...s, sp: { ...s.sp, pos: { ...s.sp.pos, me: move(s.sp.pos.me, dir, s.sp.size) } } } : s));
            }, 60);
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
