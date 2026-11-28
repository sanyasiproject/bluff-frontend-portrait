import type { CSSProperties } from 'react';
import type { FruitItemKind } from '../../types';
import { CutFace, FruitArt } from './Art';
import { JUICE, SIZE } from './sprites';

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

/** the cut fruit: two halves split along the winner's line, each showing its wet cut face, fly apart and spin down; juice sprays and splats.
 *  `now`: the blade already went through (my own swing), so it splits at once instead of waiting for the blade's contact */
export function Split({ kind, px, angle, color, now }: { kind: Exclude<FruitItemKind, 'magnet'>; px: number; angle: number; color: string; now?: boolean }) {
  const juice = JUICE[kind];
  // a bunch of grapes shows only one cut grape's face
  const face = Math.round(((px * 2) / 3) * SIZE[kind] * (kind === 'grapes' ? 0.42 : kind === 'banana' ? 0.6 : 0.94));
  return (
    <span
      className="fr-item fr-split"
      style={{ '--cut': `${angle}deg`, '--pc': color, '--juice': juice, '--cd': now ? '0s' : 'var(--contact)', width: px, height: px } as CSSProperties}
      aria-hidden
    >
      <span className="fr-splat" />
      {(['l', 'r'] as const).map((h) => (
        <span key={h} className={`fr-piece ${h}`}>
          <span className="fr-piece-rot">
            <span className="fr-piece-move">
              <span className="fr-piece-clip">
                <span className="fr-piece-up">
                  <FruitArt kind={kind} px={px} />
                </span>
                <span className="fr-face">
                  <CutFace kind={kind} px={face} />
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

/** sparks where a yanked blade clangs and sticks to the magnet */
export function Sparks() {
  return (
    <svg className="fr-sparks" viewBox="-20 -20 40 40" aria-hidden>
      {Array.from({ length: 9 }, (_, i) => {
        const a = (i * 360) / 9;
        return <path key={i} d={i % 3 ? 'M 0 -5 L 0 -14' : 'M 0 -6 L 0 -19'} transform={`rotate(${a})`} stroke={i % 2 ? '#ffeb3b' : '#fff'} strokeWidth="2.2" strokeLinecap="round" />;
      })}
      <circle r="4.5" fill="#fff" />
      <circle r="8" fill="none" stroke="rgba(255,235,59,0.7)" strokeWidth="1.2" />
    </svg>
  );
}
