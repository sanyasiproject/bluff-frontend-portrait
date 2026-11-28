import { useEffect, useRef, useState, type CSSProperties, type MutableRefObject, type PointerEvent as RPointerEvent } from 'react';
import { cx } from '../../lib/cards';
import type { ChessVariant, Color, Move, Piece, Role, Square } from './lib';
import { PieceSvg } from './pieces';
import { Arrows, type Arrow } from './Arrows';
import { screenXY, squareAt, usePieceKeys } from './boardKeys';
import { themeOf, type ChessLooks } from './looks';

// The chessboard: squares, pieces that glide, tap–tap and drag, dots and rings, promotion, premove and variant marks

export type DragApi = MutableRefObject<((role: Role, e: RPointerEvent) => void) | null>;

export interface BoardProps {
  variant: ChessVariant;
  board: (Piece | null)[];
  orient: Color;
  looks: ChessLooks;
  last?: { from: Square; to: Square } | null;
  check?: Square | null;
  /** moves allowed now (empty: view only) */
  moves?: Move[];
  /** while waiting: moves that may be queued as a premove */
  premoves?: Move[];
  premove?: Move | null;
  onMove?: (m: Move) => void;
  onPremove?: (m: Move | null) => void;
  arrows?: Arrow[];
  blast?: { key: number; squares: Square[] } | null;
  dropPick?: Role | null;
  onDropPick?: (r: Role | null) => void;
  dragApi?: DragApi;
}

const HILL = [27, 28, 35, 36];
const FILES = 'abcdefgh';

interface Track {
  from: Square | null;
  drop: Role | null;
  wasSel: boolean;
  x0: number;
  y0: number;
  dragging: boolean;
  piece: Piece;
}

