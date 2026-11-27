import { useEffect, useRef, useState } from 'react';
import { FRUIT_POINTS, FRUIT_SLICE_SLACK_MS, fruitAt, fruitWave, type FruitSpawn, type FruitView, type PluggedMove, type PublicPlayer, type RoomView } from '../../types';
import type { Auth } from '../../useAuth';
import type { Actions } from '../../useBluff';
import { FruitTable } from './FruitTable';

// Dev only (?fruitPreview=1): a local Fruit Slice Duel against bots, no server needed.
// ?fruitPreview=2 / =3 plays with fewer seats; ?fruitPreview=over shows the podium.

const NAMES = ['Ravi', 'Asha', 'Bina', 'Meera'];
const SKILL = [0, 0.55, 0.72, 0.85];
const SECONDS = 45;
const player = (id: string, name: string, bot: boolean): PublicPlayer =>
  ({ id, name, avatar: null, back: 'classic', table: 'classic', cardCount: 0, handValue: null, connected: true, place: null, registered: true, coins: 5000, username: null, level: 20, bot, ready: true, saza: null }) as PublicPlayer;

interface Sim {
  fr: FruitView;
  wave: FruitSpawn[];
  /** per bot: fruit id → ms after the start it gets cut */
  plan: Record<string, [number, number][]>;
}

function start(ids: string[]): Sim {
  const seed = Math.floor(Math.random() * 2 ** 31);
  const wave = fruitWave(seed, SECONDS);
  const startsAt = Date.now() + 3000;
  const plan: Record<string, [number, number][]> = {};
  ids.slice(1).forEach((id, i) => {
    const skill = SKILL[i + 1];
    plan[id] = wave
      .filter((f) => Math.random() < (f.kind === 'bomb' ? 0.06 : skill))
      .map((f): [number, number] => [f.id, Math.round(f.t + (f.vy / 1.6) * 1000 + (Math.random() - 0.5) * 500)])
      .sort((a, b) => a[1] - b[1]);
  });
  const zero = Object.fromEntries(ids.map((id) => [id, 0]));
  return {
    wave,
    plan,
    fr: { phase: 'countdown', seed, seconds: SECONDS, startsAt, endsAt: startsAt + SECONDS * 1000, scores: zero, sliced: Object.fromEntries(ids.map((id) => [id, []])), combo: { ...zero }, bombs: { ...zero }, now: Date.now() },
  };
}

/** the server's check: each fruit once, on screen at `at`, and `at` close to now */
function slice(s: Sim, id: string, ids: number[], at: number): Sim {
  const elapsed = Date.now() - s.fr.startsAt;
  if (s.fr.phase !== 'play' || Math.abs(at - elapsed) > FRUIT_SLICE_SLACK_MS) return s;
  const mine = new Set(s.fr.sliced[id] ?? []);
  const ok = ids.filter((n) => {
    const f = s.wave.find((x) => x.id === n);
    const p = f && fruitAt(f, at);
    if (!f || !p || p.x < -0.05 || p.x > 1.05 || p.y < -0.05 || p.y > 1.05 || mine.has(n)) return false;
    mine.add(n);
    return true;
  });
  if (!ok.length) return s;
  const kinds = ok.map((n) => s.wave.find((x) => x.id === n)!.kind);
  const fruit = kinds.filter((k) => k !== 'bomb').length;
  const pts = kinds.reduce((t, k) => t + FRUIT_POINTS[k], 0) + Math.max(0, fruit - 2);
  const bombs = kinds.length - fruit;
  const fr = s.fr;
  return {
    ...s,
    fr: {
      ...fr,
      scores: { ...fr.scores, [id]: (fr.scores[id] ?? 0) + pts },
      sliced: { ...fr.sliced, [id]: [...(fr.sliced[id] ?? []), ...ok] },
      combo: { ...fr.combo, [id]: Math.max(fr.combo[id] ?? 0, fruit) },
      bombs: { ...fr.bombs, [id]: (fr.bombs[id] ?? 0) + bombs },
    },
  };
}

