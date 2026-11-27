import { useEffect, useState } from 'react';
import { FRUIT_COLLECT_MS, FRUIT_ITEM_MS, FRUIT_ITEM_POINTS, FRUIT_MAGNET_ROUNDS, FRUIT_MIN_REACTION_MS, FRUIT_SLOW_MS, type FruitItemKind, type FruitView, type PluggedMove, type PublicPlayer, type RoomView } from '../../types';
import type { Auth } from '../../useAuth';
import type { Actions } from '../../useBluff';
import { FruitTable } from './FruitTable';

// Dev only (?fruitPreview=1): a local Fruit Slice Duel against bots, no server needed.
// ?fruitPreview=2 / =3 plays with fewer seats; ?fruitPreview=over shows the podium; =magnet makes every other item a magnet.

const NAMES = ['Ravi', 'Asha', 'Bina', 'Meera'];
/** bots by level: reaction range (ms) and how often they strike a magnet by mistake */
const BOTS: Record<string, { min: number; max: number; oops: number }> = {
  b1: { min: 430, max: 760, oops: 0.18 },
  b2: { min: 320, max: 560, oops: 0.09 },
  b3: { min: 250, max: 420, oops: 0.04 },
};
const ROUNDS = 15;
const FRUITS: Exclude<FruitItemKind, 'magnet'>[] = ['apple', 'orange', 'melon', 'banana', 'mango', 'grapes'];
const RESULT_MS = 1200;
const player = (id: string, name: string, bot: boolean): PublicPlayer =>
  ({ id, name, avatar: null, back: 'classic', table: 'classic', cardCount: 0, handValue: null, connected: true, place: null, registered: true, coins: 5000, username: null, level: 20, bot, ready: true, saza: null }) as PublicPlayer;

interface Sim {
  fr: FruitView;
  ids: string[];
  magnets: boolean;
  /** when the next item shows (server time), or when the current one is resolved */
  nextAt: number;
  closeAt: number;
  /** strikes in for the item up now: adjusted reaction per player */
  strikes: Record<string, number>;
  /** bots' planned strike times for the item up now */
  plan: Record<string, number>;
}

const gap = () => 1000 + Math.random() * 1600;

function start(ids: string[], magnets: boolean): Sim {
  const startsAt = Date.now() + 3000;
  const zero = Object.fromEntries(ids.map((id) => [id, 0]));
  return {
    ids, magnets, nextAt: startsAt + gap(), closeAt: 0, strikes: {}, plan: {},
    fr: { phase: 'countdown', round: 0, rounds: ROUNDS, item: null, result: null, scores: zero, slow: { ...zero }, startsAt, now: Date.now() },
  };
}

/** a new item: about a quarter magnets, never two magnets in a row */
function show(s: Sim, now: number): Sim {
  const lastMag = s.fr.result?.kind === 'magnet';
  const kind: FruitItemKind = !lastMag && (s.magnets ? s.fr.round % 2 === 1 : Math.random() < 0.25) ? 'magnet' : FRUITS[Math.floor(Math.random() * FRUITS.length)];
  const round = s.fr.round + 1;
  const plan: Record<string, number> = {};
  for (const id of s.ids.slice(1)) {
    const b = BOTS[id];
    if (kind === 'magnet' && Math.random() > b.oops) continue;
    plan[id] = now + b.min + Math.random() * (b.max - b.min);
  }
  return { ...s, strikes: {}, plan, closeAt: now + FRUIT_ITEM_MS, fr: { ...s.fr, round, item: { round, kind, shownAt: now } } };
}

/** the server's check: one strike each, human-fast, never longer than the item has been up */
function strike(s: Sim, id: string, round: number, reaction: number, now: number): Sim {
  const item = s.fr.item;
  if (!item || item.round !== round || id in s.strikes || reaction < FRUIT_MIN_REACTION_MS || reaction > now - item.shownAt + 30) return s;
  const adj = reaction + ((s.fr.slow[id] ?? 0) > 0 ? FRUIT_SLOW_MS : 0);
  const first = Object.keys(s.strikes).length === 0;
  return { ...s, strikes: { ...s.strikes, [id]: adj }, closeAt: first ? Math.min(s.closeAt, now + FRUIT_COLLECT_MS) : s.closeAt };
}

