import { useLayoutEffect, useMemo, useRef, type CSSProperties } from 'react';
import { cx } from '../../lib/cards';
import { reducedMotion } from '../../lib/motion';
import { sfx } from '../../lib/sounds';
import type { SnakesView } from '../../types';
import { Goti } from '../ludo/Goti';
import { DICE_MS } from '../ludo/Dice';
import { centerOf, moveTimes, spotsOf, tf, viaPoints, walkOf, type Spot } from './geometry';

// The tokens on the board: hop square by square after the dice lands, bounce off 100, ride the snake or ladder, bitten ones jump back

const BITE_MS = 520;

interface Props {
  sv: SnakesView;
  /** each player's goti style */
  styleOf: (playerId: string) => string;
  /** the player whose turn it is glows */
  turnId: string | null;
  /** my id: my token's tag says "You" in a solid chip */
  meId?: string;
  /** the name tag over each token, so tokens on one square stay apart */
  tagOf?: (playerId: string) => string;
}

export function TokenLayer({ sv, styleOf, turnId, meId, tagOf }: Props) {
  const spots = useMemo(() => spotsOf(sv.seats), [sv.seats]);
  const els = useRef(new Map<string, HTMLElement>());
  const bodies = useRef(new Map<string, HTMLElement>());
  const seen = useRef(sv.last?.seq ?? -1);

  useLayoutEffect(() => {
    const last = sv.last;
    if (!last || last.seq === seen.current) return;
    seen.current = last.seq;
    const el = els.current.get(last.playerId);
    const body = bodies.current.get(last.playerId);
    const end = spots.find((s) => s.playerId === last.playerId);
    if (!el || !body || !end || reducedMotion()) return;
    const timers: number[] = [];
    const { walk, via } = moveTimes(last);
    const total = walk + via;
    const steps = walkOf(last);
    const at = (sq: number): [number, number] => {
      const [x, y] = centerOf(sq);
      return [x - 0.5, y - 0.5];
    };
    const frames: Keyframe[] = [];
    if (last.from === 0) {
      // entering: drops onto square 1 from above
      const [x, y] = at(steps[0] ?? 1);
      frames.push({ transform: tf(x, y - 1.6, 1.4), opacity: 0, offset: 0 });
      frames.push({ transform: tf(x, y, 0.92), opacity: 1, offset: Math.min(0.99, (walk * 0.7) / total) });
      const rest = steps.slice(1);
      rest.forEach((sq, i) => {
        const [sx, sy] = at(sq);
        frames.push({ transform: tf(sx, sy, 0.92), opacity: 1, offset: (walk * 0.7 + ((i + 1) / rest.length) * walk * 0.3) / total });
      });
    } else {
      const [fx, fy] = at(last.from);
      frames.push({ transform: tf(fx, fy, 0.92), offset: 0 });
      steps.forEach((sq, i) => {
        const [x, y] = at(sq);
        frames.push({ transform: tf(x, y, 0.92), offset: (((i + 1) / steps.length) * walk) / total });
      });
    }
    if (last.via) {
      const pts = viaPoints(last.via);
      pts.slice(1).forEach(([x, y], i) => {
        const t = (walk + ((i + 1) / (pts.length - 1)) * via) / total;
        frames.push({ transform: tf(x - 0.5, y - 0.5, last.via!.kind === 'ladder' ? 1.05 : 0.85), offset: Math.min(1, t) });
      });
    }
    frames.push({ transform: tf(end.x, end.y, end.scale), opacity: 1, offset: 1 });
    // offsets must not go backwards
    let prev = 0;
    for (const f of frames) {
      if (typeof f.offset === 'number') f.offset = prev = Math.max(prev, Math.min(1, f.offset));
    }
    el.dataset.moving = '1';
    const run = el.animate(frames, { duration: total, delay: DICE_MS, easing: 'linear', fill: 'backwards' });
    run.onfinish = run.oncancel = () => delete el.dataset.moving;
    // the hop: one arc per square, a squash on landing
    if (steps.length > 0 && last.from > 0) {
      const lift: Keyframe[] = [];
      const w = walk / total / steps.length;
      steps.forEach((_, i) => {
        const a = i * w;
        lift.push({ transform: 'translateY(0) scale(1, 1)', offset: a });
        lift.push({ transform: 'translateY(-50%) scale(1.05, 1.05)', offset: a + w * 0.45 });
        lift.push({ transform: 'translateY(0) scale(1.14, 0.82)', offset: a + w * 0.9 });
      });
      lift.push({ transform: 'translateY(0) scale(1, 1)', offset: Math.min(1, walk / total + 0.001) });
      if (via) lift.push({ transform: 'translateY(0) scale(1, 1)', offset: 1 });
      body.animate(lift, { duration: total, delay: DICE_MS, easing: 'ease-in-out' });
      steps.forEach((_, i) => timers.push(window.setTimeout(() => sfx.ludoHop(i % 8), DICE_MS + (i + 0.85) * (walk / steps.length))));
    }
    if (last.via) timers.push(window.setTimeout(() => (last.via!.kind === 'snake' ? sfx.snakeSlide() : sfx.ladderClimb()), DICE_MS + walk));
    // bitten tokens wait on their square, then jump back
    for (const b of last.bitten) {
      const vel = els.current.get(b.playerId);
      const home = spots.find((s) => s.playerId === b.playerId);
      if (!vel || !home) continue;
      const [sx, sy] = at(b.from);
      const mx = (sx + home.x) / 2;
      const my = Math.min(sy, home.y) - 1.2;
      vel.dataset.moving = '1';
      const fly = vel.animate(
        [
          { transform: `${tf(sx, sy, 0.92)} rotate(0deg)` },
          { transform: `${tf(sx, sy, 1.2)} rotate(-15deg)`, offset: 0.15 },
          { transform: `${tf(mx, my, 1.35)} rotate(200deg)`, offset: 0.55 },
          { transform: `${tf(home.x, home.y, home.scale)} rotate(360deg)` },
        ],
        { duration: BITE_MS + 200, delay: DICE_MS + total, easing: 'cubic-bezier(0.3, 0.6, 0.4, 1)', fill: 'backwards' },
      );
      fly.onfinish = fly.oncancel = () => delete vel.dataset.moving;
    }
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [sv.last?.seq]);

  const z = (s: Spot) => 10 + Math.round(s.y * 4) + (s.playerId === turnId ? 30 : 0);
  return (
    <div className="sn-pieces">
      {spots.map((s) => {
        const seat = sv.seats.find((x) => x.playerId === s.playerId)!;
        return (
          <span
            key={s.playerId}
            ref={(el) => {
              if (el) els.current.set(s.playerId, el);
              else els.current.delete(s.playerId);
            }}
            className={cx('sn-goti', `ld-${seat.color}`, `goti-${styleOf(s.playerId)}`, s.playerId === turnId && 'turn', s.playerId === meId && 'mine', seat.place !== null && 'done')}
            style={{ transform: tf(s.x, s.y, s.scale), zIndex: z(s) } as CSSProperties}
            aria-label={`${seat.color} goti on ${seat.pos}`}
          >
            <span
              className="sn-goti-body"
              ref={(el) => {
                if (el) bodies.current.set(s.playerId, el);
                else bodies.current.delete(s.playerId);
              }}
            >
              <Goti color={seat.color} style={styleOf(s.playerId)} id={`sn-${s.playerId}`} />
            </span>
            {tagOf && (
              <b className="sn-tag" data-no-translate aria-hidden>
                {tagOf(s.playerId)}
              </b>
            )}
          </span>
        );
      })}
    </div>
  );
}
