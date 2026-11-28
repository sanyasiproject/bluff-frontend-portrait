import { useEffect, useRef, useState } from 'react';
import type { PluggedMove, PublicPlayer, RoomView } from '../../types';
import type { Auth } from '../../useAuth';
import type { Actions } from '../../useBluff';
import { botMove, ChessGame, type ChessVariant, type Color } from './lib';
import type { ChessView } from './contract';
import { ChessTable } from './ChessTable';
import { speedOf } from './catalog';
import { ChessPreviewPage } from './PreviewPages';

// Dev only (?chessPreview=1): a local game against a bot, no server. =over the end sheet, =watch two bots with the
// watcher engine, =lobby / =analysis / =profile those screens. ?chessVariant=atomic, ?chessTime=3+2, ?chessFen=<start>

// App hands over the address it started with (the app may tidy the address bar before this chunk loads)
let q = new URLSearchParams(location.search);
let MODE = q.get('chessPreview') ?? '1';
let VARIANT = (q.get('chessVariant') ?? 'standard') as ChessVariant;
let TIME = q.get('chessTime') ?? '3+2';
let FEN = q.get('chessFen') ?? undefined;

const player = (id: string, name: string, bot: boolean): PublicPlayer =>
  ({ id, name, avatar: null, back: 'classic', table: 'classic', cardCount: 0, handValue: null, connected: true, place: null, registered: !bot, coins: 5000, username: null, level: 20, bot, ready: true, saza: null }) as PublicPlayer;

interface Local {
  game: ChessGame;
  clock: { w: number; b: number; since: number | null };
  over: ChessView['result'];
}

