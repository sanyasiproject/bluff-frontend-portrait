import { useEffect, useRef, useState } from 'react';
import { LUDO_BASE, LUDO_HOME, LUDO_LAST_RING, ludoIsSafe, ludoRingOf, type LudoView, type PluggedMove, type PublicPlayer, type RoomView } from '../../types';
import type { Auth } from '../../useAuth';
import type { Actions } from '../../useBluff';
import { LudoTable } from './LudoTable';

// Dev only (?ludoPreview=1): a local Ludo game against 3 simple bots, to see the table without a server.
// window.ludoRoll = 6 forces the next roll.

const IDS = ['me', 'b1', 'b2', 'b3'];
const player = (id: string, name: string, bot: boolean): PublicPlayer =>
  ({ id, name, avatar: null, back: 'classic', table: 'classic', cardCount: 0, handValue: null, connected: true, place: null, registered: true, coins: 5000, username: null, level: 20, bot, ready: true, saza: null }) as PublicPlayer;

function startView(): LudoView {
  const toks = [[-1, 10, 48, 53], [5, -1, -1, 20], [30, -1, 56, 2], [-1, 12, 40, -1]];
  const colors = ['red', 'green', 'yellow', 'blue'] as const;
  return {
    mode: 'master', turnId: 'me', dice: null, rollSeq: 0, rolled: false, movable: [], sixes: 0, movesFor: null, last: null, endsAt: null, teams: null, kills: [],
    seats: IDS.map((id, i) => ({ playerId: id, color: colors[i], tokens: toks[i], kills: 0, home: toks[i].filter((p) => p === LUDO_HOME).length, place: null, score: 0, unlocked: i !== 1 })),
  };
}

const legal = (ld: LudoView, roll: number) => {
  const s = ld.seats.find((x) => x.playerId === ld.turnId)!;
  return s.tokens.flatMap((p, t) => ((p <= LUDO_BASE ? roll === 6 : p + roll <= LUDO_HOME && (s.unlocked || p + roll <= LUDO_LAST_RING)) ? [t] : []));
};
/** a roll with no move: the turn passes after a moment */
let passSeq = -1;
const nextTurn = (ld: LudoView): LudoView => ({ ...ld, turnId: IDS[(IDS.indexOf(ld.turnId!) + 1) % 4], rolled: false, movable: [], sixes: 0 });

function roll(ld: LudoView): LudoView {
  const w = window as unknown as { ludoRoll?: number };
  const dice = w.ludoRoll ?? 1 + Math.floor(Math.random() * 6);
  delete w.ludoRoll;
  const sixes = dice === 6 ? ld.sixes + 1 : 0;
  const rolled = { ...ld, dice, rollSeq: ld.rollSeq + 1, sixes };
  if (sixes === 3) return { ...nextTurn(rolled), dice };
  const movable = legal(rolled, dice);
  if (movable.length === 0) passSeq = rolled.rollSeq;
  return movable.length === 0 ? rolled : { ...rolled, rolled: true, movable };
}

function move(ld: LudoView, token: number): LudoView {
  const seats = ld.seats.map((s) => ({ ...s, tokens: [...s.tokens] }));
  const me = seats.find((s) => s.playerId === ld.turnId)!;
  const from = me.tokens[token];
  const to = from <= LUDO_BASE ? 0 : from + ld.dice!;
  me.tokens[token] = to;
  const captured: NonNullable<LudoView['last']>['captured'] = [];
  const ring = ludoRingOf(me.color, to);
  if (ring !== null && !ludoIsSafe(ring)) {
    for (const s of seats) {
      if (s === me) continue;
      s.tokens.forEach((p, t) => {
        if (ludoRingOf(s.color, p) === ring) {
          captured.push({ playerId: s.playerId, color: s.color, token: t, from: p });
          s.tokens[t] = LUDO_BASE;
        }
      });
    }
  }
  me.kills += captured.length;
  if (captured.length) me.unlocked = true;
  const home = to === LUDO_HOME;
  me.home = me.tokens.filter((p) => p === LUDO_HOME).length;
  const bonus = ld.dice === 6 || captured.length > 0 || home;
  const kills = [...ld.kills, ...captured.map((c) => ({ by: me.playerId, victim: c.playerId, at: Date.now() }))];
  const last = { seq: (ld.last?.seq ?? 0) + 1, playerId: me.playerId, color: me.color, token, from, to, roll: ld.dice!, captured, home, bonus };
  const after = { ...ld, seats, kills, last, rolled: false, movable: [] };
  return bonus ? after : nextTurn(after);
}

