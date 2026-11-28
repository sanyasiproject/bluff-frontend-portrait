import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { cx } from '../../lib/cards';
import { reducedMotion } from '../../lib/motion';
import type { FruitItemKind } from '../../types';
import { FruitArt, MagnetArt, Sword } from './Art';
import { SlashArc, Split, Sparks } from './Slash';

// The duel stage: a plate in the middle where one item pops up, everyone's talwar resting at their seat edge, pointing at it.
// One tap = one slash: wind-up, a fast run across the gap and through the item, a hit-stop, the follow-through, back to rest

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
/** the blade meets the item this far into a swing (after the wind-up and the run across the gap); fruit.css --contact matches */
export const CONTACT_MS = 170;

/** cut: my own swing (held in follow-through until the result); win / late / drag: others' swings when the result says they struck */
type Mode = 'cut' | 'cut-slow' | 'win' | 'late' | 'drag' | 'yank' | null;

export function Duel({
  players,
  round,
  item,
  result,
  swing,
  count,
  center,
  early,
}: {
  players: DuelPlayer[];
  /** the latest item number: my swing belongs to it until the next item shows */
  round: number;
  item: { round: number; kind: FruitItemKind } | null;
  result: DuelResult | null;
  /** my own swing: one per tap that counted; slow while a magnet holds me; hit = it meets a fruit; magnet = I struck the magnet */
  swing: { key: number; slow: boolean; hit?: boolean; magnet?: boolean } | null;
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
  const meId = players.find((p) => p.me)?.id;
  const myRound = swing && swing.key === round ? swing.key : null;
  // my blade already went through: the result only splits the fruit along my cut
  const myCut = !!cut && cut.winner === meId && myRound === cut.round;

  // contact: a little screen shake (my own hit at my contact, or someone else's winning cut)
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
    if (cut && !myCut) shake();
  }, [cut?.round]);

  const modeOf = (p: DuelPlayer): Mode => {
    if (p.me && swing && myRound !== null) return swing.magnet ? 'yank' : swing.slow ? 'cut-slow' : 'cut';
    if (!res || res.reactions[p.id] == null) return null;
    if (res.kind === 'magnet') return res.slowed.includes(p.id) ? 'yank' : null;
    if (res.winner === p.id) return 'win';
    return p.slow > 0 ? 'drag' : 'late';
  };

  return (
    <div className="fr-duel" ref={box} style={{ '--side': `${side}px` } as CSSProperties}>
      <div className="fr-mat" aria-hidden />
      {players.map((p, i) => {
        const mode = modeOf(p);
        const own = p.me && myRound !== null;
        // a loser's blade arrives after the cut, later the slower they were
        const late = mode === 'late' || mode === 'drag' ? Math.round(Math.max(90, Math.min(380, 90 + ((res!.reactions[p.id] ?? 0) - winMs) * 0.6))) : 0;
        const k = own ? `me${myRound}` : mode ? `${mode}${res?.round ?? 0}` : 'idle';
        // my swing holds its follow-through while the item is up, then settles back to rest
        const phase = own && mode !== 'yank' ? (item?.round === myRound ? 'hold' : 'back') : null;
        return (
          <div key={p.id} className={cx('fr-seat', p.me && 'me')} style={{ '--pc': p.color, '--late': `${late}ms`, transform: `rotate(${angles[i] ?? 0}deg)` } as CSSProperties}>
            <span className="fr-rest" aria-hidden />
            <div key={k} className={cx('fr-sword', p.slow > 0 && 'slowed', mode && `tw-${mode}`, phase)}>
              <span className="fr-ghost g1" aria-hidden>
                <Sword color={p.color} />
              </span>
              <span className="fr-ghost g2" aria-hidden>
                <Sword color={p.color} />
              </span>
              <Sword color={p.color} />
              {p.slow > 0 && <span className="fr-sword-mag">🧲</span>}
            </div>
            {(mode === 'cut' || mode === 'win' || mode === 'late') && <SlashArc key={`a${k}`} color={p.color} faint={mode === 'late'} />}
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
            <span className="fr-shadow" aria-hidden />
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
          <Split key={`c${cut.round}`} kind={cut.kind} px={itemPx} angle={winAngle + 70} now={myCut} color={players.find((p) => p.id === cut.winner)?.color ?? '#fff'} />
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