export function Board(p: BoardProps) {
  const { board, orient, looks } = p;
  const pre = !p.moves?.length && !!p.premoves?.length;
  const active = (p.moves?.length ? p.moves : p.premoves) ?? [];
  const [sel, setSel] = useState<Square | null>(null);
  const [promo, setPromo] = useState<Move[] | null>(null);
  const [dragFrom, setDragFrom] = useState<Square | null>(null);
  const [ghost, setGhost] = useState<Piece | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const track = useRef<Track | null>(null);
  const keys = usePieceKeys(board, p.last);

  // the moves from a square, with Chess960-style castling (king takes own rook) also reachable on the g/c file
  const targetsFrom = (from: Square): Map<Square, Move[]> => {
    const map = new Map<Square, Move[]>();
    const add = (s: Square, m: Move) => map.set(s, [...(map.get(s) ?? []), m]);
    for (const m of active) {
      if (m.drop || m.from !== from) continue;
      const me = board[from];
      const at = board[m.to];
      const castle = me?.role === 'k' && at?.role === 'r' && at.color === me.color;
      // castling: the king's square always; the rook's square too in Chess960
      if (!castle || p.variant === 'chess960') add(m.to, m);
      if (castle) {
        const alias = (m.to & 56) + (m.to > from ? 6 : 2);
        if (!map.has(alias)) add(alias, m);
      }
    }
    return map;
  };
  const dropTargets = (role: Role) => new Set(active.filter((m) => m.drop === role).map((m) => m.to));
  const movers = new Set(active.filter((m) => !m.drop).map((m) => m.from));

  // a new position or turn clears the picked piece
  useEffect(() => {
    setSel(null);
    setPromo(null);
  }, [board, pre]);

  const commit = (m: Move) => {
    setSel(null);
    setPromo(null);
    p.onDropPick?.(null);
    if (pre) p.onPremove?.(m);
    else p.onMove?.(m);
  };
  const choose = (list: Move[] | undefined) => {
    if (!list?.length) return;
    if (list.length > 1 && list.some((m) => m.promotion)) setPromo(list);
    else commit(list[0]);
  };

  const squareOf = (x: number, y: number): Square | null => {
    const r = boxRef.current?.getBoundingClientRect();
    if (!r) return null;
    const cxN = Math.floor(((x - r.left) / r.width) * 8);
    const cyN = Math.floor(((y - r.top) / r.height) * 8);
    if (cxN < 0 || cxN > 7 || cyN < 0 || cyN > 7) return null;
    return squareAt(cxN, cyN, orient);
  };
  const moveGhost = (x: number, y: number) => {
    const r = boxRef.current?.getBoundingClientRect();
    if (!r || !ghostRef.current) return;
    const s = r.width / 8;
    ghostRef.current.style.transform = `translate(${x - r.left - s / 2}px, ${y - r.top - s * 0.7}px)`;
  };

  const begin = (t: Track) => {
    track.current = t;
    const move = (e: PointerEvent) => {
      const k = track.current;
      if (!k) return;
      if (!k.dragging && Math.hypot(e.clientX - k.x0, e.clientY - k.y0) > 6) {
        k.dragging = true;
        setDragFrom(k.from);
        setGhost(k.piece);
      }
      if (k.dragging) moveGhost(e.clientX, e.clientY);
    };
    const up = (e: PointerEvent) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      const k = track.current;
      track.current = null;
      setDragFrom(null);
      setGhost(null);
      if (!k) return;
      const to = squareOf(e.clientX, e.clientY);
      if (k.drop) {
        if (to !== null && k.dragging && dropTargets(k.drop).has(to)) commit(active.find((m) => m.drop === k.drop && m.to === to)!);
        return;
      }
      if (k.from === null) return;
      if (k.dragging && to !== null && to !== k.from) choose(targetsFrom(k.from).get(to));
      else if (!k.dragging && k.wasSel) setSel(null);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  if (p.dragApi) {
    p.dragApi.current = (role, e) => {
      if (!active.some((m) => m.drop === role)) return;
      setSel(null);
      p.onDropPick?.(role);
      begin({ from: null, drop: role, wasSel: false, x0: e.clientX, y0: e.clientY, dragging: false, piece: { color: turnColor(), role } });
    };
  }
  function turnColor(): Color {
    const m = active.find((x) => !x.drop);
    return (m && board[m.from]?.color) || orient;
  }

  const down = (e: RPointerEvent) => {
    if (promo || e.button > 0) return;
    const s = squareOf(e.clientX, e.clientY);
    if (s === null) return;
    if (p.dropPick) {
      if (dropTargets(p.dropPick).has(s)) return commit(active.find((m) => m.drop === p.dropPick && m.to === s)!);
      p.onDropPick?.(null);
    }
    if (sel !== null && sel !== s && targetsFrom(sel).has(s)) return choose(targetsFrom(sel).get(s));
    if (movers.has(s)) {
      const wasSel = sel === s;
      setSel(s);
      begin({ from: s, drop: null, wasSel, x0: e.clientX, y0: e.clientY, dragging: false, piece: board[s]! });
      return;
    }
    setSel(null);
    if (p.premove) p.onPremove?.(null);
  };

  const theme = themeOf(looks.board);
  const targets = sel !== null ? targetsFrom(sel) : p.dropPick ? new Map([...dropTargets(p.dropPick)].map((s) => [s, []])) : new Map<Square, Move[]>();
  const at = (s: Square): CSSProperties => {
    const [x, y] = screenXY(s, orient);
    return { transform: `translate(${x * 100}%, ${y * 100}%)` };
  };
  const marks: [Square, string][] = [];
  if (p.variant === 'kingOfTheHill') HILL.forEach((s) => marks.push([s, 'cb-hill']));
  if (p.variant === 'racingKings') for (let s = 56; s < 64; s++) marks.push([s, 'cb-goal']);
  if (p.last) marks.push([p.last.from, 'cb-last'], [p.last.to, 'cb-last']);
  if (p.premove) marks.push([p.premove.from, 'cb-pre'], [p.premove.to, 'cb-pre']);
  if (sel !== null) marks.push([sel, 'cb-sel']);
  if (p.check != null) marks.push([p.check, 'cb-check']);

  return (
    <div
      ref={boxRef}
      className={cx('cb-board', `cb-${looks.board}`, pre && 'cb-premode')}
      style={{ '--cb-light': theme.light, '--cb-dark': theme.dark } as CSSProperties}
      onPointerDown={down}
      role="grid"
      aria-label="Chessboard"
    >
      {marks.map(([s, c], i) => (
        <div key={`m${i}`} className={cx('cb-mark', c)} style={at(s)} />
      ))}
      {looks.coords && <Coords orient={orient} />}
      {board.map((pc, s) =>
        pc ? (
          <div key={keys[s] ?? `s${s}`} className={cx('cb-piece', dragFrom === s && 'cb-lifted')} style={at(s)} data-sq={s}>
            <PieceSvg color={pc.color} role={pc.role} set={looks.pieces} />
          </div>
        ) : null,
      )}
      {[...targets.keys()].map((s) => (
        <div key={`t${s}`} className={cx('cb-mark', board[s] ? 'cb-ring' : 'cb-dot', pre && 'pre')} style={at(s)} />
      ))}
      {p.blast?.squares.map((s) => (
        <div key={`b${p.blast!.key}-${s}`} className="cb-mark cb-boom" style={at(s)}>
          <i />
        </div>
      ))}
      <Arrows arrows={p.arrows ?? []} orient={orient} />
      {ghost && (
        <div ref={ghostRef} className="cb-ghost">
          <PieceSvg color={ghost.color} role={ghost.role} set={looks.pieces} />
        </div>
      )}
      {promo && <Promotion moves={promo} orient={orient} color={board[promo[0].from]?.color ?? 'w'} set={looks.pieces} onPick={commit} onCancel={() => setPromo(null)} />}
    </div>
  );
}

function Coords({ orient }: { orient: Color }) {
  const files = orient === 'w' ? FILES : [...FILES].reverse().join('');
  return (
    <>
      {[...files].map((f, i) => (
        <span key={f} className={cx('cb-coord cb-file', i % 2 === 0 ? 'on-dark' : 'on-light')} style={{ left: `${i * 12.5}%` }}>
          {f}
        </span>
      ))}
      {Array.from({ length: 8 }, (_, i) => (
        <span key={i} className={cx('cb-coord cb-rank', i % 2 === 0 ? 'on-light' : 'on-dark')} style={{ top: `${i * 12.5}%` }}>
          {orient === 'w' ? 8 - i : i + 1}
        </span>
      ))}
    </>
  );
}

/** the promotion choices in a column on the target file, from the edge they promote on */
function Promotion({ moves, orient, color, set, onPick, onCancel }: { moves: Move[]; orient: Color; color: Color; set: ChessLooks['pieces']; onPick: (m: Move) => void; onCancel: () => void }) {
  const order: Role[] = ['q', 'n', 'r', 'b', 'k'];
  const list = order.map((r) => moves.find((m) => m.promotion === r)).filter((m): m is Move => !!m);
  const [x, y] = screenXY(list[0].to, orient);
  const down = y > 3;
  return (
    <div className="cb-promo" onPointerDown={(e) => (e.stopPropagation(), onCancel())}>
      {list.map((m, i) => (
        <button
          key={m.promotion}
          className="cb-promo-btn"
          style={{ transform: `translate(${x * 100}%, ${(down ? y - i : y + i) * 100}%)` }}
          onPointerDown={(e) => (e.stopPropagation(), onPick(m))}
          aria-label={`Promote to ${m.promotion}`}
        >
          <PieceSvg color={color} role={m.promotion!} set={set} />
        </button>
      ))}
    </div>
  );
}
