import type { CSSProperties } from 'react';
import { cx } from '../../lib/cards';
import { COLORWAR_BURST, type ColorWarCell } from '../../types';
import { neighbours, type BurstFrame } from './useBursts';

// The Colour Wars grid: dark glass tiles, owned ones filled with the owner's colour, bright orbs for the dots (3 = about to burst: it glows and trembles),
// orbs shooting to the neighbours with trails when a cell bursts, captured cells wiped into the new colour

/** where the blobs sit in a cell, by how many there are (percent) */
const SPOTS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [
    [33, 50],
    [67, 50],
  ],
  3: [
    [50, 30],
    [30, 66],
    [70, 66],
  ],
};

function Blobs({ n }: { n: number }) {
  const spots = SPOTS[Math.min(3, n)] ?? [];
  return (
    <>
      {spots.map(([x, y], i) => (
        <i key={i} className="cw-blob" style={{ left: `${x}%`, top: `${y}%` }} />
      ))}
      {n > 3 && <b className="cw-more">{n}</b>}
    </>
  );
}

export function CwBoard({
  size,
  cells,
  frame,
  colorOf,
  mover,
  valid,
  onTap,
}: {
  size: number;
  mover: string;
  cells: ColorWarCell[];
  frame: BurstFrame | null;
  colorOf: (id: string) => string;
  valid: (cell: number) => boolean;
  onTap: (cell: number) => void;
}) {
  const flips = new Set(frame?.flips ?? []);
  return (
    <div className={cx('cw-grid', size >= 8 && 'big')} style={{ '--n': size } as CSSProperties}>
      {cells.map((c, i) => {
        const ok = valid(i);
        return (
          <button
            key={i}
            type="button"
            className={cx('cw-cell', c.owner && 'owned', c.dots >= COLORWAR_BURST - 1 && 'ready', ok && 'ok', flips.has(i) && 'flip', frame?.tapped === i && 'tapped')}
            style={c.owner ? ({ '--pc': colorOf(c.owner) } as CSSProperties) : undefined}
            disabled={!ok}
            onClick={() => onTap(i)}
            aria-label={c.owner ? `${c.dots} dots` : 'Empty cell'}
          >
            <span key={`${c.owner}:${flips.has(i) ? 'f' : ''}`} className="cw-cell-in">
              {flips.has(i) && <i className="cw-wipe" />}
              <Blobs n={c.dots} />
            </span>
          </button>
        );
      })}
      {/* blobs in flight from each bursting cell to its neighbours */}
      {frame?.flying.map((b) =>
        neighbours(size, b).map((n) => {
          const dx = (n % size) - (b % size);
          const dy = Math.floor(n / size) - Math.floor(b / size);
          return (
            <span
              key={`${b}-${n}`}
              className="cw-fly"
              style={
                {
                  left: `${((b % size) * 100) / size}%`,
                  top: `${(Math.floor(b / size) * 100) / size}%`,
                  '--dx': `${dx * 100}%`,
                  '--dy': `${dy * 100}%`,
                  '--rot': `${dx === 1 ? 0 : dx === -1 ? 180 : dy === 1 ? 90 : -90}deg`,
                  '--pc': mover,
                } as CSSProperties
              }
              aria-hidden
            >
              <i className="cw-trail" />
              <i className="cw-blob" />
            </span>
          );
        }),
      )}
      {frame?.flying.map((b) => (
        <span
          key={`ring${b}`}
          className="cw-ring"
          style={{
            left: `${((b % size) * 100) / size}%`,
            top: `${(Math.floor(b / size) * 100) / size}%`,
          }}
          aria-hidden
        />
      ))}
    </div>
  );
}