function tick(prev: Sim): Sim {
  const now = Date.now();
  const s = { ...prev, fr: { ...prev.fr, now } };
  if (s.fr.phase === 'countdown' && now >= s.fr.startsAt) return { ...s, fr: { ...s.fr, phase: 'play' } };
  if (s.fr.phase !== 'play') return s;
  if (now >= s.fr.endsAt) return { ...s, fr: { ...s.fr, phase: 'over' } };
  const elapsed = now - s.fr.startsAt;
  let n = s;
  for (const [id, list] of Object.entries(s.plan)) {
    const due = list.filter(([, t]) => t <= elapsed);
    if (!due.length) continue;
    n = { ...n, plan: { ...n.plan, [id]: list.filter(([, t]) => t > elapsed) } };
    n = slice(n, id, due.map(([f]) => f), elapsed);
  }
  return n;
}

function finished(ids: string[]): Sim {
  const s = start(ids);
  const scores = Object.fromEntries(ids.map((id, i) => [id, [42, 37, 37, 18][i]]));
  const sliced = Object.fromEntries(ids.map((id, i) => [id, s.wave.slice(0, [40, 33, 35, 19][i]).map((f) => f.id)]));
  return { ...s, fr: { ...s.fr, phase: 'over', scores, sliced, combo: Object.fromEntries(ids.map((id, i) => [id, [5, 3, 4, 2][i]])), bombs: Object.fromEntries(ids.map((id, i) => [id, [0, 1, 0, 2][i]])) } };
}

export function FruitPreview({ auth }: { auth: Auth }) {
  const arg = new URLSearchParams(location.search).get('fruitPreview') ?? '';
  const count = ['2', '3'].includes(arg) ? Number(arg) : 4;
  const ids = ['me', 'b1', 'b2', 'b3'].slice(0, count);
  const [sim, setSim] = useState<Sim>(() => (arg === 'over' ? finished(ids) : start(ids)));
  const ref = useRef(sim);
  ref.current = sim;

  useEffect(() => {
    const t = window.setInterval(() => setSim((s) => tick(s)), 100);
    return () => window.clearInterval(t);
  }, []);

  const actions = new Proxy({} as Actions, {
    get: (_, key) =>
      key === 'gameMove' || key === 'gameMoveQuiet'
        ? async (m: PluggedMove) => {
            // a little network lag, like the real thing
            if (m.kind === 'fruit') window.setTimeout(() => setSim((s) => slice(s, 'me', m.move.ids, m.move.at)), 60);
            return true;
          }
        : key === 'rematch'
          ? async () => setSim(start(ids))
          : async () => null,
  });
  const players = ids.map((id, i) => player(id, NAMES[i], i > 0));
  const over = sim.fr.phase === 'over';
  const top = Math.max(...ids.map((id) => sim.fr.scores[id] ?? 0));
  const winners = over ? ids.filter((id) => sim.fr.scores[id] === top) : [];
  const view = {
    code: 'FRUIT', meId: 'me', hostId: 'me', phase: over ? 'over' : 'playing', players, watchers: [], leftPlayers: [], turnId: null, turnMsLeft: null,
    config: { game: 'fruit', stake: 0, opts: { time: SECONDS }, turnTimer: false, voice: false, teams: false },
    watchRequests: [], winnerIds: winners, loserIds: over ? ids.filter((id) => !winners.includes(id)) : [], teams: null, slots: null, swapAsks: [], coinResults: null, stopped: false, awards: [],
    plugged: { kind: 'fruit', fruit: sim.fr }, crazy7: null, rang: null, hand: [], pileCount: 0, pileTopBy: [], passedIds: [], endedEarly: false,
  } as unknown as RoomView;
  return <FruitTable view={view} actions={actions} bubbles={[]} auth={auth} />;
}
