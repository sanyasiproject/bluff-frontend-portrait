import { cx } from '../../lib/cards';
import type { LudoColor } from '../../types';
import { Dice } from './Dice';
import { Goti } from './Goti';

// The dice's one fixed spot under the board (Ludo and Saanp Seedhi): a ring in the turn player's colour, their goti and name

export function DiceDock({
  value,
  seq,
  skin,
  canRoll,
  color,
  gotiStyle,
  who,
  mine,
  watching,
  hint,
  onRoll,
}: {
  value: number | null;
  seq: number;
  skin: string;
  canRoll: boolean;
  /** the turn player's colour, null between games */
  color: LudoColor | null;
  gotiStyle: string;
  /** the turn player's name */
  who: string | null;
  mine: boolean;
  watching: boolean;
  /** the small line when it isn't mine to roll, e.g. "is moving" */
  hint?: string;
  onRoll: () => void;
}) {
  const line = !who ? '🏁' : mine ? 'Your turn' : `${who}'s turn`;
  return (
    <button
      type="button"
      className={cx('ld-roll ld-dock', color && `ld-${color}`, canRoll && 'live', mine && 'mine')}
      disabled={!canRoll}
      aria-label={canRoll ? 'Your turn: roll the dice' : `Dice, ${line}`}
      onClick={onRoll}
    >
      <Dice value={value} seq={seq} skin={skin} />
      <span className="ld-dock-who">
        {color && (
          <span className="pc-icon" aria-hidden>
            <Goti color={color} style={gotiStyle} id={`dock-${color}`} />
          </span>
        )}
        <b data-no-translate>{line}</b>
      </span>
      <span className="ld-roll-label">{canRoll ? 'Tap to roll' : (hint ?? (watching ? '👀 Watching' : ''))}</span>
    </button>
  );
}
