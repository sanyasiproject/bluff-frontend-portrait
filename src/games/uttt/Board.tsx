import { useRef, useState, type PointerEvent } from 'react';
import { cx } from '../../lib/cards';
import { utttSendAfter, type UtttMark, type UtttView } from '../../types';

// Ultimate Tic-Tac-Toe on a chalkboard: thick big grid, thin small grids, glowing active boards, a send arrow while pressing

const B = 32;
const PAD = 1.5;
const C = (B - PAD * 2) / 3;

/** the top-left corner of a cell */
const cellAt = (board: number, cell: number) => [(board % 3) * B + PAD + (cell % 3) * C, Math.floor(board / 3) * B + PAD + Math.floor(cell / 3) * C] as const;
const boardMid = (board: number) => [(board % 3) * B + B / 2, Math.floor(board / 3) * B + B / 2] as const;

/** a chalk line with a slight wobble */
const chalk = (x1: number, y1: number, x2: number, y2: number, w: number) => `M${x1} ${y1} Q ${(x1 + x2) / 2 + w} ${(y1 + y2) / 2 - w} ${x2} ${y2}`;


export function Mark({ mark, x, y, s, color, className }: { mark: UtttMark; x: number; y: number; s: number; color: string; className?: string }) {
  const p = s * 0.24;
  return mark === 'X' ? (
    <g className={cx('ut-mark', className)} stroke={color}>
      <path d={`M${x + p} ${y + p} L${x + s - p} ${y + s - p} M${x + s - p} ${y + p} L${x + p} ${y + s - p}`} />
    </g>
  ) : (
    <g className={cx('ut-mark', className)} stroke={color}>
      <circle cx={x + s / 2} cy={y + s / 2} r={s / 2 - p} />
    </g>
  );
}

export interface UtttBoardProps {
  uv: UtttView;
  colors: Record<UtttMark, string>;
  myMark: UtttMark | null;
  can: boolean;
  onPlace: (board: number, cell: number) => void;
}