function resolve(s: Sim, now: number): Sim {
  const item = s.fr.item!;
  const fr = s.fr;
  const entries = Object.entries(s.strikes).sort((a, b) => a[1] - b[1]);
  const winner = item.kind !== 'magnet' && entries.length ? entries[0][0] : null;
  const slowed = item.kind === 'magnet' ? entries.map(([id]) => id) : [];
  const slow = Object.fromEntries(s.ids.map((id) => [id, slowed.includes(id) ? FRUIT_MAGNET_ROUNDS : Math.max(0, (fr.slow[id] ?? 0) - 1)]));
  const scores = winner && item.kind !== 'magnet' ? { ...fr.scores, [winner]: (fr.scores[winner] ?? 0) + FRUIT_ITEM_POINTS[item.kind] } : fr.scores;
  const reactions = Object.fromEntries(s.ids.map((id) => [id, s.strikes[id] ?? null]));
  const last = fr.round >= fr.rounds;
  return {
    ...s,
    nextAt: now + RESULT_MS + gap(),
    fr: { ...fr, item: null, result: { round: item.round, kind: item.kind, winner, reactions, slowed }, scores, slow, phase: last ? 'over' : 'play' },
  };
}

function tick(prev: Sim): Sim {
  const now = Date.now();
  let s: Sim = { ...prev, fr: { ...prev.fr, now } };
  if (s.fr.phase === 'countdown') return now >= s.fr.startsAt ? { ...s, fr: { ...s.fr, phase: 'play' } } : s;
  if (s.fr.phase !== 'play') return s;
  if (!s.fr.item) return now >= s.nextAt ? show(s, now) : s;
  for (const [id, at] of Object.entries(s.plan)) if (at <= now) s = strike({ ...s, plan: Object.fromEntries(Object.entries(s.plan).filter(([k]) => k !== id)) }, id, s.fr.item!.round, Math.round(at - s.fr.item!.shownAt), now);
  return now >= s.closeAt ? resolve(s, now) : s;
}

function finished(ids: string[]): Sim {
  const s = start(ids, false);
  const scores = Object.fromEntries(ids.map((id, i) => [id, [14, 11, 11, 6][i]]));
  return { ...s, fr: { ...s.fr, phase: 'over', round: ROUNDS, scores, result: { round: ROUNDS, kind: 'melon', winner: 'me', reactions: Object.fromEntries(ids.map((id, i) => [id, 260 + i * 70])), slowed: [] } } };
}

export function FruitPreview({ auth }: { auth: Auth }) {
  const arg = new URLSearchParams(location.search).get('fruitPreview') ?? '';
  const count = ['2', '3'].includes(arg) ? Number(arg) : 4;
  const ids = ['me', 'b1', 'b2', 'b3'].slice(0, count);
  const [sim, setSim] = useState<Sim>(() => (arg === 'over' ? finished(ids) : start(ids, arg === 'magnet')));

  useEffect(() => {
    const t = window.setInterval(() => setSim((s) => tick(s)), 40);
    return () => window.clearInterval(t);
  }, []);

  const actions = new Proxy({} as Actions, {
    get: (_, key) =>
      key === 'gameMove' || key === 'gameMoveQuiet'
        ? async (m: PluggedMove) => {
            // a little network lag, like the real thing
            if (m.kind === 'fruit') {
              const { round, reaction } = m.move;
              window.setTimeout(() => setSim((s) => strike(s, 'me', round, reaction, Date.now())), 60);
            }
            return true;
          }
        : key === 'rematch'
          ? async () => setSim(start(ids, arg === 'magnet'))
          : async () => null,
  });
  const players = ids.map((id, i) => player(id, NAMES[i], i > 0));
  const over = sim.fr.phase === 'over';
  const top = Math.max(...ids.map((id) => sim.fr.scores[id] ?? 0));
  const winners = over ? ids.filter((id) => sim.fr.scores[id] === top) : [];
  const view = {
    code: 'FRUIT', meId: 'me', hostId: 'me', phase: over ? 'over' : 'playing', players, watchers: [], leftPlayers: [], turnId: null, turnMsLeft: null,
    config: { game: 'fruit', stake: 0, opts: { rounds: ROUNDS }, turnTimer: false, voice: false, teams: false },
    watchRequests: [], winnerIds: winners, loserIds: over ? ids.filter((id) => !winners.includes(id)) : [], teams: null, slots: null, swapAsks: [], coinResults: null, stopped: false, awards: [],
    plugged: { kind: 'fruit', fruit: sim.fr }, crazy7: null, rang: null, hand: [], pileCount: 0, pileTopBy: [], passedIds: [], endedEarly: false,
  } as unknown as RoomView;
  return <FruitTable view={view} actions={actions} bubbles={[]} auth={auth} />;
}
