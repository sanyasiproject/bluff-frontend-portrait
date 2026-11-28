import { useEffect, useRef, useState } from 'react';
import { SEA_PLACE_MS, SEA_SIZE, SEA_TURN_MS, seaRandomFleet, seaShipCells, type SeaPower, type SeaShip, type SeaShotView, type SeaView } from '../../types';
import type { Auth } from '../../useAuth';
import { PREVIEW_IDS, previewActions, previewView } from '../previewKit';
import { SeaTable } from './SeaTable';

// Dev only (?seabattlePreview=1): a local Sea Battle against 3 bots with powers (=2 two players, =battle skips
// placement, =over the podium). Bots fire at random open cells

/** the preview's setting, from the address the page opened with */
let query = '';
const arg = () => new URLSearchParams(query).get('seabattlePreview') ?? '1';

interface Sim {
  sv: SeaView;
  fleets: Record<string, SeaShip[]>;
}

/** what a viewer (me) sees of everyone's sea */
function boardOf(fleet: SeaShip[], shots: number[], mine: boolean) {
  const ships = fleet.map((s) => {
    const cells = seaShipCells(s);
    const hits = cells.filter(([x, y]) => shots[y * SEA_SIZE + x] >= 2).length;
    return { ...s, hits, sunk: hits === s.len };
  });
  return { shots, ships: ships.filter((s) => mine || s.sunk), afloat: ships.filter((s) => !s.sunk).map((s) => s.len) };
}

function start(): Sim {
  const n = arg() === '2' ? 2 : 4;
  const ids = PREVIEW_IDS.slice(0, n);
  const fleets = Object.fromEntries(ids.map((id) => [id, seaRandomFleet()]));
  const battle = arg() === 'battle' || arg() === 'over';
  const now = Date.now();
  return {
    fleets,
    sv: {
      phase: battle ? 'battle' : 'place',
      powers: true,
      placeEndsAt: now + SEA_PLACE_MS,
      ready: Object.fromEntries(ids.map((id) => [id, id !== 'me'])),
      seas: Object.fromEntries(ids.map((id) => [id, boardOf(fleets[id], Array(SEA_SIZE * SEA_SIZE).fill(0), id === 'me')])),
      turnId: battle ? 'me' : null,
      deadline: battle ? now + SEA_TURN_MS : null,
      held: Object.fromEntries(ids.map((id) => [id, id === 'me' ? (['radar', 'salvo'] as SeaPower[]) : []])),
      radars: [],
      last: null,
      places: {},
      now,
    },
  };
}

/** fires at cells (fire, salvo or torpedo already resolved to cells) */
function shoot(s: Sim, by: string, target: string, cells: [number, number][], kind: SeaShotView['kind'], row?: number): Sim {
  const shots = [...s.sv.seas[target].shots];
  const fleet = s.fleets[target];
  const out: SeaShotView['cells'] = [];
  for (const [x, y] of cells) {
    const hit = fleet.some((sh) => seaShipCells(sh).some(([a, b]) => a === x && b === y));
    shots[y * SEA_SIZE + x] = hit ? 2 : 1;
    out.push({ x, y, hit, sunk: false });
  }
  for (const sh of fleet) {
    const c = seaShipCells(sh);
    if (c.every(([x, y]) => shots[y * SEA_SIZE + x] >= 2)) c.forEach(([x, y]) => (shots[y * SEA_SIZE + x] = 3));
  }
  out.forEach((c) => (c.sunk = shots[c.y * SEA_SIZE + c.x] === 3));
  const before = s.sv.seas[target].afloat.length;
  const board = boardOf(fleet, shots, target === 'me');
  const sank = board.afloat.length < before;
  const earned: SeaPower | null = sank && (s.sv.held[by]?.length ?? 0) < 2 ? (['radar', 'salvo', 'torpedo'] as const)[Math.floor(Math.random() * 3)] : null;
  const again = out.some((c) => c.hit);
  const ids = Object.keys(s.sv.seas);
  const places = { ...s.sv.places };
  const isOut = board.afloat.length === 0;
  if (isOut) places[target] = ids.filter((id) => !places[id]).length;
  const alive = ids.filter((id) => !places[id]);
  if (alive.length === 1) places[alive[0]] = 1;
  const nextTurn = again ? by : alive[(alive.indexOf(by) + 1) % alive.length];
  const now = Date.now();
  return {
    ...s,
    sv: {
      ...s.sv,
      phase: alive.length === 1 ? 'over' : 'battle',
      seas: { ...s.sv.seas, [target]: board },
      held: { ...s.sv.held, [by]: earned ? [...(s.sv.held[by] ?? []), earned] : s.sv.held[by] },
      turnId: alive.length === 1 ? null : nextTurn,
      deadline: now + SEA_TURN_MS,
      places,
      now,
      last: { seq: (s.sv.last?.seq ?? 0) + 1, by, target, kind, cells: out, row, earned, again, out: isOut, auto: false },
    },
  };
}

