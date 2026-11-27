import type { CSSProperties } from 'react';
import { cx } from '../../lib/cards';
import { LUDO_BOARDS, LUDO_DICE, LUDO_GOTIS, saveLudoLook, useLudoLook, type LudoLook, type LudoLookChoice } from './looks';
import '../../styles/ludo.css';

const ROWS: { key: keyof LudoLookChoice; label: string; list: LudoLook[] }[] = [
  { key: 'board', label: 'Board', list: LUDO_BOARDS },
  { key: 'goti', label: 'Gotis', list: LUDO_GOTIS },
  { key: 'dice', label: 'Dice', list: LUDO_DICE },
];

/** Ludo board, goti and dice looks saved on this phone and shown to the room; higher levels unlock more */
export function LudoLookPicker({ level, compact, host }: { level: number; compact?: boolean; host?: boolean }) {
  const look = useLudoLook(level);
  // at a table: whether my board is the one everyone plays on
  const boardNote = host === undefined ? "Board: when you host, everyone plays on yours" : host ? 'Board: you host, so everyone plays on yours' : "Board: the host's board is used at the table";
  return (
    <section className={cx('panel stack-tight ld-looks', compact && 'compact')}>
      <h3 className="section-title">🎲 Ludo looks</h3>
      <p className="muted small">Your gotis and dice: everyone sees them.{!compact && ' Higher levels unlock more.'}</p>
      {ROWS.map((row) => (
        <div key={row.key}>
          <p className="label">{row.label}</p>
          {row.key === 'board' && <p className="muted small ld-look-note">{boardNote}</p>}
          <div className="ld-look-row" role="radiogroup" aria-label={row.label}>
            {row.list.map((l) => {
              const locked = l.level > level;
              const on = look[row.key] === l.id;
              return (
                <button
                  key={l.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  disabled={locked}
                  className={cx('ld-look', on && 'on', locked && 'locked')}
                  style={{ '--a': l.colors[0], '--b': l.colors[1] } as CSSProperties}
                  onClick={() => saveLudoLook({ [row.key]: l.id })}
                >
                  <span className="ld-look-swatch" aria-hidden>
                    {l.emoji}
                  </span>
                  <b>{l.name}</b>
                  <small>{locked ? `🔒 Level ${l.level}` : on ? 'Using' : 'Use'}</small>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}
