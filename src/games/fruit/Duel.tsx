import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { cx } from '../../lib/cards';
import { reducedMotion } from '../../lib/motion';
import type { FruitItemKind } from '../../types';
import { FruitArt, MagnetArt, Sword } from './Art';
import { SlashArc, Split, Sparks } from './Slash';

// The duel stage: a plate in the middle where one item pops up, everyone's talwar round the edge pointing at it.
// A strike is a real slash: wind-up, a fast arc through the item with a bright trail, a hit-stop, then the follow-through

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
/** the blade meets the item this far into a swing (after the wind-up) */
export const CONTACT_MS = 110;

type Mode = 'swing' | 'swing-slow' | 'win' | 'late' | 'drag' | 'yank' | null;

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
  /** my own swing: a new key each strike, slow while a magnet holds me; hit = it meets a fruit */
  swing: { key: number; slow: boolean; hit?: boolean } | null;
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
  const res = !item && result ? result : null;
  const shown = item ?? (res ? { round: res.round, kind: res.kind } : null);
  const cut = res && res.kind !== 'magnet' && res.winner ? res : null;
  const zapped = res?.kind === 'magnet' && res.slowed.length > 0;
  const winAngle = cut ? (angles[players.findIndex((p) => p.id === cut.winner)] ?? 0) : 0;
  const winMs = cut ? (cut.reactions[cut.winner!] ?? 0) : 0;

  // contact: a little screen shake (my own hit, or the winner's cut)
  const shake = () => {
    if (reducedMotion()) return;
    box.current?.animate(
      [{ transform: 'none' }, { transform: 'translate(-5px, 3px)' }, { transform: 'translate(4px, -3px)' }, { transform: 'translate(-2px, 1px)' }, { transform: 'none' }],
      { duration: 200, delay: CONTACT_MS, easing: 'linear' },
    );
  };
  useEffect(() => {
    if (swing?.hit) shake();
  }, [swing?.key]);
  useEffect(() => {
    if (cut && !(swing?.key === cut.round && players.find((p) => p.me)?.id === cut.winner)) shake();
  }, [cut?.round]);

  const modeOf = (p: DuelPlayer): Mode => {
    const mine = p.me && swing && (!res || swing.key === res.round);
    if (res?.kind === 'magnet' && res.slowed.includes(p.id)) return 'yank';
    if (mine) return swing.slow ? 'swing-slow' : 'swing';
    if (!res || res.reactions[p.id] == null) return null;
    if (res.winner === p.id) return 'win';
    return p.slow > 0 ? 'drag' : 'late';
  };

  return (
    <div className="fr-duel" ref={box} style={{ '--side': `${side}px` } as CSSProperties}>
      <div className="fr-mat" aria-hidden />
      {players.map((p, i) => {
        const mode = modeOf(p);
        const round = res?.round ?? swing?.key ?? 0;
        // a loser's blade arrives after the cut, later the slower they were
        const late = mode === 'late' ? Math.round(Math.max(90, Math.min(380, 90 + ((res!.reactions[p.id] ?? 0) - winMs) * 0.6))) : 0;
        const k = mode ? `${mode}${round}` : 'idle';
        return (
          <div key={p.id} className={cx('fr-seat', p.me && 'me')} style={{ '--pc': p.color, '--late': `${late}ms`, transform: `rotate(${angles[i] ?? 0}deg)` } as CSSProperties}>
            <div key={k} className={cx('fr-sword', p.slow > 0 && 'slowed', mode && `sl-${mode}`, mode === 'swing-slow' && 'swing-slow', mode === 'drag' && 'drag')}>
              <Sword color={p.color} />
              {p.slow > 0 && <span className="fr-sword-mag">🧲</span>}
            </div>
            {(mode === 'swing' || mode === 'win' || mode === 'late') && <SlashArc key={`a${k}`} color={p.color} faint={mode === 'late'} />}
            {mode === 'yank' && <Sparks key={`y${k}`} />}
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
        {cut && cut.kind !== 'magnet' && (
          <Split key={`c${cut.round}`} kind={cut.kind} px={itemPx} angle={winAngle + 70} color={players.find((p) => p.id === cut.winner)?.color ?? '#fff'} />
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
