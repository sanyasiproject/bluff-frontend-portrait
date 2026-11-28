import { useEffect, useMemo, useRef, useState } from 'react';
import { sfx } from '../../lib/sounds';
import { reducedMotion } from '../../lib/motion';
import type { RoomView } from '../../types';
import type { Actions } from '../../useBluff';
import { useOnChange } from '../../components/Table';
import { Position, type Color, type Move, type Piece, type Square } from './lib';
import type { ChessMoveInput, ChessView } from './contract';
import { blastSquares } from './boardKeys';
import { useChessLooks } from './looks';
import { checkSquare, other, safePosition, uciSquares, useClocks } from './viewState';

// The chess table's state: my colour, the position (with my move shown at once), premove, confirm, sounds and clocks

/** the same position with the other side to move, for premoves (null when that isn't a legal position) */
function swapped(pos: Position): Position | null {
  const f = pos.fen().split(' ');
  f[1] = f[1] === 'w' ? 'b' : 'w';
  f[3] = '-';
  try {
    const p = Position.fromFen(f.join(' '), pos.variant);
    return p.legalMoves().length ? p : null;
  } catch {
    return null;
  }
}
const sameMove = (a: Move, b: Move) => a.from === b.from && a.to === b.to && (a.promotion ?? null) === (b.promotion ?? null) && (a.drop ?? null) === (b.drop ?? null);

export function useChessTable(view: RoomView, cv: ChessView, actions: Actions) {
  const looks = useChessLooks();
  const me: Color | null = cv.players.w === view.meId ? 'w' : cv.players.b === view.meId ? 'b' : null;
  const [flip, setFlip] = useState(false);
  const orient: Color = flip ? other(me ?? 'w') : (me ?? 'w');
  const real = useMemo(() => safePosition(cv.fen, cv.variant), [cv.fen, cv.variant]);
  const [shown, setShown] = useState<{ fen: string; pos: Position; last: { from: Square; to: Square } } | null>(null);
  const [pending, setPending] = useState<Move | null>(null);
  const [premove, setPremove] = useState<Move | null>(null);
  const [dropPick, setDropPick] = useState<Move['drop'] | null>(null);
  const [blast, setBlast] = useState<{ key: number; squares: Square[] } | null>(null);
  const live = shown && shown.fen === cv.fen ? shown : null;
  const pos = live?.pos ?? real;
  const playing = cv.status === 'playing' && view.phase === 'playing';
  const myTurn = !!(playing && me && real?.turn === me);
  const legal = useMemo(() => (myTurn && real && !live ? real.legalMoves() : []), [myTurn, real, live]);
  const premoves = useMemo(() => (playing && me && real && !myTurn ? (swapped(real)?.legalMoves() ?? []) : []), [playing, me, real, myTurn]);
  const clocks = useClocks(cv);

  const send = (move: ChessMoveInput) => actions.gameMove({ kind: 'chess', move });
  const play = (m: Move) => {
    if (!real) return;
    const uci = real.uci(m);
    setShown({ fen: cv.fen, pos: real.play(m), last: { from: m.from, to: m.to } });
    setPending(null);
    void send({ type: 'move', uci, ply: cv.moves.length }).then((ok) => !ok && setShown(null));
  };
  const onMove = (m: Move) => (looks.confirm ? setPending(m) : play(m));

  // a queued premove plays as soon as it is my turn, if it is still legal
  useEffect(() => {
    if (!myTurn || !premove || !real) return;
    const m = real.legalMoves().find((x) => sameMove(x, premove));
    setPremove(null);
    if (m) play(m);
  }, [cv.fen, myTurn]);
  useEffect(() => {
    if (!playing) setPremove(null);
  }, [playing]);

  // each new move: its sound, and Atomic's explosion
  const prevBoard = useRef<(Piece | null)[] | null>(real?.board() ?? null);
  useOnChange(cv.moves.length, () => {
    const san = cv.sans[cv.sans.length - 1] ?? '';
    const board = real?.board() ?? null;
    const last = uciSquares(cv.lastMove);
    const capture = san.includes('x');
    if (cv.variant === 'atomic' && capture && prevBoard.current && board && last) {
      sfx.chessBoom();
      if (!reducedMotion()) setBlast({ key: cv.moves.length, squares: blastSquares(prevBoard.current, board, last.to) });
    } else if (san.includes('#') || san.includes('+')) sfx.chessCheck();
    else if (san.startsWith('O-O')) sfx.chessCastle();
    else if (san.includes('@')) sfx.chessDrop();
    else if (capture) sfx.chessCapture();
    else if (cv.moves.length > 0) sfx.chessMove();
    prevBoard.current = board;
  });
  useEffect(() => {
    if (!blast) return;
    const id = window.setTimeout(() => setBlast(null), 700);
    return () => window.clearTimeout(id);
  }, [blast]);
  useOnChange(cv.drawOffer ?? cv.takebackOffer ?? null, (by) => by && me && by !== me && sfx.chessOffer());
  useOnChange(cv.status, (s) => s === 'over' && sfx.chessEnd());

  // a tick each second under 10 s on my clock in bullet and blitz
  const mine = me && clocks ? clocks[me] : null;
  const sec = mine !== null && mine < 10000 && myTurn && (cv.speed === 'bullet' || cv.speed === 'blitz') ? Math.ceil(mine / 1000) : null;
  useEffect(() => {
    if (sec !== null && sec > 0) sfx.chessTick();
  }, [sec]);

  const last = useMemo(() => live?.last ?? uciSquares(cv.lastMove), [live, cv.lastMove]);
  const board = useMemo(() => pos?.board() ?? Array<Piece | null>(64).fill(null), [pos]);
  return {
    looks,
    me,
    orient,
    flip: () => setFlip((f) => !f),
    pos,
    board,
    last,
    check: pos ? checkSquare(pos) : null,
    playing,
    myTurn,
    legal: pending ? [] : legal,
    premoves,
    premove,
    setPremove,
    pending,
    confirmPending: () => pending && play(pending),
    cancelPending: () => setPending(null),
    onMove,
    dropPick,
    setDropPick,
    blast,
    clocks,
    send,
  };
}
export type ChessTableState = ReturnType<typeof useChessTable>;
