import { useEffect, useRef, useState } from 'react';
import { COLORWAR_BURST, COLORWAR_FIRST, type ColorWarCell, type ColorWarView, type PluggedMove, type PublicPlayer, type RoomView } from '../../types';
import type { Auth } from '../../useAuth';
import type { Actions } from '../../useBluff';
import { ColorWarTable } from './ColorWarTable';
import { neighbours } from './useBursts';

// Dev only (?colorwarPreview=1): a local Colour Wars game against 3 bots, no server. ?colorwarPreview=over shows the podium; ?colorwarSize=7

const IDS = ['me', 'b1', 'b2', 'b3'];
const player = (id: string, name: string, bot: boolean): PublicPlayer =>
  ({
    id,
    name,
    avatar: null,
    back: 'classic',
    table: 'classic',
    cardCount: 0,
    handValue: null,
    connected: true,
    place: null,
    registered: true,
    coins: 5000,
    username: null,
    level: 20,
    bot,
    ready: true,
    saza: null,
  }) as PublicPlayer;

function startView(): ColorWarView {
  const size = Number(new URLSearchParams(location.search).get('colorwarSize')) || 5;
  const cells: ColorWarCell[] = Array.from({ length: size * size }, () => ({
    owner: null,
    dots: 0,
  }));
  return {
    size,
    cells,
    turnId: 'me',
    firstMove: [...IDS],
    alive: [...IDS],
    last: null,
    places: {},
  };
}

function tap(cv: ColorWarView, cell: number): ColorWarView {
  const pid = cv.turnId!;
  const first = cv.firstMove.includes(pid);
  const c = cv.cells[cell];
  if (first ? c.owner !== null : c.owner !== pid) return cv;
  const cells = cv.cells.map((x) => ({ ...x }));
  cells[cell] = first ? { owner: pid, dots: COLORWAR_FIRST } : { owner: pid, dots: c.dots + 1 };
  const waves: number[][] = [];
  for (let k = 0; k < 200; k++) {
    const wave = cells.map((x, i) => (x.dots >= COLORWAR_BURST ? i : -1)).filter((i) => i >= 0);
    if (!wave.length || new Set(cells.filter((x) => x.owner).map((x) => x.owner)).size <= 1) break;
    waves.push(wave);
    wave.forEach((b) => (cells[b] = { owner: null, dots: 0 }));
    wave.forEach((b) => neighbours(cv.size, b).forEach((n) => (cells[n] = { owner: pid, dots: cells[n].dots + 1 })));
  }
  const firstMove = cv.firstMove.filter((id) => id !== pid);
  const places = { ...cv.places };
  const alive = cv.alive.filter((id) => firstMove.includes(id) || cells.some((x) => x.owner === id));
  cv.alive.filter((id) => !alive.includes(id)).forEach((id) => (places[id] = cv.alive.length - Object.keys(places).length));
  if (alive.length === 1) places[alive[0]] = 1;
  const i = IDS.indexOf(pid);
  const turnId = alive.length <= 1 ? null : ([1, 2, 3, 4].map((k) => IDS[(i + k) % 4]).find((id) => alive.includes(id)) ?? null);
  return {
    ...cv,
    cells,
    firstMove,
    alive,
    places,
    turnId,
    last: { seq: (cv.last?.seq ?? 0) + 1, playerId: pid, cell, waves },
  };
}

/** a bot bursts into others when it can, else grows its fullest cell */
function botTap(cv: ColorWarView): number {
  const pid = cv.turnId!;
  if (cv.firstMove.includes(pid)) {
    const empty = cv.cells.map((c, i) => (c.owner === null ? i : -1)).filter((i) => i >= 0);
    return empty[Math.floor(Math.random() * empty.length)];
  }
  const mine = cv.cells.map((c, i) => (c.owner === pid ? i : -1)).filter((i) => i >= 0);
  const score = (i: number) => {
    const after = tap(cv, i);
    return after.cells.filter((c) => c.owner === pid).length + Math.random() * 2;
  };
  return mine.sort((a, b) => score(b) - score(a))[0];
}

export function ColorWarPreview({ auth }: { auth: Auth }) {
  const [cv, setCv] = useState(startView);
  const ref = useRef(cv);
  ref.current = cv;
  const over = new URLSearchParams(location.search).get('colorwarPreview') === 'over';

  useEffect(() => {
    if (over || !cv.turnId || cv.turnId === 'me') return;
    const waves = cv.last?.waves.length ?? 0;
    const t = window.setTimeout(() => setCv((v) => tap(v, botTap(v))), 900 + waves * 440);
    return () => window.clearTimeout(t);
  }, [cv]);

  const actions = new Proxy({} as Actions, {
    get: (_, key) =>
      key === 'gameMove'
        ? async (m: PluggedMove) => {
            if (ref.current.turnId === 'me' && m.kind === 'colorwar') setCv(tap(ref.current, m.move.cell));
            return true;
          }
        : async () => null,
  });
  const players = [player('me', 'Ravi', false), player('b1', 'Priya', true), player('b2', 'Raju', true), player('b3', 'Meera', true)];
  const finished = over || (cv.turnId === null && cv.last !== null);
  const shown: ColorWarView = over
    ? {
        ...cv,
        turnId: null,
        alive: ['me'],
        places: { me: 1, b2: 2, b1: 3, b3: 4 },
        cells: cv.cells.map((c, i) => (i % 3 ? { owner: 'me', dots: 1 + (i % 3) } : c)),
      }
    : cv;
  const winner = Object.keys(shown.places).find((id) => shown.places[id] === 1);
  if (finished) players.forEach((p) => (p.place = shown.places[p.id] ?? null));
  const view = {
    code: 'RANGO',
    meId: 'me',
    hostId: 'me',
    phase: finished ? 'over' : 'playing',
    players,
    watchers: [],
    leftPlayers: [],
    turnId: shown.turnId,
    turnMsLeft: null,
    config: {
      game: 'colorwar',
      stake: 500,
      opts: { size: shown.size },
      turnTimer: false,
      voice: false,
      teams: false,
    },
    watchRequests: [],
    winnerIds: finished && winner ? [winner] : [],
    loserIds: finished ? IDS.filter((id) => id !== winner) : [],
    teams: null,
    slots: null,
    swapAsks: [],
    coinResults: null,
    stopped: false,
    awards: [],
    plugged: { kind: 'colorwar', colorwar: shown },
    crazy7: null,
    rang: null,
    hand: [],
    pileCount: 0,
    pileTopBy: [],
    passedIds: [],
    endedEarly: false,
  } as unknown as RoomView;
  return <ColorWarTable view={view} actions={actions} bubbles={[]} auth={auth} />;
}