function botMove(s: Sim): Sim {
  const by = s.sv.turnId!;
  const ids = Object.keys(s.sv.seas).filter((id) => id !== by && !s.sv.places[id]);
  const target = ids[Math.floor(Math.random() * ids.length)];
  const open = s.sv.seas[target].shots.map((v, i) => (v === 0 ? i : -1)).filter((i) => i >= 0);
  const i = open[Math.floor(Math.random() * open.length)];
  return shoot(s, by, target, [[i % SEA_SIZE, Math.floor(i / SEA_SIZE)]], 'fire');
}

const dropOne = (held: SeaPower[] = [], p: SeaPower) => {
  const i = held.indexOf(p);
  return i < 0 ? held : [...held.slice(0, i), ...held.slice(i + 1)];
};

/** my move in the preview */
function myMove(s: Sim, m: { type: string; ships?: SeaShip[]; target: string; x: number; y: number; cells: [number, number][]; row: number }): Sim {
  if (m.type === 'place' && m.ships) return { ...s, fleets: { ...s.fleets, me: m.ships }, sv: { ...s.sv, seas: { ...s.sv.seas, me: boardOf(m.ships, s.sv.seas.me.shots, true) } } };
  if (m.type === 'ready') return { ...s, sv: { ...s.sv, phase: 'battle', ready: { ...s.sv.ready, me: true }, turnId: 'me', deadline: Date.now() + SEA_TURN_MS, now: Date.now() } };
  if (s.sv.turnId !== 'me') return s;
  const use = (p: SeaPower): Sim => ({ ...s, sv: { ...s.sv, held: { ...s.sv.held, me: dropOne(s.sv.held.me, p) } } });
  if (m.type === 'fire') return shoot(s, 'me', m.target, [[m.x, m.y]], 'fire');
  if (m.type === 'salvo') return shoot(use('salvo'), 'me', m.target, m.cells, 'salvo');
  if (m.type === 'torpedo') {
    const fleet = s.fleets[m.target];
    const x = Array.from({ length: SEA_SIZE }, (_, k) => k).find((k) => fleet.some((sh) => seaShipCells(sh).some(([a, b]) => a === k && b === m.row)));
    return shoot(use('torpedo'), 'me', m.target, x === undefined ? [] : [[x, m.row]], 'torpedo', m.row);
  }
  const ax = Math.max(0, Math.min(SEA_SIZE - 3, m.x - 1));
  const ay = Math.max(0, Math.min(SEA_SIZE - 3, m.y - 1));
  const count = s.fleets[m.target].flatMap(seaShipCells).filter(([a, b]) => a >= ax && a < ax + 3 && b >= ay && b < ay + 3 && s.sv.seas[m.target].shots[b * SEA_SIZE + a] < 2).length;
  const u = use('radar');
  return { ...u, sv: { ...u.sv, radars: [...s.sv.radars, { target: m.target, x: ax, y: ay, count }], last: { seq: (s.sv.last?.seq ?? 0) + 1, by: 'me', target: m.target, kind: 'radar', cells: [], area: [ax, ay], count, earned: null, again: true, out: false, auto: false } } };
}

export function SeaPreview({ auth, query: q }: { auth: Auth; query: string }) {
  query = q;
  const [sim, setSim] = useState(start);
  const ref = useRef(sim);
  ref.current = sim;
  useEffect(() => {
    if (sim.sv.phase !== 'battle' || !sim.sv.turnId || sim.sv.turnId === 'me') return;
    const id = window.setTimeout(() => setSim(botMove), 1300);
    return () => window.clearTimeout(id);
  }, [sim]);

  const actions = previewActions(({ move }) => setSim(myMove(ref.current, move as Parameters<typeof myMove>[1])));
  const sv: SeaView = arg() === 'over' ? { ...sim.sv, phase: 'over', turnId: null, places: { me: 1, b2: 2, b1: 3, b3: 4 } } : sim.sv;
  const ended = sv.phase === 'over';
  const view = previewView('seabattle', sv, Object.keys(sv.seas), { powers: 'on' }, ended ? { places: sv.places } : null, sv.turnId);
  return <SeaTable view={view} actions={actions} bubbles={[]} auth={auth} />;
}