function startLocal(): Local {
  const [m, inc] = TIME.split('+').map(Number);
  const ms = TIME === 'none' ? 0 : m * 60000;
  const game = new ChessGame(VARIANT, FEN);
  if (!FEN && (MODE === 'over' || MODE === 'watch')) for (const u of ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4', 'g8f6']) game.play(game.position().parseUci(u)!);
  void inc;
  return { game, clock: { w: ms, b: ms, since: null }, over: MODE === 'over' ? { winner: 'w', reason: 'checkmate' } : undefined };
}

function readQuery(search: string) {
  q = new URLSearchParams(search);
  MODE = q.get('chessPreview') ?? '1';
  VARIANT = (q.get('chessVariant') ?? 'standard') as ChessVariant;
  TIME = q.get('chessTime') ?? '3+2';
  FEN = q.get('chessFen') ?? undefined;
}

export function ChessPreview({ auth, query }: { auth: Auth; query: string }) {
  if (query) readQuery(query);
  if (['lobby', 'analysis', 'profile'].includes(MODE)) return <ChessPreviewPage mode={MODE} auth={auth} />;
  return <TablePreview auth={auth} />;
}

function TablePreview({ auth }: { auth: Auth }) {
  const [local, setLocal] = useState(startLocal);
  const ref = useRef(local);
  ref.current = local;
  const inc = TIME === 'none' ? 0 : (Number(TIME.split('+')[1]) || 0) * 1000;
  const watch = MODE === 'watch';
  const bots: Partial<Record<Color, number>> = watch ? { w: 6, b: 3 } : { b: 3 };

  const apply = (l: Local, uci: string): Local => {
    const pos = l.game.position();
    const m = pos.parseUci(uci);
    if (!m || !pos.isLegal(m) || l.over) return l;
    const game = new ChessGame(VARIANT, FEN);
    for (const x of l.game.moves) game.play(x);
    game.play(m);
    const now = Date.now();
    const c = { ...l.clock };
    if (c.since !== null && TIME !== 'none') c[pos.turn] = Math.max(0, c[pos.turn] - (now - c.since) + inc);
    c.since = game.moves.length >= 2 ? now : null;
    const out = game.position().outcome();
    return { game, clock: c, over: out ?? undefined };
  };

  // the bot side answers after a short think
  useEffect(() => {
    const pos = local.game.position();
    if (local.over || MODE === 'over' || !bots[pos.turn]) return;
    const id = window.setTimeout(() => {
      const p = ref.current.game.position();
      const m = botMove(p, [], 3, Math.random);
      setLocal((l) => apply(l, p.uci(m)));
    }, watch ? 1400 : 700);
    return () => window.clearTimeout(id);
  }, [local]);

  const actions = new Proxy({} as Actions, {
    get: (_, key) =>
      key === 'gameMove'
        ? async (pm: PluggedMove) => {
            if (pm.kind !== 'chess') return false;
            const mv = pm.move;
            if (mv.type === 'move') setLocal((l) => apply(l, mv.uci));
            if (mv.type === 'resign') setLocal((l) => ({ ...l, over: { winner: 'b', reason: 'resign' } }));
            if (mv.type === 'abort') setLocal((l) => ({ ...l, over: { winner: null, reason: 'abort' } }));
            if (mv.type === 'draw' && mv.offer) setLocal((l) => ({ ...l, over: { winner: null, reason: 'agreement' } }));
            return true;
          }
        : async () => null,
  });

  const g = local.game;
  const pos = g.position();
  const finished = !!local.over;
  const ids = watch ? { w: 'b1', b: 'b2' } : { w: 'me', b: 'b2' };
  const cv: ChessView = {
    variant: VARIANT,
    time: TIME,
    speed: speedOf(TIME),
    fen: pos.fen(),
    initialFen: g.positionAt(0).fen(),
    moves: g.moves.map((m, i) => g.positionAt(i).uci(m)),
    sans: g.sanList(),
    turn: pos.turn,
    lastMove: g.moves.length ? g.positionAt(g.moves.length - 1).uci(g.moves[g.moves.length - 1]) : null,
    players: ids,
    bots,
    clock: TIME === 'none' ? null : { w: local.clock.w, b: local.clock.b, runningSince: finished ? null : local.clock.since, inc },
    abortAt: g.moves.length < 2 && !finished ? Date.now() + 30000 : null,
    checks: pos.checks() ?? undefined,
    pockets: pos.pockets() ?? undefined,
    check: pos.inCheck(),
    status: finished ? 'over' : 'playing',
    result: local.over,
    rated: true,
    perf: VARIANT === 'standard' ? (speedOf(TIME) === 'untimed' ? 'blitz' : (speedOf(TIME) as 'blitz')) : VARIANT,
    ratings: { w: { r: 812, rd: 90, prov: false }, b: { r: 1400, rd: 220, prov: true } },
    ratingDiff: finished ? { w: 14, b: -14 } : undefined,
    gameId: finished ? 'preview-game' : undefined,
    now: Date.now(),
    opening: { eco: 'C50', name: 'Italian Game' },
  };
  const players = watch ? [player('b1', 'Raju', true), player('b2', 'Meera', true)] : [player('me', 'Ravi', false), player('b2', 'Meera', true)];
  const view = {
    code: 'CHESS',
    meId: watch ? 'viewer' : 'me',
    hostId: 'me',
    phase: finished ? 'over' : 'playing',
    players,
    watchers: [],
    leftPlayers: [],
    turnId: ids[pos.turn],
    turnMsLeft: null,
    config: { game: 'chess', stake: 0, opts: { variant: VARIANT, time: TIME }, turnTimer: false, voice: false, teams: false },
    watchRequests: [],
    winnerIds: finished && local.over?.winner ? [ids[local.over.winner]] : [],
    loserIds: finished && local.over?.winner ? [ids[local.over.winner === 'w' ? 'b' : 'w']] : [],
    teams: null,
    slots: null,
    swapAsks: [],
    coinResults: null,
    stopped: false,
    awards: [],
    plugged: { kind: 'chess', chess: cv },
    crazy7: null,
    rang: null,
    hand: [],
    pileCount: 0,
    pileTopBy: [],
    passedIds: [],
    endedEarly: false,
  } as unknown as RoomView;
  return <ChessTable view={view} actions={actions} bubbles={[]} auth={auth} />;
}
