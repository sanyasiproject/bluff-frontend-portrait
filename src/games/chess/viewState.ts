import { useEffect, useMemo, useState } from 'react';
import { ChessGame, parseSquare, Position, type ChessVariant, type Color, type Piece, type Role, type Square } from './lib';
import type { ChessView } from './contract';
import { PIECE_VALUE } from './pieces';

// What the table needs from a ChessView: position, last move, check square, material, live clocks

export const other = (c: Color): Color => (c === 'w' ? 'b' : 'w');

export function uciSquares(u: string | null | undefined): { from: Square; to: Square } | null {
  if (!u) return null;
  // crazyhouse drops look like "N@f3"
  if (u[1] === '@') {
    const to = parseSquare(u.slice(2, 4));
    return to === undefined ? null : { from: to, to };
  }
  const from = parseSquare(u.slice(0, 2));
  const to = parseSquare(u.slice(2, 4));
  return from === undefined || to === undefined ? null : { from, to };
}

export function safePosition(fen: string, variant: ChessVariant): Position | null {
  try {
    return Position.fromFen(fen, variant);
  } catch {
    return null;
  }
}

/** the game rebuilt from the start, for stepping through moves */
export function rebuildGame(variant: ChessVariant, initialFen: string, moves: string[]): ChessGame {
  const g = new ChessGame(variant, initialFen);
  for (const u of moves) {
    const m = g.position().parseUci(u);
    if (!m) break;
    g.play(m);
  }
  return g;
}

/** the king in check, if any */
export function checkSquare(pos: Position): Square | null {
  if (!pos.inCheck()) return null;
  const i = pos.board().findIndex((p) => p?.role === 'k' && p.color === pos.turn);
  return i >= 0 ? i : null;
}

/** captured-material lead: the pieces one side has more of, and the points */
export function materialDiff(board: (Piece | null)[]): Record<Color, { roles: Role[]; points: number }> {
  const n: Record<Color, Record<Role, number>> = { w: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 }, b: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 } };
  for (const p of board) if (p) n[p.color][p.role]++;
  const out: Record<Color, { roles: Role[]; points: number }> = { w: { roles: [], points: 0 }, b: { roles: [], points: 0 } };
  let score = 0;
  for (const r of ['q', 'r', 'b', 'n', 'p'] as Role[]) {
    const d = n.w[r] - n.b[r];
    score += d * PIECE_VALUE[r];
    const side: Color = d > 0 ? 'w' : 'b';
    for (let i = 0; i < Math.abs(d); i++) out[side].roles.push(r);
  }
  if (score > 0) out.w.points = score;
  if (score < 0) out.b.points = -score;
  return out;
}

/** both clocks, ticking locally from the server's numbers (server time is the truth) */
export function useClocks(view: ChessView): { w: number; b: number } | null {
  const got = useMemo(() => Date.now(), [view]);
  const [, tick] = useState(0);
  const c = view.clock;
  const running = !!c && c.runningSince !== null && view.status === 'playing';
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => tick((n) => n + 1), 100);
    return () => window.clearInterval(id);
  }, [running, view]);
  if (!c) return null;
  if (!running) return { w: c.w, b: c.b };
  const spent = view.now - (c.runningSince ?? view.now) + (Date.now() - got);
  const left = Math.max(0, c[view.turn] - spent);
  return view.turn === 'w' ? { w: left, b: c.b } : { w: c.w, b: left };
}

/** 4:05, 0:59, 9.4 under 10 seconds, 1:02:03 over an hour */
export function clockText(ms: number): string {
  if (ms < 10000) return (Math.floor(ms / 100) / 10).toFixed(1);
  const s = Math.ceil(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/** "1450?" while provisional */
export const ratingText = (r: { r: number; prov: boolean } | undefined) => (r ? `${Math.round(r.r)}${r.prov ? '?' : ''}` : '');
