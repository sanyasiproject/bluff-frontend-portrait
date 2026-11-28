import { useLayoutEffect, useState, type MutableRefObject } from 'react';
import { cx } from '../../lib/cards';
import type { SeaPower } from '../../types';

// Sea Battle's small parts: the shooter → target arrow over the seat row, and the powers bar

export const POWER_ICON: Record<SeaPower, string> = { radar: '📡', salvo: '🎆', torpedo: '🚀' };
export const POWER_NAME: Record<SeaPower, string> = { radar: 'Radar', salvo: 'Salvo', torpedo: 'Torpedo' };
export const POWER_HINT: Record<SeaPower, string> = {
  radar: 'Tap a cell: count the ship cells in the 3 × 3 round it',
  salvo: 'Tap 3 cells to fire at once',
  torpedo: 'Tap any cell: the torpedo runs along that row from the left',
};

/** a curved arrow from the shooter's chip to the target's, drawn over the chips row */
export function AimArrow({ row, seats, from, to }: { row: MutableRefObject<HTMLDivElement | null>; seats: MutableRefObject<Map<string, HTMLElement>>; from: string | null; to: string | null }) {
  const [path, setPath] = useState<string | null>(null);
  useLayoutEffect(() => {
    const box = row.current?.getBoundingClientRect();
    const a = from ? seats.current.get(from)?.getBoundingClientRect() : undefined;
    const b = to ? seats.current.get(to)?.getBoundingClientRect() : undefined;
    if (!box || !a || !b || from === to) return setPath(null);
    const ax = a.left + a.width / 2 - box.left;
    const bx = b.left + b.width / 2 - box.left;
    const y = a.top - box.top + 4;
    const lift = Math.min(26, Math.abs(bx - ax) / 3 + 10);
    const s = Math.sign(bx - ax);
    setPath(`M${ax + s * 14} ${y + 6} Q${(ax + bx) / 2} ${y - lift} ${bx - s * 14} ${y + 6}`);
  });
  if (!path) return null;
  return (
    <svg className="sb-arrow" aria-hidden>
      <defs>
        <marker id="sb-head" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10z" fill="#ff5252" />
        </marker>
      </defs>
      <path d={path} fill="none" stroke="#ff5252" strokeWidth="3" strokeDasharray="6 4" markerEnd="url(#sb-head)" />
    </svg>
  );
}

/** my powers: tap one to use it on this shot (tap again to go back to a normal shot) */
export function PowersBar({ held, mode, can, onPick }: { held: SeaPower[]; mode: SeaPower | 'fire'; can: boolean; onPick: (p: SeaPower | 'fire') => void }) {
  return (
    <div className="sb-powers">
      <span className="sb-powers-label">⚡</span>
      {held.length === 0 && <span className="sb-powers-none">Sink a ship to earn a power</span>}
      {held.map((p, i) => (
        <button key={`${p}${i}`} className={cx('sb-power', mode === p && 'on')} disabled={!can} onClick={() => onPick(mode === p ? 'fire' : p)}>
          {POWER_ICON[p]} {POWER_NAME[p]}
        </button>
      ))}
    </div>
  );
}
