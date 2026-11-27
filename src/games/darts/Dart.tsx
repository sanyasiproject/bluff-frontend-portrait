import type { CSSProperties } from 'react';
import { cx } from '../../lib/cards';
import { BOARD_R } from './Board';

// A dart stuck in the board: the tip at its landing point, barrel and flight leaning up and right in the thrower's colour.
// It flies in from below, lands with a thud and quivers

export function Dart({ x, y, color, fresh, out }: { x: number; y: number; color: string; fresh: boolean; out?: boolean }) {
  const style = {
    left: `${50 + (x / BOARD_R) * 50}%`,
    top: `${50 - (y / BOARD_R) * 50}%`,
    '--pc': color,
  } as CSSProperties;
  return (
    <span className={cx('dt-dart', fresh && 'fresh', out && 'out')} style={style} aria-hidden>
      <span className="dt-dart-body">
        <svg viewBox="0 0 40 40" width="100%" height="100%">
          {/* shadow on the board */}
          <path d="M2 38 L30 14" stroke="rgba(0,0,0,0.35)" strokeWidth="2.6" strokeLinecap="round" transform="translate(2 2)" />
          {/* steel tip, barrel, shaft */}
          <path d="M2 38 L9 31" stroke="#cfd8dc" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M9 31 L19 21" stroke="#546e7a" strokeWidth="4" strokeLinecap="round" />
          <path d="M10 30 L18 22" stroke="#b0bec5" strokeWidth="1.2" strokeLinecap="round" strokeDasharray="1.2 1.3" />
          <path d="M19 21 L28 12" stroke="#263238" strokeWidth="1.8" strokeLinecap="round" />
          {/* flights in the thrower's colour */}
          <path d="M27 13 L38 4 L36 15 Z" fill="var(--pc)" stroke="rgba(0,0,0,0.35)" strokeWidth="0.6" />
          <path d="M27 13 L25 2 L36 4 Z" fill="var(--pc)" stroke="rgba(0,0,0,0.35)" strokeWidth="0.6" opacity="0.8" />
          <path d="M27 13 L36 5" stroke="rgba(255,255,255,0.7)" strokeWidth="0.6" />
        </svg>
      </span>
    </span>
  );
}
