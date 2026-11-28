import { useRef } from 'react';
import type { Color, Move, Piece, Square } from './lib';

// Board geometry and stable piece keys, so a moved piece keeps its element and glides

/** a square's column and row on screen (0,0 top left) */
export function screenXY(s: Square, orient: Color): [number, number] {
  const f = s & 7;
  const r = s >> 3;
  return orient === 'w' ? [f, 7 - r] : [7 - f, r];
}
export function squareAt(x: number, y: number, orient: Color): Square {
  return orient === 'w' ? (7 - y) * 8 + x : y * 8 + (7 - x);
}

const same = (a: Piece | null | undefined, b: Piece | null | undefined) => !!a && !!b && a.color === b.color && a.role === b.role;
const dist = (a: Square, b: Square) => Math.abs((a & 7) - (b & 7)) + Math.abs((a >> 3) - (b >> 3));

/** keys per square: unchanged squares keep theirs; moved pieces carry theirs (nearest same piece, or the last move's piece on promotion) */
export function usePieceKeys(board: (Piece | null)[], last: { from: Square; to: Square } | null | undefined): (number | null)[] {
  const ref = useRef<{ board: (Piece | null)[]; keys: (number | null)[]; next: number } | null>(null);
  const prev = ref.current;
  if (prev && prev.board === board) return prev.keys;
  if (!prev) {
    let n = 0;
    const keys = board.map((p) => (p ? n++ : null));
    ref.current = { board, keys, next: n };
    return keys;
  }
  const keys: (number | null)[] = Array(64).fill(null);
  const gone: Square[] = [];
  const came: Square[] = [];
  for (let s = 0; s < 64; s++) {
    if (same(prev.board[s], board[s])) keys[s] = prev.keys[s];
    else {
      if (prev.board[s]) gone.push(s);
      if (board[s]) came.push(s);
    }
  }
  const used = new Set<Square>();
  // the last move's mover first (covers promotion: pawn → queen keeps its element)
  if (last && board[last.to] && gone.includes(last.from) && came.includes(last.to)) {
    keys[last.to] = prev.keys[last.from];
    used.add(last.from);
    came.splice(came.indexOf(last.to), 1);
  }
  let next = prev.next;
  for (const s of came) {
    let best: Square | null = null;
    for (const g of gone) if (!used.has(g) && same(prev.board[g], board[s]) && (best === null || dist(g, s) < dist(best, s))) best = g;
    if (best !== null) {
      used.add(best);
      keys[s] = prev.keys[best];
    } else keys[s] = next++;
  }
  ref.current = { board, keys, next };
  return keys;
}

/** a move's key for maps: from-to plus drop */
export const moveKey = (m: Move) => `${m.drop ?? ''}${m.from}-${m.to}`;

/** squares around a capture that lost a piece (Atomic explosions) */
export function blastSquares(before: (Piece | null)[], after: (Piece | null)[], at: Square): Square[] {
  const out: Square[] = [];
  const f = at & 7;
  const r = at >> 3;
  for (let df = -1; df <= 1; df++)
    for (let dr = -1; dr <= 1; dr++) {
      const ff = f + df;
      const rr = r + dr;
      if (ff < 0 || ff > 7 || rr < 0 || rr > 7) continue;
      const s = rr * 8 + ff;
      if (before[s] && !after[s]) out.push(s);
    }
  if (!out.includes(at) && !after[at]) out.push(at);
  return out;
}
