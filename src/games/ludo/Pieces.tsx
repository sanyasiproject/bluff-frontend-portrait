import { useLayoutEffect, useMemo, useRef, type CSSProperties } from 'react';
import { cx } from '../../lib/cards';
import { reducedMotion } from '../../lib/motion';
import { sfx } from '../../lib/sounds';
import { LUDO_BASE, LUDO_HOME, type LudoColor, type LudoLastMove, type LudoView } from '../../types';
import { almostHome, hopPath, layout, spotOf, tf } from './geometry';
import { Goti } from './Goti';

// The gotis on the board: hop square by square on each move, knocked gotis fly back to base

export const HOP_MS = 180;
const OPEN_MS = 340;
const FLY_MS = 620;

/** how long a move's hops take, so effects can wait for the landing */
export const moveMs = (last: LudoLastMove) => (last.from <= LUDO_BASE ? OPEN_MS : (last.to - last.from) * HOP_MS);

interface Props {
  ld: LudoView;
  k: number;
  gotiStyle: string;
  /** the colour moved this turn and its movable gotis */
  moveColor: LudoColor | null;
  legal: number[];
  onPick: (token: number) => void;
}

export function GotiLayer({ ld, k, gotiStyle, moveColor, legal, onPick }: Props) {
  const spots = useMemo(() => layout(ld.seats, k), [ld.seats, k]);
  const els = useRef(new Map<string, HTMLElement>());
  const bodies = useRef(new Map<string, HTMLElement>());
  const seen = useRef(ld.last?.seq ?? -1);

  // each new move: hops with a lift and a squash on landing, then the knocked gotis fly home
  useLayoutEffect(() => {
    const last = ld.last;
    if (!last || last.seq === seen.current) return;
    seen.current = last.seq;
    const key = `${last.color}-${last.token}`;
    const el = els.current.get(key);
    const body = bodies.current.get(key);
    const end = spots.find((s) => s.key === key);
    if (!el || !body || !end) return;
    const timers: number[] = [];
    const steps = hopPath(last.color, last.from, last.to, k);
    const total = moveMs(last);
    if (reducedMotion()) {
      sfx.ludoHop(0);
      return;
    }
    const [fx, fy] = spotOf(last.color, last.from, last.token, k);
    const frames: Keyframe[] = [{ transform: tf(fx, fy), offset: 0 }];
    steps.forEach(([x, y], i) => {
      const last1 = i === steps.length - 1;
      frames.push({ transform: last1 ? tf(end.x + end.dx, end.y + end.dy, end.scale) : tf(x, y), offset: (i + 1) / steps.length });
    });
    el.dataset.moving = '1';
    const run = el.animate(frames, { duration: total, easing: 'linear' });
    run.onfinish = run.oncancel = () => delete el.dataset.moving;
    // the lift: one arc per square, squash on each landing
    const lift: Keyframe[] = [];
    steps.forEach((_, i) => {
      const a = i / steps.length;
      const w = 1 / steps.length;
      lift.push({ transform: 'translateY(0) scale(1, 1)', offset: a });
      lift.push({ transform: `translateY(${last.from <= LUDO_BASE ? -90 : -55}%) scale(1.06, 1.06)`, offset: a + w * 0.45 });
      lift.push({ transform: 'translateY(0) scale(1.16, 0.8)', offset: a + w * 0.9 });
    });
    lift.push({ transform: 'translateY(0) scale(1, 1)', offset: 1 });
    body.animate(lift, { duration: total + 90, easing: 'ease-in-out' });
    steps.forEach((_, i) => timers.push(window.setTimeout(() => sfx.ludoHop(i), (i + 0.85) * (total / steps.length))));
    // knocked gotis wait on the square, then arc back to their base
    for (const c of last.captured) {
      const vk = `${c.color}-${c.token}`;
      const vel = els.current.get(vk);
      const home = spots.find((s) => s.key === vk);
      if (!vel || !home) continue;
      const [sx, sy] = spotOf(c.color, c.from, c.token, k);
      const mx = (sx + home.x) / 2;
      const my = Math.min(sy, home.y) - 2.5;
      vel.dataset.moving = '1';
      const fly = vel.animate(
        [
          { transform: `${tf(sx, sy)} rotate(0deg)` },
          { transform: `${tf(sx, sy, 1.25)} rotate(-12deg)`, offset: 0.12 },
          { transform: `${tf(mx, my, 1.5)} rotate(200deg)`, offset: 0.55 },
          { transform: `${tf(home.x + home.dx, home.y + home.dy, home.scale)} rotate(360deg)` },
        ],
        { duration: FLY_MS, delay: total, easing: 'cubic-bezier(0.3, 0.6, 0.4, 1)', fill: 'backwards' },
      );
      fly.onfinish = fly.oncancel = () => delete vel.dataset.moving;
    }
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [ld.last?.seq]);

  const legalSet = new Set(moveColor ? legal.map((t) => `${moveColor}-${t}`) : []);
  const roll = ld.dice ?? 0;
  const ghosts = moveColor
    ? legal.map((t) => {
        const seat = ld.seats.find((s) => s.color === moveColor);
        const p = seat?.tokens[t] ?? LUDO_BASE;
        const to = p <= LUDO_BASE ? 0 : Math.min(LUDO_HOME, p + roll);
        const [x, y] = spotOf(moveColor, to, t, k);
        return { t, x, y };
      })
    : [];

  return (
    <div className={cx('ld-pieces', `goti-${gotiStyle}`)}>
      {ghosts.map((g) => (
        <button
          key={`ghost-${g.t}`}
          type="button"
          className={cx('ld-ghost', `ld-${moveColor}`)}
          style={{ transform: tf(g.x, g.y), zIndex: 72 } as CSSProperties}
          aria-label={`Move goti ${g.t + 1} here`}
          onClick={() => onPick(g.t)}
        >
          <i />
        </button>
      ))}
      {spots.map((s) => {
        const live = legalSet.has(s.key);
        return (
          <button
            key={s.key}
            ref={(el) => {
              if (el) els.current.set(s.key, el);
              else els.current.delete(s.key);
            }}
            type="button"
            tabIndex={live ? 0 : -1}
            className={cx('ld-goti', `ld-${s.color}`, live && 'legal', almostHome(s.progress) && 'almost', s.progress >= LUDO_HOME && 'home')}
            style={{ transform: tf(s.x + s.dx, s.y + s.dy, s.scale), zIndex: 10 + Math.round((s.y + s.dy) * 4) + (live ? 40 : 0) } as CSSProperties}
            aria-label={live ? `Move ${s.color} goti ${s.token + 1}` : `${s.color} goti`}
            aria-hidden={!live}
            onClick={live ? () => onPick(s.token) : undefined}
          >
            <span
              className="ld-goti-body"
              ref={(el) => {
                if (el) bodies.current.set(s.key, el);
                else bodies.current.delete(s.key);
              }}
            >
              <Goti color={s.color} style={gotiStyle} id={s.key} />
            </span>
          </button>
        );
      })}
    </div>
  );
}
