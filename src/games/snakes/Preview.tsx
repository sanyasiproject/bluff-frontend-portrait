import { useEffect, useRef, useState } from 'react';
import { LADDERS, SNAKES, SNAKES_BITE_BACK, SNAKES_COLORS, SNAKES_GOAL, type PluggedMove, type PublicPlayer, type RoomView, type SnakesView } from '../../types';
import type { Auth } from '../../useAuth';
import type { Actions } from '../../useBluff';
import { moveMs } from './geometry';
import { SnakesTable } from './SnakesTable';

// Dev only (?snakesPreview=1): a local Saanp Seedhi game against 3 bots, no server. window.snakesRoll = 6 forces the next roll.
// ?snakesPreview=over shows the podium.

const IDS = ['me', 'b1', 'b2', 'b3'];
const player = (id: string, name: string, bot: boolean): PublicPlayer =>
  ({ id, name, avatar: null, back: 'classic', table: 'classic', cardCount: 0, handValue: null, connected: true, place: null, registered: true, coins: 5000, username: null, level: 20, bot, ready: true, saza: null }) as PublicPlayer;

function startView(): SnakesView {
  const pos = [15, 26, 93, 0];
  return {
    turnId: 'me', dice: null, rollSeq: 0, sixes: 0, last: null, rules: { exact: true, six: true, bonus: true, bite: true },
    seats: IDS.map((id, i) => ({ playerId: id, color: SNAKES_COLORS[i], pos: pos[i], place: null, ladders: 0, snakes: 0, bites: 0 })),
  };
}

const nextTurn = (sv: SnakesView): string => {
  const live = sv.seats.filter((s) => s.place === null);
  const i = IDS.indexOf(sv.turnId!);
  for (let k = 1; k <= 4; k++) {
    const id = IDS[(i + k) % 4];
    if (live.some((s) => s.playerId === id)) return id;
  }
  return sv.turnId!;
};

function roll(sv: SnakesView): SnakesView {
  const w = window as unknown as { snakesRoll?: number; snakesAt?: number };
  const dice = w.snakesRoll ?? 1 + Math.floor(Math.random() * 6);
  delete w.snakesRoll;
  // window.snakesAt = 97 puts the roller there first, to try bounces and bites
  if (w.snakesAt !== undefined) sv = { ...sv, seats: sv.seats.map((s) => (s.playerId === sv.turnId ? { ...s, pos: w.snakesAt! } : s)) };
  delete w.snakesAt;
  const sixes = dice === 6 ? sv.sixes + 1 : 0;
  const base = { ...sv, dice, rollSeq: sv.rollSeq + 1, sixes };
  if (sixes === 3) return { ...base, turnId: nextTurn(base) };
  const seats = sv.seats.map((s) => ({ ...s }));
  const me = seats.find((s) => s.playerId === sv.turnId)!;
  const from = me.pos;
  if (from === 0 && sv.rules.six && dice !== 6) return { ...base, sixes: 0, turnId: nextTurn(base) };
  let landed = from === 0 && sv.rules.six ? 1 : from + dice;
  let bounced = false;
  if (landed > SNAKES_GOAL) {
    if (sv.rules.exact) {
      landed = 2 * SNAKES_GOAL - landed;
      bounced = true;
    } else landed = SNAKES_GOAL;
  }
  let to = landed;
  let via: NonNullable<SnakesView['last']>['via'] = null;
  if (SNAKES[landed]) {
    to = SNAKES[landed];
    via = { kind: 'snake', from: landed, to };
    me.snakes++;
  } else if (LADDERS[landed]) {
    to = LADDERS[landed];
    via = { kind: 'ladder', from: landed, to };
    me.ladders++;
  }
  me.pos = to;
  const bitten: NonNullable<SnakesView['last']>['bitten'] = [];
  if (sv.rules.bite && to !== SNAKES_GOAL)
    for (const s of seats)
      if (s !== me && s.pos === to) {
        bitten.push({ playerId: s.playerId, from: to, to: Math.max(1, to - SNAKES_BITE_BACK) });
        s.pos = Math.max(1, to - SNAKES_BITE_BACK);
        me.bites++;
      }
  if (to === SNAKES_GOAL) me.place = seats.filter((s) => s.place !== null).length + 1;
  const bonus = sv.rules.bonus && dice === 6 && to !== SNAKES_GOAL;
  const last = { seq: (sv.last?.seq ?? 0) + 1, playerId: me.playerId, roll: dice, from, landed, to, bounced, via, bitten, bonus };
  const after = { ...base, seats, last, sixes: bonus ? sixes : 0 };
  return bonus ? after : { ...after, turnId: nextTurn(after) };
}

export function SnakesPreview({ auth }: { auth: Auth }) {
  const [sv, setSv] = useState(startView);
  const ref = useRef(sv);
  ref.current = sv;
  const over = new URLSearchParams(location.search).get('snakesPreview') === 'over';

  // bots roll after the last move has played out
  useEffect(() => {
    if (over || sv.turnId === 'me' || sv.seats.filter((s) => s.place === null).length < 2) return;
    const wait = 1100 + (sv.last ? moveMs(sv.last) : 0);
    const t = window.setTimeout(() => setSv((v) => roll(v)), wait);
    return () => window.clearTimeout(t);
  }, [sv]);

  const actions = new Proxy({} as Actions, {
    get: (_, key) =>
      key === 'gameMove'
        ? async (m: PluggedMove) => {
            if (ref.current.turnId === 'me' && m.kind === 'snakes') setSv(roll(ref.current));
            return true;
          }
        : async () => null,
  });
  const players = [player('me', 'Ravi', false), player('b1', 'Priya', true), player('b2', 'Raju', true), player('b3', 'Meera', true)];
  players[1].ludoLook = { board: 'classic', goti: 'marble', dice: 'neon' };
  players[2].ludoLook = { board: 'classic', goti: 'gem', dice: 'ruby' };
  players[3].ludoLook = { board: 'classic', goti: 'crown', dice: 'jade' };
  const shown: SnakesView = over
    ? { ...sv, turnId: null, seats: sv.seats.map((s, i) => ({ ...s, pos: [100, 64, 100, 41][i], place: [1, null, 2, null][i], ladders: [3, 1, 2, 0][i], snakes: [1, 3, 0, 2][i], bites: [1, 0, 2, 0][i] })) }
    : sv;
  if (over) players.forEach((p, i) => (p.place = [1, 3, 2, 4][i]));
  const view = {
    code: 'SAANP', meId: 'me', hostId: 'me', phase: over ? 'over' : 'playing', players, watchers: [], leftPlayers: [], turnId: sv.turnId, turnMsLeft: null,
    config: { game: 'snakes', stake: 500, opts: {}, turnTimer: false, voice: false, teams: false },
    watchRequests: [], winnerIds: over ? ['me'] : [], loserIds: over ? ['b1', 'b2', 'b3'] : [], teams: null, slots: null, swapAsks: [], coinResults: null, stopped: false, awards: [],
    plugged: { kind: 'snakes', snakes: shown }, crazy7: null, rang: null, hand: [], pileCount: 0, pileTopBy: [], passedIds: [], endedEarly: false,
  } as unknown as RoomView;
  return <SnakesTable view={view} actions={actions} bubbles={[]} auth={auth} />;
}
