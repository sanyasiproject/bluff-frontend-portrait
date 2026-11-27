import { useEffect, useRef, useState } from 'react';
import { DARTS_PER_TURN, dartScore, type DartsView, type PluggedMove, type PublicPlayer, type RoomView } from '../../types';
import type { Auth } from '../../useAuth';
import type { Actions } from '../../useBluff';
import { DartsTable } from './DartsTable';

// Dev only (?dartsPreview=1): a local Darts game against 3 bots, no server. ?dartsPreview=over shows the podium.
// window.dartsLeft = 40 sets my points left, to try checkouts and busts

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

const gauss = () => Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random());

function startView(): DartsView {
  const left = { me: 301, b1: 301, b2: 301, b3: 301 };
  return {
    start: 301,
    left,
    turnId: 'me',
    thrown: [],
    turnStart: 301,
    last: null,
    places: {},
  };
}

function nextTurn(dv: DartsView, from: string): string | null {
  const i = IDS.indexOf(from);
  for (let k = 1; k <= 4; k++) {
    const id = IDS[(i + k) % 4];
    if (!dv.places[id]) return id;
  }
  return null;
}

function throwDart(dv: DartsView, ax: number, ay: number): DartsView {
  const pid = dv.turnId!;
  const w = window as unknown as { dartsLeft?: number };
  if (w.dartsLeft !== undefined && pid === 'me')
    dv = {
      ...dv,
      left: { ...dv.left, me: w.dartsLeft },
      turnStart: w.dartsLeft,
    };
  delete w.dartsLeft;
  const x = ax + gauss() * 0.03;
  const y = ay + gauss() * 0.03;
  const s = dartScore(x, y);
  const was = dv.left[pid];
  const after = was - s.score;
  const bust = after < 0;
  const dart = dv.thrown.length + 1;
  const last = {
    seq: (dv.last?.seq ?? 0) + 1,
    playerId: pid,
    x,
    y,
    ...s,
    dart,
    bust,
  };
  const left = { ...dv.left, [pid]: bust ? dv.turnStart : after };
  const places = { ...dv.places };
  if (after === 0) places[pid] = Object.keys(places).length + 1;
  const next = { ...dv, left, places, last, thrown: [...dv.thrown, last] };
  if (bust || after === 0 || dart === DARTS_PER_TURN) {
    const live = IDS.filter((id) => !places[id]);
    if (live.length <= 1) {
      if (live[0]) places[live[0]] = Object.keys(places).length + 1;
      return { ...next, turnId: null, thrown: [] };
    }
    const turnId = nextTurn(next, pid);
    return {
      ...next,
      turnId,
      thrown: [],
      turnStart: turnId ? left[turnId] : 0,
    };
  }
  return next;
}

/** a bot aims at treble 20, or at what finishes it */
function botAim(left: number): [number, number] {
  if (left === 50) return [0, 0];
  const t20: [number, number] = [0, 0.605];
  if (left > 60) return t20;
  return [0.3 * gauss(), 0.4 + 0.2 * Math.random()];
}

export function DartsPreview({ auth }: { auth: Auth }) {
  const [dv, setDv] = useState(startView);
  const ref = useRef(dv);
  ref.current = dv;
  const over = new URLSearchParams(location.search).get('dartsPreview') === 'over';

  useEffect(() => {
    if (over || !dv.turnId || dv.turnId === 'me') return;
    const t = window.setTimeout(() => {
      const [x, y] = botAim(ref.current.left[ref.current.turnId!]);
      setDv((v) => throwDart(v, x + gauss() * 0.14, y + gauss() * 0.14));
    }, 1100);
    return () => window.clearTimeout(t);
  }, [dv]);

  const actions = new Proxy({} as Actions, {
    get: (_, key) =>
      key === 'gameMove'
        ? async (m: PluggedMove) => {
            if (ref.current.turnId === 'me' && m.kind === 'darts') setDv(throwDart(ref.current, m.move.x, m.move.y));
            return true;
          }
        : async () => null,
  });
  const players = [player('me', 'Ravi', false), player('b1', 'Priya', true), player('b2', 'Raju', true), player('b3', 'Meera', true)];
  const finished = over || (dv.turnId === null && dv.last !== null);
  const shown: DartsView = over
    ? {
        ...dv,
        turnId: null,
        left: { me: 0, b1: 37, b2: 0, b3: 112 },
        places: { me: 1, b2: 2 },
      }
    : dv;
  const places = shown.places;
  if (finished) players.forEach((p) => (p.place = places[p.id] ?? 4));
  const winner = Object.keys(places).find((id) => places[id] === 1);
  const view = {
    code: 'DARTS',
    meId: 'me',
    hostId: 'me',
    phase: finished ? 'over' : 'playing',
    players,
    watchers: [],
    leftPlayers: [],
    turnId: shown.turnId,
    turnMsLeft: null,
    config: {
      game: 'darts',
      stake: 500,
      opts: { start: 301 },
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
    plugged: { kind: 'darts', darts: shown },
    crazy7: null,
    rang: null,
    hand: [],
    pileCount: 0,
    pileTopBy: [],
    passedIds: [],
    endedEarly: false,
  } as unknown as RoomView;
  return <DartsTable view={view} actions={actions} bubbles={[]} auth={auth} />;
}
