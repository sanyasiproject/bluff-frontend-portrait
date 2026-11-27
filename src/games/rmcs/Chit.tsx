import type { CSSProperties } from 'react';
import { cx } from '../../lib/cards';
import { RMCS_EMOJI, RMCS_NAMES, RMCS_POINTS, type RmcsRole } from '../../types';

// A paper chit: folded (a little rolled note), or unfolded showing the role

export type Spot = 'bottom' | 'left' | 'top' | 'right';

interface Props {
  spot: Spot;
  /** the role when this chit is open for me to see, else null (stays folded) */
  role: RmcsRole | null;
  /** the owner has opened it (others see only a tick) */
  opened: boolean;
  /** my own chit, still folded: tap to open */
  tapToOpen?: boolean;
  /** the Mantri can point at this one */
  candidate?: boolean;
  /** guess phase, seen by everyone but the Mantri: one of the two who could be the Chor */
  suspect?: boolean;
  /** glowing Mantri spotlight */
  spotlight?: boolean;
  /** result: the Chor got away and runs off */
  run?: boolean;
  /** result: the Chor was caught */
  caught?: boolean;
  /** points flying up at result */
  points?: number | null;
  /** re-keyed each round so it flies out again */
  round: number;
  big?: boolean;
  onTap?: () => void;
  label?: string;
}

/** the offset from the table's centre to each spot, for the deal flight */
const FROM: Record<Spot, [string, string]> = { bottom: ['0px', '-150px'], top: ['0px', '150px'], left: ['120px', '0px'], right: ['-120px', '0px'] };
const DELAY: Record<Spot, number> = { bottom: 0, left: 1, top: 2, right: 3 };

export function Chit({ spot, role, opened, tapToOpen, candidate, suspect, spotlight, run, caught, points, round, big, onTap, label }: Props) {
  const open = role !== null;
  const tappable = !!(tapToOpen || candidate) && !!onTap;
  const style = { '--fx': FROM[spot][0], '--fy': FROM[spot][1], '--d': `${DELAY[spot] * 110}ms` } as CSSProperties;
  return (
    <div className={cx('rm-chit-slot', `at-${spot}`, big && 'big')} style={style}>
      <button
        key={round}
        type="button"
        className={cx('rm-chit', open ? 'open' : 'folded', role && `role-${role}`, tappable && 'live', candidate && 'candidate', suspect && 'suspect', spotlight && 'spot', run && 'run', caught && 'caught')}
        disabled={!tappable}
        aria-label={label ?? (open && role ? `${RMCS_NAMES[role]} chit` : 'Folded chit')}
        onClick={tappable ? onTap : undefined}
      >
        {open && role ? (
          <span key="open" className="rm-paper rm-face">
            <i aria-hidden>{RMCS_EMOJI[role]}</i>
            <b>{RMCS_NAMES[role]}</b>
            <small className="rm-face-pts">{RMCS_POINTS[role]}</small>
          </span>
        ) : (
          <span key="fold" className="rm-paper rm-fold" aria-hidden>
            <span className="rm-fold-line" />
            {opened && <em className="rm-tick">✓</em>}
            {tapToOpen && <em className="rm-tap">Tap!</em>}
          </span>
        )}
        {(candidate || suspect) && (
          <span className={cx('rm-ask', candidate && 'mine')} aria-hidden>
            {candidate ? 'Chor? Tap!' : 'Chor?'}
          </span>
        )}
        {caught && <span className="rm-cuffs" aria-hidden>⛓️</span>}
        {run && <span className="rm-dust" aria-hidden>💨</span>}
      </button>
      {points != null && (
        <span key={`pts-${round}`} className={cx('rm-pts', points === 0 && 'zero')} aria-hidden>
          +{points}
        </span>
      )}
    </div>
  );
}
