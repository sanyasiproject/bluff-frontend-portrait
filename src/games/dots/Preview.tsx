import { useEffect, useRef, useState } from 'react';
import { dotsBoxesOf, dotsBoxLines, dotsLineCount, type DotsView, type PluggedMove, type PublicPlayer, type RoomView } from '../../types';
import type { Auth } from '../../useAuth';
import type { Actions } from '../../useBluff';
import { DotsTable } from './DotsTable';

// Dev only (?dotsPreview=1): a local Dots and Boxes game against 3 bots, no server. ?dotsPreview=over shows the podium; ?dotsSize=4|6

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

const sides = (dv: DotsView, box: number) => dotsBoxLines(dv.size, Math.floor(box / dv.size), box % dv.size).filter((l) => dv.lines[l] !== undefined).length;

function startView(): DotsView {
  const size = Number(new URLSearchParams(location.search).get('dotsSize')) || 5;
  return {
    size,
    lines: {},
    boxes: {},
    scores: { me: 0, b1: 0, b2: 0, b3: 0 },
    turnId: 'me',
    last: null,
  };
}

function draw(dv: DotsView, line: number): DotsView {
  if (dv.lines[line] !== undefined || !dv.turnId) return dv;
  const pid = dv.turnId;
  const lines = { ...dv.lines, [line]: pid };
  const next = { ...dv, lines };
  const closed = dotsBoxesOf(dv.size, line).filter((b) => sides(next, b) === 4);
  const boxes = { ...dv.boxes };
  closed.forEach((b) => (boxes[b] = pid));
  const scores = { ...dv.scores, [pid]: dv.scores[pid] + closed.length };
  const done = Object.keys(boxes).length === dv.size * dv.size;
  const turnId = done ? null : closed.length ? pid : IDS[(IDS.indexOf(pid) + 1) % 4];
  return {
    ...next,
    boxes,
    scores,
    turnId,
    last: { seq: (dv.last?.seq ?? 0) + 1, playerId: pid, line, closed },
  };
}

/** a bot closes a box when it can, else avoids drawing a third side */
function botLine(dv: DotsView): number {
  const free = Array.from({ length: dotsLineCount(dv.size) }, (_, i) => i).filter((l) => dv.lines[l] === undefined);
  const closing = free.find((l) => dotsBoxesOf(dv.size, l).some((b) => sides(dv, b) === 3));
  if (closing !== undefined) return closing;
  const safe = free.filter((l) => dotsBoxesOf(dv.size, l).every((b) => sides(dv, b) < 2));
  const pool = safe.length ? safe : free;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function DotsPreview({ auth }: { auth: Auth }) {
  const [dv, setDv] = useState(startView);
  const ref = useRef(dv);
  ref.current = dv;
  const over = new URLSearchParams(location.search).get('dotsPreview') === 'over';

  useEffect(() => {
    if (over || !dv.turnId || dv.turnId === 'me') return;
    const t = window.setTimeout(() => setDv((v) => draw(v, botLine(v))), 650);
    return () => window.clearTimeout(t);
  }, [dv]);

  const actions = new Proxy({} as Actions, {
    get: (_, key) =>
      key === 'gameMove'
        ? async (m: PluggedMove) => {
            if (ref.current.turnId === 'me' && m.kind === 'dots') setDv(draw(ref.current, m.move.line));
            return true;
          }
        : async () => null,
  });
  const players = [player('me', 'Ravi', false), player('b1', 'Priya', true), player('b2', 'Raju', true), player('b3', 'Meera', true)];
  const finished = over || (dv.turnId === null && dv.last !== null);
  const shown: DotsView = over ? { ...dv, turnId: null, scores: { me: 9, b1: 6, b2: 7, b3: 3 } } : dv;
  const best = Math.max(...Object.values(shown.scores));
  const winners = IDS.filter((id) => shown.scores[id] === best);
  const view = {
    code: 'DOTS',
    meId: 'me',
    hostId: 'me',
    phase: finished ? 'over' : 'playing',
    players,
    watchers: [],
    leftPlayers: [],
    turnId: shown.turnId,
    turnMsLeft: null,
    config: {
      game: 'dots',
      stake: 500,
      opts: { size: shown.size },
      turnTimer: false,
      voice: false,
      teams: false,
    },
    watchRequests: [],
    winnerIds: finished ? winners : [],
    loserIds: finished ? IDS.filter((id) => !winners.includes(id)) : [],
    teams: null,
    slots: null,
    swapAsks: [],
    coinResults: null,
    stopped: false,
    awards: [],
    plugged: { kind: 'dots', dots: shown },
    crazy7: null,
    rang: null,
    hand: [],
    pileCount: 0,
    pileTopBy: [],
    passedIds: [],
    endedEarly: false,
  } as unknown as RoomView;
  return <DotsTable view={view} actions={actions} bubbles={[]} auth={auth} />;
}
