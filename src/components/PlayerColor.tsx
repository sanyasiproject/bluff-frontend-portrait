import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { cx } from '../lib/cards';
import { PARTY_COLORS } from '../types';
import '../styles/player-color.css';

// Who is which colour: the colour band and piece icon on a seat, my "You · Red" chip and the "You are Red" banner

const PARTY_NAMES: Record<string, string> = { [PARTY_COLORS[0]]: 'Red', [PARTY_COLORS[1]]: 'Blue', [PARTY_COLORS[2]]: 'Green', [PARTY_COLORS[3]]: 'Yellow' };

/** a colour's name: a Ludo colour key or a party colour */
export const colorName = (color: string): string => PARTY_NAMES[color] ?? (color ? color[0].toUpperCase() + color.slice(1) : '');

/** a filled colour dot; "blob" draws Spikes' blob with eyes */
export function ColorDot({ color, blob }: { color: string; blob?: boolean }) {
  return <i className={cx('pc-dot', blob && 'blob')} style={{ '--pc': color } as CSSProperties} aria-hidden />;
}

/** the seat's colour band, and under the stats the piece icon with "You · Red" on mine (or the colour's name if asked) */
export function ColorTag({ color, name, icon, mine, showName }: { color: string; name: string; icon: ReactNode; mine: boolean; showName?: boolean }) {
  return (
    <>
      <i className="pc-band" style={{ '--pc': color } as CSSProperties} aria-hidden />
      <span className={cx('pc-tag', mine && 'mine')} style={{ '--pc': color } as CSSProperties} aria-label={mine ? `You are ${name}` : name}>
        <span className="pc-icon">{icon}</span>
        {mine ? <b>You · {name}</b> : showName ? <b>{name}</b> : null}
      </span>
    </>
  );
}

/** "You are Red" for 2 s when a game starts (or when I open a game in progress) */
export function YouAreBanner({ color, name, icon, playing }: { color: string; name: string; icon: ReactNode; playing: boolean }) {
  const [shown, setShown] = useState(playing);
  useEffect(() => {
    if (!playing) return;
    setShown(true);
    const t = window.setTimeout(() => setShown(false), 2000);
    return () => window.clearTimeout(t);
  }, [playing]);
  if (!shown || !name) return null;
  return (
    <div className="pc-banner" style={{ '--pc': color } as CSSProperties} role="status">
      <span className="pc-icon">{icon}</span>
      <b>You are {name}</b>
    </div>
  );
}
