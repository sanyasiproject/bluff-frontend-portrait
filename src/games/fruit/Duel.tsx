import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { cx } from '../../lib/cards';
import type { FruitItemKind } from '../../types';
import { FruitArt, Juice, MagnetArt, Sword } from './Art';

// The duel stage: a plate in the middle where one item pops up, everyone's talwar round the edge pointing at it

export interface DuelPlayer {
  id: string;
  name: string;
  color: string;
  me: boolean;
  /** a magnet holds this sword for this many more items */
  slow: number;
}
export interface DuelResult {
  round: number;
  kind: FruitItemKind;
  winner: string | null;
  /** who struck (lunges in), their time in ms */
  reactions: Record<string, number | null>;
  slowed: string[];
}

/** where each seat sits round the plate, clockwise from the bottom (me); 0° = bottom, 90° = left, 180° = top */
const ANGLES: Record<number, number[]> = { 1: [0], 2: [0, 180], 3: [0, 125, 235], 4: [0, 90, 180, 270] };

export function Duel({
  players,
  item,
  result,
  swing,
  count,
  center,
  early,
}: {
  players: DuelPlayer[];
  item: { round: number; kind: FruitItemKind } | null;
  result: DuelResult | null;
  /** my own swing: a new key each strike, slow while a magnet holds me */
  swing: { key: number; slow: boolean } | null;
  count: number | null;
  /** words on the plate between items ("Get ready…") */
  center: ReactNode;
  /** a new key on each too-early tap: the plate wobbles */
  early: number;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [side, setSide] = useState(300);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => setSide(Math.max(160, Math.min(el.clientWidth, el.clientHeight)));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const itemPx = Math.round(side * 0.36);
  const angles = ANGLES[Math.min(4, Math.max(1, players.length))];
  const struck = (id: string) => result?.reactions[id] != null;
  const shown = item ?? (result ? { round: result.round, kind: result.kind } : null);
  const cut = !item && result && result.kind !== 'magnet' && result.winner;
  const zapped = !item && result?.kind === 'magnet' && result.slowed.length > 0;

  return (
    <div className="fr-duel" ref={box} style={{ '--side': `${side}px` } as CSSProperties}>
      <div className="fr-mat" aria-hidden />
      {players.map((p, i) => {
        const won = !item && result?.winner === p.id;
        const lunge = !item && result && struck(p.id);
        return (
          <div key={p.id} className={cx('fr-seat', p.me && 'me')} style={{ '--pc': p.color, transform: `rotate(${angles[i] ?? 0}deg)` } as CSSProperties}>
            <div
              key={p.me && swing ? `s${swing.key}` : lunge ? `r${result!.round}` : 'idle'}
              className={cx('fr-sword', p.slow > 0 && 'slowed', p.me && swing && !lunge && (swing.slow ? 'swing-slow' : 'swing'), lunge && (won ? 'win' : 'lunge'), lunge && p.slow > 0 && 'drag')}
            >
              <Sword color={p.color} />
              {p.slow > 0 && <span className="fr-sword-mag">🧲</span>}
            </div>
            <span className="fr-seat-name" style={{ transform: `rotate(${-(angles[i] ?? 0)}deg)` }} data-no-translate={p.me ? undefined : true}>
              {p.me ? 'You' : p.name}
            </span>
          </div>
        );
      })}

      <div className={cx('fr-plate', early > 0 && 'early')} key={`plate${early}`}>
        <span className="fr-plate-dish" aria-hidden />
        {shown && shown.kind !== 'magnet' && !cut && (
          <span key={`i${shown.round}`} className="fr-item pop">
            <FruitArt kind={shown.kind} px={itemPx} />
          </span>
        )}
        {shown && shown.kind === 'magnet' && (
          <span key={`m${shown.round}`} className={cx('fr-item pop', zapped && 'zap')}>
            <MagnetArt px={itemPx} />
            {item && <b className="fr-dont">DON'T CUT!</b>}
          </span>
        )}
        {cut && result && result.kind !== 'magnet' && (
          <span key={`c${result.round}`} className="fr-item cut">
            <FruitArt kind={result.kind} px={itemPx} half="l" />
            <FruitArt kind={result.kind} px={itemPx} half="r" />
            <span className="fr-slash" style={{ '--pc': players.find((p) => p.id === result.winner)?.color } as CSSProperties} />
            <Juice kind={result.kind} />
          </span>
        )}
        {!shown && count === null && <span className="fr-plate-words">{center}</span>}
        {count !== null && (
          <span className="fr-plate-count" aria-live="polite">
            <b key={count} className={cx(count === 0 && 'go')}>
              {count === 0 ? 'GO!' : count}
            </b>
          </span>
        )}
      </div>
    </div>
  );
}
