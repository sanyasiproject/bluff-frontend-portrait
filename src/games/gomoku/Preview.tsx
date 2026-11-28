import { useEffect, useRef, useState } from 'react';
import type { Auth } from '../../useAuth';
import { gomokuCentre, type GomokuView } from '../../types';
import { PREVIEW_IDS, previewActions, previewView } from '../previewKit';
import { GomokuTable } from './GomokuTable';

// Dev only (?gomokuPreview=1): a local Five in a Row against a bot (=4 four players on 19×19, =over the podium)

let query = '';
const arg = () => new URLSearchParams(query).get('gomokuPreview') ?? '1';
const TURN_MS = 30_000;
const DIRS = [[1, 0], [0, 1], [1, 1], [1, -1]] as const;

/** the longest line through a point for a seat, and its points */
function lineAt(board: number[], size: number, at: number, seat: number): number[] {
  let best: number[] = [];
  const x0 = at % size;
  const y0 = Math.floor(at / size);
  for (const [dx, dy] of DIRS) {
    const pts = [at];
    for (const s of [1, -1]) {
      for (let k = 1; k < 6; k++) {
        const x = x0 + dx * k * s;
        const y = y0 + dy * k * s;
        if (x < 0 || y < 0 || x >= size || y >= size || board[y * size + x] !== seat) break;
        pts.push(y * size + x);
      }
    }
    if (pts.length > best.length) best = pts.sort((a, b) => a - b);
  }
  return best;
}

function start(): GomokuView {
  const n = arg() === '4' ? 4 : 2;
  const size = n > 2 ? 19 : 15;
  const seats = PREVIEW_IDS.slice(0, n);
  const cells = Array(size * size).fill(-1);
  if (arg() === 'over') [0, 1, 2, 3, 4].forEach((k) => (cells[7 * size + 3 + k] = 0));
  if (arg() === 'over') [0, 1, 2].forEach((k) => (cells[8 * size + 4 + k] = 1));
  const moves = cells.filter((c) => c >= 0).length;
  return { size, cells, seats, turnId: 'me', moves, last: null, line: null, winner: null, draw: false, places: {}, best: Object.fromEntries(seats.map((id) => [id, 0])) };
}

function play(g: GomokuView, by: string, at: number): GomokuView {
  const seat = g.seats.indexOf(by);
  const cells = [...g.cells];
  cells[at] = seat;
  const run = lineAt(cells, g.size, at, seat);
  const best = { ...g.best, [by]: Math.max(g.best[by] ?? 0, run.length) };
  const won = run.length >= 5;
  const draw = !won && cells.every((s) => s >= 0);
  const next = g.seats[(seat + 1) % g.seats.length];
  const places = won ? Object.fromEntries([by, ...g.seats.filter((id) => id !== by).sort((a, b) => (best[b] ?? 0) - (best[a] ?? 0))].map((id, i) => [id, i + 1])) : g.places;
  return { ...g, cells, best, line: won ? run : null, winner: won ? by : null, draw, places, moves: g.moves + 1, turnId: won || draw ? null : next, last: { at, playerId: by, seq: (g.last?.seq ?? 0) + 1 } };
}

/** a plain bot: win, block, else the point that grows the longest lines */
function botMove(g: GomokuView): number {
  const seat = g.seats.indexOf(g.turnId!);
  const c = gomokuCentre(g.size);
  if (g.moves === 0) return c;
  let best = c;
  let score = -1;
  g.cells.forEach((s, i) => {
    if (s >= 0) return;
    const near = DIRS.some(([dx, dy]) => [1, -1].some((k) => g.cells[i + (dy * g.size + dx) * k] >= 0));
    if (!near) return;
    let v = Math.random();
    g.seats.forEach((_, o) => {
      const b = [...g.cells];
      b[i] = o;
      const len = lineAt(b, g.size, i, o).length;
      v += o === seat ? (len >= 5 ? 1000 : len * len) : len >= 5 ? 500 : len >= 4 ? 60 : len * len * 0.8;
    });
    if (v > score) [score, best] = [v, i];
  });
  return best;
}

export function GomokuPreview({ auth, query: q }: { auth: Auth; query: string }) {
  query = q;
  const [g, setG] = useState(start);
  const ref = useRef(g);
  ref.current = g;
  useEffect(() => {
    if (!g.turnId || g.turnId === 'me') return;
    const id = window.setTimeout(() => setG((cur) => play(cur, cur.turnId!, botMove(cur))), 900);
    return () => window.clearTimeout(id);
  }, [g]);
  const actions = previewActions(({ move }) => {
    const m = move as { at: number };
    if (ref.current.turnId === 'me' && ref.current.cells[m.at] < 0) setG(play(ref.current, 'me', m.at));
  });
  const over = arg() === 'over';
  const gv: GomokuView = over ? { ...g, winner: 'me', line: [0, 1, 2, 3, 4].map((k) => 7 * g.size + 3 + k), turnId: null, places: { me: 1, b1: 2 }, best: { me: 5, b1: 3 } } : g;
  const ended = !!gv.winner || gv.draw;
  const view = previewView('gomoku', gv, gv.seats, {}, ended ? { places: gv.places } : null, gv.turnId, TURN_MS);
  return <GomokuTable view={view} actions={actions} bubbles={[]} auth={auth} />;
}
