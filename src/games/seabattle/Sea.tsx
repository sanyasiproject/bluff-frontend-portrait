import { memo, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import { cx } from '../../lib/cards';
import { SEA_COLS, SEA_SIZE, type SeaBoardView, type SeaShip } from '../../types';
import { Fire, ShipArt, Splash } from './ShipArt';

// One 10 × 10 sea: the animated ocean, A–J / 1–10, ships (mine, or sunk ones), shot marks, radar boxes and effects

export interface SeaFx {
  key: string;
  x: number;
  y: number;
  kind: 'miss' | 'hit' | 'sunk';
}

const pct = (n: number) => `${(n / SEA_SIZE) * 100}%`;

/** a ship placed on the grid (drawn lying right, turned for a ship that runs down) */
export function ShipOnGrid({ ship, sunk, sinking, bad, style }: { ship: SeaShip; sunk?: boolean; sinking?: boolean; bad?: boolean; style?: CSSProperties }) {
  const box: CSSProperties = ship.v
    ? { left: pct(ship.x + 1), top: pct(ship.y), width: pct(ship.len), height: pct(1), transform: 'rotate(90deg)', transformOrigin: '0 0' }
    : { left: pct(ship.x), top: pct(ship.y), width: pct(ship.len), height: pct(1) };
  return (
    <span className={cx('sb-ship', ship.v && 'v', sinking && 'sinking', bad && 'bad')} style={{ ...box, ...style }}>
      <ShipArt len={ship.len} sunk={sunk} />
    </span>
  );
}

export const Sea = memo(function Sea({
  board,
  ships,
  radars,
  live,
  aim,
  fx,
  sinking,
  size,
  onCell,
  onPointerDown,
  children,
  label,
}: {
  board: SeaBoardView | null;
  /** the ships to draw (mine, or the sunk ones I may see) */
  ships: (SeaShip & { sunk?: boolean })[];
  radars?: { x: number; y: number; count: number }[];
  live?: boolean;
  /** cells to highlight (aim, salvo picks, a torpedo row) */
  aim?: Set<number>;
  fx?: SeaFx[];
  /** keys "x,y,len,v" of ships sinking right now */
  sinking?: Set<string>;
  size: 'big' | 'mini';
  onCell?: (x: number, y: number) => void;
  onPointerDown?: (e: PointerEvent<HTMLDivElement>) => void;
  children?: ReactNode;
  label?: string;
}) {
  const shots = board?.shots ?? [];
  return (
    <div className={cx('sb-sea', size, live && 'live')} aria-label={label}>
      {size === 'big' && (
        <>
          <div className="sb-coords top" aria-hidden>
            {SEA_COLS.split('').map((c) => (
              <span key={c}>{c}</span>
            ))}
          </div>
          <div className="sb-coords side" aria-hidden>
            {Array.from({ length: SEA_SIZE }, (_, i) => (
              <span key={i}>{i + 1}</span>
            ))}
          </div>
        </>
      )}
      <div className="sb-grid" onPointerDown={onPointerDown}>
        {ships.map((s) => (
          <ShipOnGrid key={`${s.x},${s.y},${s.len},${s.v}`} ship={s} sunk={s.sunk} sinking={sinking?.has(`${s.x},${s.y},${s.len},${s.v}`)} />
        ))}
        {Array.from({ length: SEA_SIZE * SEA_SIZE }, (_, i) => {
          const x = i % SEA_SIZE;
          const y = Math.floor(i / SEA_SIZE);
          const s = shots[i] ?? 0;
          const open = s === 0;
          return (
            <button
              key={i}
              type="button"
              className={cx('sb-cell', open && 'open', s === 1 && 'miss', s >= 2 && 'hit', s === 3 && 'sunk', aim?.has(i) && 'aim')}
              tabIndex={onCell && open ? 0 : -1}
              aria-label={size === 'big' ? `${SEA_COLS[x]}${y + 1}` : undefined}
              onClick={onCell ? () => onCell(x, y) : undefined}
            >
              {s === 2 && <i className="sb-hit-mark" />}
            </button>
          );
        })}
        {radars?.map((r) => (
          <span key={`${r.x},${r.y}`} className="sb-radar" style={{ left: pct(r.x), top: pct(r.y), width: pct(3), height: pct(3) }}>
            {r.count}
          </span>
        ))}
        {fx?.map((f) => (
          <span key={f.key} className="sb-fx" style={{ left: pct(f.x), top: pct(f.y), width: pct(1), height: pct(1) }}>
            {f.kind === 'miss' ? <Splash /> : (
              <>
                <i className="sb-boom" />
                <Fire big={f.kind === 'sunk'} />
              </>
            )}
          </span>
        ))}
        {children}
      </div>
    </div>
  );
});