export function LudoPreview({ auth }: { auth: Auth }) {
  const [ld, setLd] = useState(startView);
  const ref = useRef(ld);
  ref.current = ld;

  // bots: roll, then move (kills first, else the furthest goti); everyone: no move passes, one move plays itself
  useEffect(() => {
    const botTurn = ld.turnId !== 'me';
    let t: number | undefined;
    if (!ld.rolled && passSeq === ld.rollSeq) t = window.setTimeout(() => ((passSeq = -1), setLd((v) => nextTurn(v))), 1000);
    else if (!ld.rolled && botTurn) t = window.setTimeout(() => setLd((v) => roll(v)), 1100);
    else if (ld.rolled && (botTurn || ld.movable.length === 1)) t = window.setTimeout(() => setLd((v) => move(v, v.movable[v.movable.length - 1])), botTurn ? 1000 : 700);
    return () => window.clearTimeout(t);
  }, [ld]);

  const actions = new Proxy({} as Actions, {
    get: (_, key) =>
      key === 'gameMove'
        ? async (m: PluggedMove) => {
            const v = ref.current;
            if (v.turnId !== 'me') return false;
            if (m.move.type === 'roll' && !v.rolled) setLd(roll(v));
            if (m.move.type === 'move' && v.rolled && v.movable.includes(m.move.token)) setLd(move(v, m.move.token));
            return true;
          }
        : async () => null,
  });
  const players = [player('me', 'Ravi', false), player('b1', 'Priya', true), player('b2', 'Raju', true), player('b3', 'Meera', true)];
  // ?ludoPreview=over: the game-over podium
  const over = new URLSearchParams(location.search).get('ludoPreview') === 'over';
  const shown: LudoView = over
    ? { ...ld, turnId: null, kills: [{ by: 'me', victim: 'b1', at: 0 }, { by: 'me', victim: 'b1', at: 0 }, { by: 'b2', victim: 'me', at: 0 }], seats: ld.seats.map((s, i) => ({ ...s, place: [1, 3, 2, 4][i], kills: [2, 0, 1, 0][i] })) }
    : ld;
  // the bots' own looks, to see each seat's gotis and the turn player's dice
  players[1].ludoLook = { board: 'classic', goti: 'marble', dice: 'neon' };
  players[2].ludoLook = { board: 'classic', goti: 'gem', dice: 'ruby' };
  players[3].ludoLook = { board: 'classic', goti: 'crown', dice: 'jade' };
  if (over) players.forEach((p, i) => (p.place = [1, 3, 2, 4][i]));
  const view = {
    code: 'LUDO', meId: 'me', hostId: 'me', phase: over ? 'over' : 'playing', players, watchers: [], leftPlayers: [], turnId: ld.turnId, turnMsLeft: null,
    config: { game: 'ludo', stake: 500, opts: { mode: 'master' }, turnTimer: false, voice: false, teams: false },
    watchRequests: [], winnerIds: over ? ['me'] : [], loserIds: over ? ['b1', 'b2', 'b3'] : [], teams: null, slots: null, swapAsks: [], coinResults: null, stopped: false, awards: [],
    plugged: { kind: 'ludo', ludo: shown }, crazy7: null, rang: null, hand: [], pileCount: 0, pileTopBy: [], passedIds: [], endedEarly: false,
  } as unknown as RoomView;
  return <LudoTable view={view} actions={actions} bubbles={[]} auth={auth} />;
}
