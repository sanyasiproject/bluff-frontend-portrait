import { useEffect, useRef, useState } from 'react';
import type { Auth } from '../../useAuth';
import { PREVIEW_IDS, previewActions, previewView } from '../previewKit';
import { CarromTable } from './CarromTable';
import { CARROM_SIDES, launchOf, nearestFit, simulate, startCoins, strikerSpot, toLocal, type CarromSide } from './lib';
import { CARROM_TURN_MS, type CarromView } from '../../types';

// Dev only (?carromPreview=1): a local Carrom board against bots with the shared physics, rules kept simple
// (=4 for four players in 2 v 2, =free for Freestyle, =over for the podium)

/** the preview's setting, from the address the page opened with */
let query = '';
const arg = () => new URLSearchParams(query).get('carromPreview') ?? '1';

function start(): CarromView {
  const a = arg();
  const n = a === '4' ? 4 : a === '3' ? 3 : 2;
  const ids = PREVIEW_IDS.slice(0, n);
  const sides = CARROM_SIDES[n as 2 | 3 | 4];
  const classic = a !== 'free' && n !== 3;
  return {
    mode: classic ? 'classic' : 'freestyle',
    length: 'quick',
    board: 1,
    boards: 1,
    coins: startCoins(),
    sides: Object.fromEntries(ids.map((id, i) => [id, sides[i]])),
    teams: n === 4 && classic ? [[ids[0], ids[2]], [ids[1], ids[3]]] : null,
    colors: classic ? Object.fromEntries(ids.map((id, i) => [id, i % 2 === 0 ? 'w' : 'b'])) : null,
    turnId: 'me',
    scores: Object.fromEntries(ids.map((id) => [id, 0])),
    pocketed: Object.fromEntries(ids.map((id) => [id, []])),
    queen: { state: 'board', by: null },
    results: [],
    settleAt: 0,
    deadline: Date.now() + CARROM_TURN_MS,
    last: null,
    places: {},
    now: Date.now(),
  };
}

function shoot(cv: CarromView, x: number, dx: number, dy: number, power: number): CarromView {
  const id = cv.turnId!;
  const side = cv.sides[id];
  const r = simulate(cv.coins, launchOf(side, x, dx, dy, power));
  const mine = cv.colors?.[id];
  const got = r.pocketed.map((p) => cv.coins.find((c) => c.id === p)!.c);
  const foul = r.striker.pocketed ? 'striker' : r.firstHit === null ? 'miss' : null;
  const own = got.filter((c) => (mine ? c === mine || c === 'q' : true)).length;
  const again = !foul && own > 0;
  const pts = got.reduce((s, c) => s + (cv.mode === 'freestyle' ? (c === 'w' ? 20 : c === 'b' ? 10 : 50) : 0), 0) - (foul && cv.mode === 'freestyle' ? 10 : 0);
  const ids = Object.keys(cv.sides);
  const next = again ? id : ids[(ids.indexOf(id) + 1) % ids.length];
  const scores = { ...cv.scores, [id]: (cv.scores[id] ?? 0) + pts };
  const done = r.coins.length === 0 || (mine !== undefined && !r.coins.some((c) => c.c === mine));
  const places = done ? Object.fromEntries([...ids].sort((a, b) => scores[b] - scores[a]).map((p, i) => [p, i + 1])) : {};
  const queenIn = r.pocketed.includes('Q');
  const now = Date.now();
  return {
    ...cv,
    coins: r.coins,
    scores,
    pocketed: { ...cv.pocketed, [id]: [...(cv.pocketed[id] ?? []), ...r.pocketed] },
    queen: queenIn ? { state: own > 1 ? 'covered' : 'pending', by: id } : cv.queen,
    turnId: done ? null : next,
    places,
    settleAt: now + r.ms,
    deadline: done ? null : now + r.ms + CARROM_TURN_MS,
    now,
    last: { seq: (cv.last?.seq ?? 0) + 1, playerId: id, side, x, dx, dy, power, before: cv.coins, pocketed: r.pocketed, strikerPocketed: r.striker.pocketed, foul, again, queen: queenIn ? (own > 1 ? 'covered' : 'pocketed') : null, returned: [], points: pts, ms: r.ms, auto: false },
  };
}

/** a bot: from the middle of its baseline, straight at a coin, with a little noise */
function botShot(cv: CarromView): [number, number, number, number] {
  const side = cv.sides[cv.turnId!] as CarromSide;
  const x = nearestFit(cv.coins, side, 0.3 + Math.random() * 0.4) ?? 0.5;
  const [sx, sy] = strikerSpot(side, x);
  const [su, sf] = toLocal(side, sx, sy);
  const target = cv.coins[Math.floor(Math.random() * cv.coins.length)];
  const [tu, tf] = toLocal(side, target.x, target.y);
  return [x, tu - su + (Math.random() - 0.5) * 0.04, tf - sf, 0.45 + Math.random() * 0.4];
}

export function CarromPreview({ auth, query: q }: { auth: Auth; query: string }) {
  query = q;
  const [cv, setCv] = useState(start);
  const ref = useRef(cv);
  ref.current = cv;
  const over = arg() === 'over';

  useEffect(() => {
    if (over || !cv.turnId || cv.turnId === 'me') return;
    // wait for the last shot to finish rolling, then think a moment
    const wait = (cv.last?.ms ?? 0) + 1400;
    const t = window.setTimeout(() => setCv((v: CarromView) => shoot(v, ...botShot(v))), wait);
    return () => window.clearTimeout(t);
  }, [cv]);

  const actions = previewActions((m) => {
    const mv = m.move as { x: number; dx: number; dy: number; power: number };
    if (ref.current.turnId === 'me') setCv(shoot(ref.current, mv.x, mv.dx, mv.dy, mv.power));
  });
  const shown: CarromView = over ? { ...cv, turnId: null, scores: { me: 14, b1: 6 }, places: { me: 1, b1: 2 }, pocketed: { me: ['W1', 'W2', 'Q', 'W4'], b1: ['B1', 'B2'] }, results: [{ board: 1, winners: ['me'], points: 8 }] } : cv;
  const ended = Object.keys(shown.places).length > 0;
  const view = previewView('carrom', shown, Object.keys(shown.sides), { mode: shown.mode, length: 'quick' }, ended ? { places: shown.places } : null, shown.turnId, 20000);
  return <CarromTable view={view} actions={actions} bubbles={[]} auth={auth} />;
}
