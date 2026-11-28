import { useEffect, useRef, useState } from 'react';
import type { Auth } from '../../useAuth';
import { utttLineOf, type UtttMark, type UtttView } from '../../types';
import { previewActions, previewView } from '../previewKit';
import { UtttTable } from './UtttTable';

// Dev only (?ultimatePreview=1): a local Ultimate Tic-Tac-Toe against a plain bot (=over the podium, =mid a game in progress)

let query = '';
const arg = () => new URLSearchParams(query).get('ultimatePreview') ?? '1';
const TURN_MS = 25_000;
const lineOf = (cells: (string | null)[], m: string) => (utttLineOf(cells)?.mark === m ? utttLineOf(cells)!.line : null);

function openBoards(cells: (UtttMark | null)[], boards: UtttView['boards']): number[] {
  return boards.map((b, i) => (b || cells.slice(i * 9, i * 9 + 9).every(Boolean) ? -1 : i)).filter((i) => i >= 0);
}

function start(): UtttView {
  return { cells: Array(81).fill(null), boards: Array(9).fill(null), active: [0, 1, 2, 3, 4, 5, 6, 7, 8], x: 'me', o: 'b1', turnId: 'me', moves: 0, last: null, line: null, winner: null, draw: false };
}

function play(u: UtttView, by: string, board: number, cell: number): UtttView {
  const m: UtttMark = by === u.x ? 'X' : 'O';
  const cells = [...u.cells];
  cells[board * 9 + cell] = m;
  const boards = [...u.boards];
  const small = cells.slice(board * 9, board * 9 + 9);
  const took = !!lineOf(small, m);
  if (took) boards[board] = m;
  else if (small.every(Boolean)) boards[board] = 'draw';
  const line = lineOf(boards, m);
  const open = openBoards(cells, boards);
  const draw = !line && open.length === 0;
  const active = line || draw ? [] : open.includes(cell) ? [cell] : open;
  const other = by === u.x ? u.o : u.x;
  return { ...u, cells, boards, active, line, winner: line ? by : null, draw, moves: u.moves + 1, turnId: line || draw ? null : other, last: { board, cell, playerId: by, mark: m, won: took, seq: (u.last?.seq ?? 0) + 1 } };
}

/** a plain bot: take a small board when it can, else a random legal cell */
function botMove(u: UtttView): [number, number] {
  const m: UtttMark = u.turnId === u.x ? 'X' : 'O';
  const moves = u.active.flatMap((b) => Array.from({ length: 9 }, (_, c) => [b, c] as [number, number]).filter(([bb, c]) => !u.cells[bb * 9 + c]));
  const win = moves.find(([b, c]) => {
    const s = u.cells.slice(b * 9, b * 9 + 9);
    s[c] = m;
    return !!lineOf(s, m);
  });
  return win ?? moves[Math.floor(Math.random() * moves.length)];
}

function scripted(): UtttView {
  let u = start();
  const seq: [number, number][] = [[4, 4], [4, 0], [0, 4], [4, 8], [8, 4], [4, 2], [2, 4], [4, 6], [6, 4], [4, 1], [1, 4], [4, 3], [3, 0], [0, 0], [0, 8], [8, 0]];
  for (const [b, c] of seq) if (u.active.includes(b) && !u.cells[b * 9 + c]) u = play(u, u.turnId!, b, c);
  return u.turnId === 'me' ? u : play(u, u.turnId!, ...botMove(u));
}

export function UtttPreview({ auth, query: q }: { auth: Auth; query: string }) {
  query = q;
  const [u, setU] = useState(() => (arg() === '1' ? start() : scripted()));
  const ref = useRef(u);
  ref.current = u;
  useEffect(() => {
    if (!u.turnId || u.turnId === 'me') return;
    const id = window.setTimeout(() => setU((cur) => play(cur, cur.turnId!, ...botMove(cur))), 900);
    return () => window.clearTimeout(id);
  }, [u]);
  const actions = previewActions(({ move }) => {
    const m = move as { board: number; cell: number };
    const cur = ref.current;
    if (cur.turnId === 'me' && cur.active.includes(m.board) && !cur.cells[m.board * 9 + m.cell]) setU(play(cur, 'me', m.board, m.cell));
  });
  const uv: UtttView = arg() === 'over' ? { ...u, boards: ['X', 'O', 'draw', null, 'X', 'O', null, null, 'X'], line: [0, 4, 8], winner: 'me', active: [], turnId: null } : u;
  const ended = !!uv.winner || uv.draw;
  const places = uv.winner ? { [uv.winner]: 1, [uv.winner === uv.x ? uv.o : uv.x]: 2 } : { me: 1, b1: 1 };
  const view = previewView('uttt', uv, [uv.x, uv.o], {}, ended ? { places } : null, uv.turnId, TURN_MS);
  return <UtttTable view={view} actions={actions} bubbles={[]} auth={auth} />;
}
