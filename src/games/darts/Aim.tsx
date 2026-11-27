import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import { reducedMotion } from '../../lib/motion';
import { BOARD_R } from './Board';

// Aiming: press and hold on the board, the reticle shakes like a hand (more the longer you hold), let go to throw where it is.
// A ghost circle shows how far it may wander and a meter under it runs green (steady) to red (shaky)

/** a finger hides what it touches, so on touch the reticle sits this far above it */
const TOUCH_LIFT = 64;
/** shake in board units: a little at once, growing to the most after this long */
const SHAKE_MIN = 0.025;
const SHAKE_MAX = 0.13;
const SHAKE_GROW_MS = 2600;

/** the ghost circle's drawn size in px; scaled each frame to the spread */
const GHOST_PX = 100;

const shakeAt = (heldMs: number) => SHAKE_MIN + (SHAKE_MAX - SHAKE_MIN) * Math.min(1, heldMs / SHAKE_GROW_MS);
/** the hand's drift at time t (s) for a shake size: a mix of slow and quick sways */
function sway(t: number, amp: number, seed: number): [number, number] {
  const k = reducedMotion() ? 0.5 : 1;
  return [amp * k * (0.6 * Math.sin(2.1 * t + seed) + 0.4 * Math.sin(5.3 * t + 2 * seed)), amp * k * (0.6 * Math.cos(1.7 * t + seed) + 0.4 * Math.sin(4.1 * t + 3 * seed))];
}

export function useAim(wrap: RefObject<HTMLDivElement>, reticle: RefObject<HTMLDivElement>, enabled: boolean, onThrow: (x: number, y: number) => void) {
  const [holding, setHolding] = useState(false);
  const aim = useRef<[number, number]>([0, 0]);
  const lift = useRef(0);
  const since = useRef(0);
  const seed = useRef(0);
  const raf = useRef(0);
  const pointer = useRef<number | null>(null);

  // where the reticle is right now: the aim plus the hand's sway
  const current = (): [number, number] => {
    const held = performance.now() - since.current;
    const [dx, dy] = sway(held / 1000, shakeAt(held), seed.current);
    const x = aim.current[0] + dx;
    const y = aim.current[1] + dy;
    const r = Math.hypot(x, y);
    return r > BOARD_R ? [(x / r) * BOARD_R, (y / r) * BOARD_R] : [x, y];
  };
  const toBoard = (clientX: number, clientY: number): [number, number] => {
    const rect = wrap.current!.getBoundingClientRect();
    const unit = rect.width / 2 / BOARD_R;
    return [(clientX - rect.left - rect.width / 2) / unit, -(clientY - lift.current - rect.top - rect.height / 2) / unit];
  };
  const draw = () => {
    const el = reticle.current;
    const box = wrap.current;
    if (el && box) {
      const [x, y] = current();
      const unit = box.clientWidth / 2 / BOARD_R;
      const amp = shakeAt(performance.now() - since.current);
      const k = (amp - SHAKE_MIN) / (SHAKE_MAX - SHAKE_MIN);
      el.style.transform = `translate(${x * unit}px, ${-y * unit}px)`;
      // the ghost follows the aim, not the sway: it is where the dart may land
      const ghost = el.querySelector<HTMLElement>('.dt-ret-ghost');
      if (ghost) ghost.style.transform = `translate(${(aim.current[0] - x) * unit}px, ${-(aim.current[1] - y) * unit}px) scale(${Math.max(40, amp * 2.6 * unit) / GHOST_PX})`;
      const fill = el.querySelector<HTMLElement>('.dt-meter-fill');
      if (fill) fill.style.transform = `scaleX(${1 - k * 0.85})`;
      const red = el.querySelector<HTMLElement>('.dt-meter-red');
      if (red) red.style.opacity = String(k);
    }
    raf.current = requestAnimationFrame(draw);
  };
  const stop = () => {
    cancelAnimationFrame(raf.current);
    pointer.current = null;
    setHolding(false);
  };
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  useEffect(() => {
    if (!enabled && pointer.current !== null) stop();
  }, [enabled]);

  const handlers = {
    onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!enabled || pointer.current !== null || !wrap.current) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      pointer.current = e.pointerId;
      lift.current = e.pointerType === 'touch' ? TOUCH_LIFT : 0;
      aim.current = toBoard(e.clientX, e.clientY);
      since.current = performance.now();
      seed.current = Math.random() * 6;
      setHolding(true);
      cancelAnimationFrame(raf.current);
      draw();
    },
    onPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.pointerId !== pointer.current) return;
      aim.current = toBoard(e.clientX, e.clientY);
    },
    onPointerUp: (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.pointerId !== pointer.current) return;
      const [x, y] = current();
      stop();
      onThrow(Math.round(x * 1000) / 1000, Math.round(y * 1000) / 1000);
    },
    onPointerCancel: (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.pointerId === pointer.current) stop();
    },
  };
  return { holding, handlers };
}

/** the crosshair, the ghost "it'll land around here" circle and the steadiness meter */
export function Reticle({ elRef, show }: { elRef: RefObject<HTMLDivElement>; show: boolean }) {
  return (
    <div ref={elRef} className="dt-reticle" style={{ visibility: show ? 'visible' : 'hidden' }} aria-hidden>
      <span className="dt-ret-ghost" style={{ width: GHOST_PX, height: GHOST_PX, left: -GHOST_PX / 2, top: -GHOST_PX / 2 }} />
      <span className="dt-ret-ring" />
      <span className="dt-ret-cross" />
      <span className="dt-meter">
        <i className="dt-meter-fill">
          <i className="dt-meter-red" />
        </i>
      </span>
    </div>
  );
}