export function UtttBoard({ uv, colors, myMark, can, onPlace }: UtttBoardProps) {
  const svg = useRef<SVGSVGElement>(null);
  const [press, setPress] = useState<{ board: number; cell: number } | null>(null);
  const active = new Set(uv.active);
  const turnMark: UtttMark | null = uv.turnId === uv.x ? 'X' : uv.turnId === uv.o ? 'O' : null;

  /** the cell under a pointer, if any */
  const hit = (e: PointerEvent): { board: number; cell: number } | null => {
    const r = svg.current?.getBoundingClientRect();
    if (!r) return null;
    const x = ((e.clientX - r.left) / r.width) * 3 * B;
    const y = ((e.clientY - r.top) / r.height) * 3 * B;
    const bx = Math.floor(x / B);
    const by = Math.floor(y / B);
    if (bx < 0 || by < 0 || bx > 2 || by > 2) return null;
    const cx_ = Math.floor((x - bx * B - PAD) / C);
    const cy_ = Math.floor((y - by * B - PAD) / C);
    if (cx_ < 0 || cy_ < 0 || cx_ > 2 || cy_ > 2) return null;
    return { board: by * 3 + bx, cell: cy_ * 3 + cx_ };
  };
  const legal = (h: { board: number; cell: number } | null) => !!h && active.has(h.board) && uv.cells[h.board * 9 + h.cell] === null;
  const onDown = (e: PointerEvent<SVGSVGElement>) => {
    if (!can) return;
    const h = hit(e);
    if (!legal(h)) return;
    try {
      svg.current?.setPointerCapture(e.pointerId);
    } catch {
      // not a live pointer
    }
    setPress(h);
  };
  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    if (!press) return;
    const h = hit(e);
    if (!h || h.board !== press.board || h.cell !== press.cell) setPress(null);
  };
  const onUp = () => {
    if (press && can) onPlace(press.board, press.cell);
    setPress(null);
  };

  const free = press && myMark ? utttSendAfter(uv.cells, uv.boards, press.board, press.cell, myMark) === null : false;
  const glow = turnMark ? colors[turnMark] : '#fff';
  const lineEnds = uv.line ? [boardMid(uv.line[0]), boardMid(uv.line[2])] : null;

  return (
    <svg
      ref={svg}
      className={cx('ut-svg', can && 'live')}
      viewBox={`0 0 ${3 * B} ${3 * B}`}
      role="img"
      aria-label="Ultimate tic-tac-toe board"
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={() => setPress(null)}
    >
      <rect className="ut-slate" x="0" y="0" width={3 * B} height={3 * B} rx="3" />
      {/* the boards that may be played now */}
      {uv.active.map((b) => (
        <rect key={`a${b}`} className="ut-active" x={(b % 3) * B + 0.8} y={Math.floor(b / 3) * B + 0.8} width={B - 1.6} height={B - 1.6} rx="2" style={{ fill: glow, stroke: glow }} />
      ))}
      {/* thin small grids */}
      <g className="ut-small">
        {Array.from({ length: 9 }, (_, b) => {
          const [x, y] = cellAt(b, 0);
          return [1, 2].map((k) => (
            <g key={`${b}-${k}`} className={cx(uv.boards[b] && 'dim')}>
              <path d={chalk(x + k * C, y + 0.6, x + k * C, y + 3 * C - 0.6, 0.15)} />
              <path d={chalk(x + 0.6, y + k * C, x + 3 * C - 0.6, y + k * C, -0.15)} />
            </g>
          ));
        })}
      </g>
      {/* thick big grid */}
      <g className="ut-big">
        {[1, 2].map((k) => (
          <g key={k}>
            <path d={chalk(k * B, 1.2, k * B, 3 * B - 1.2, 0.5)} />
            <path d={chalk(1.2, k * B, 3 * B - 1.2, k * B, -0.5)} />
          </g>
        ))}
      </g>
      {uv.cells.map((m, i) => {
        if (!m) return null;
        const b = Math.floor(i / 9);
        const [x, y] = cellAt(b, i % 9);
        const isLast = uv.last && uv.last.board === b && uv.last.cell === i % 9;
        return <Mark key={i} mark={m} x={x} y={y} s={C} color={colors[m]} className={cx('small', isLast && 'new', uv.boards[b] && 'faded')} />;
      })}
      {uv.last && <rect className="ut-last" x={cellAt(uv.last.board, uv.last.cell)[0] + 0.5} y={cellAt(uv.last.board, uv.last.cell)[1] + 0.5} width={C - 1} height={C - 1} rx="1.2" />}
      {/* won small boards get a big stamp */}
      {uv.boards.map((w, b) =>
        w === 'X' || w === 'O' ? <Mark key={`w${b}`} mark={w} x={(b % 3) * B + 2} y={Math.floor(b / 3) * B + 2} s={B - 4} color={colors[w]} className="stamp" /> : null,
      )}
      {press && myMark && (
        <g className="ut-press">
          <Mark mark={myMark} x={cellAt(press.board, press.cell)[0]} y={cellAt(press.board, press.cell)[1]} s={C} color={colors[myMark]} className="small ghost" />
          {free ? (
            <text className="ut-free" x={boardMid(press.cell)[0]} y={boardMid(press.cell)[1]}>
              FREE
            </text>
          ) : (
            <>
              <rect className="ut-target" x={(press.cell % 3) * B + 1.5} y={Math.floor(press.cell / 3) * B + 1.5} width={B - 3} height={B - 3} rx="2" />
              {press.cell !== press.board && (
                <line className="ut-send" x1={cellAt(press.board, press.cell)[0] + C / 2} y1={cellAt(press.board, press.cell)[1] + C / 2} x2={boardMid(press.cell)[0]} y2={boardMid(press.cell)[1]} markerEnd="url(#ut-arrow)" />
              )}
            </>
          )}
        </g>
      )}
      {lineEnds && <line className="ut-win" x1={lineEnds[0][0]} y1={lineEnds[0][1]} x2={lineEnds[1][0]} y2={lineEnds[1][1]} />}
      <defs>
        <marker id="ut-arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="#ffe57f" />
        </marker>
      </defs>
    </svg>
  );
}
