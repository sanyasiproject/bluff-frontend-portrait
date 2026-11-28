import type { CSSProperties } from 'react';
import type { FruitItemKind } from '../../types';
import { FruitArt } from './Art';
import { JUICE } from './sprites';

// The slash effects: a curved trail where a blade swept, the fruit splitting along the cut, juice, and magnet sparks

/** the bright curved trail a blade leaves across the plate (in its seat's frame): a white core in a glow of the player's colour */
export function SlashArc({ color, faint }: { color: string; faint?: boolean }) {
  const d = 'M -34 11 A 42 42 0 0 1 34 11 A 47 47 0 0 0 -34 11 Z';
  return (
    <svg className={faint ? 'fr-arc faint' : 'fr-arc'} viewBox="-50 -30 100 60" style={{ '--pc': color } as CSSProperties} aria-hidden>
      <path d={d} fill="none" stroke={color} strokeWidth="7" strokeLinejoin="round" opacity="0.75" />
      <path d={d} fill="#fff" stroke="#fff" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}

/** the cut fruit: two halves split along the winner's line, fly apart and spin down; juice sprays and splats the plate */
export function Split({ kind, px, angle, color }: { kind: Exclude<FruitItemKind, 'magnet'>; px: number; angle: number; color: string }) {
  const juice = JUICE[kind];
  return (
    <span className="fr-item fr-split" style={{ '--cut': `${angle}deg`, '--pc': color, '--juice': juice, width: px, height: px } as CSSProperties} aria-hidden>
      <span className="fr-splat" />
      {(['l', 'r'] as const).map((h) => (
        <span key={h} className={`fr-piece ${h}`}>
          <span className="fr-piece-rot">
            <span className="fr-piece-move">
              <span className="fr-piece-clip">
                <span className="fr-piece-up">
                  <FruitArt kind={kind} px={px} />
                </span>
              </span>
            </span>
          </span>
        </span>
      ))}
      <span className="fr-cutline" />
      <span className="fr-spray">
        {Array.from({ length: 14 }, (_, i) => (
          <i key={i} style={{ '--a': `${i * 26 + (i % 2) * 9}deg`, '--d': `${55 + (i % 4) * 16}%`, '--s': `${0.6 + (i % 3) * 0.3}` } as CSSProperties} />
        ))}
      </span>
    </span>
  );
}

/** sparks where a yanked blade sticks to the magnet */
export function Sparks() {
  return (
    <svg className="fr-sparks" viewBox="-20 -20 40 40" aria-hidden>
      {Array.from({ length: 7 }, (_, i) => {
        const a = (i * 360) / 7;
        return <path key={i} d="M 0 -6 L 0 -16" transform={`rotate(${a})`} stroke={i % 2 ? '#ffeb3b' : '#fff'} strokeWidth="2.4" strokeLinecap="round" />;
      })}
      <circle r="4" fill="#fff" />
    </svg>
  );
}
