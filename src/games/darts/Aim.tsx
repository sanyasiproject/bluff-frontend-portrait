import { useEffect, useRef, useState, type RefObject } from 'react';
import { BOARD_R } from './Board';

// Aiming in two taps: a level line sweeps up and down (tap to lock the height), then an upright line sweeps
// left and right (tap to lock); the dart flies to where the two locked lines cross

/** how far the lines sweep from the centre, in board units (the scoring ring is 1) */
export const SWEEP_R = 1.1;
/** one full pass from one side to the other */
const PASS_MS = 1100;
/** both lines show as a crosshair this long before the dart flies */
const LOCK_MS = 320;

export type AimStep = 'off' | 'y' | 'x' | 'lock';

/** ping-pong across [-SWEEP_R, SWEEP_R]; phase 0 or 1 picks the side it starts from */
const sweepAt = (ms: number, phase: number) => {
  const u = (ms / PASS_MS + phase) % 2;
  return -SWEEP_R + 2 * SWEEP_R * (u < 1 ? u : 2 - u);
};

export function useAim(wrap: RefObject<HTMLDivElement>, layer: RefObject<HTMLDivElement>, enabled: boolean, onThrow: (x: number, y: number) => void) {
  const [step, setStep] = useState<AimStep>('off');
  const stepRef = useRef<AimStep>('off');
  const since = useRef(0);
  const phase = useRef(0);
  // the point as last drawn on screen; a tap locks exactly this, never a fresh time reading
  const pos = useRef<[number, number]>([0, 0]);
  const raf = useRef(0);
  const timer = useRef(0);
  const throwRef = useRef(onThrow);
  throwRef.current = onThrow;

  const go = (s: AimStep) => {
    stepRef.current = s;
    setStep(s);
  };
  // moves the lines each frame by transform; board y runs up, the screen's down
  const draw = () => {
    const box = wrap.current;
    const el = layer.current;
    if (box && el) {
      const unit = box.clientWidth / 2 / BOARD_R;
      const s = stepRef.current;
      const t = performance.now() - since.current;
      if (s === 'y') pos.current[1] = sweepAt(t, phase.current);
      if (s === 'x') pos.current[0] = sweepAt(t, phase.current);
      const h = el.querySelector<HTMLElement>('.dt-sw-h');
      const v = el.querySelector<HTMLElement>('.dt-sw-v');
      const dot = el.querySelector<HTMLElement>('.dt-sw-dot');
      if (h) h.style.transform = `translateY(${-pos.current[1] * unit}px)`;
      if (v) v.style.transform = `translateX(${pos.current[0] * unit}px)`;
      if (dot) dot.style.transform = `translate(${pos.current[0] * unit}px, ${-pos.current[1] * unit}px)`;
    }
    raf.current = requestAnimationFrame(draw);
  };

  // my turn: the height line starts sweeping by itself
  useEffect(() => {
    cancelAnimationFrame(raf.current);
    window.clearTimeout(timer.current);
    if (!enabled) return go('off');
    pos.current = [0, 0];
    since.current = performance.now();
    phase.current = Math.random() < 0.5 ? 0 : 1;
    go('y');
    draw();
    return () => cancelAnimationFrame(raf.current);
  }, [enabled]);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const lock = () => {
    const s = stepRef.current;
    if (!enabled || s === 'off' || s === 'lock') return;
    if (s === 'y') {
      since.current = performance.now();
      phase.current = Math.random() < 0.5 ? 0 : 1;
      return go('x');
    }
    go('lock');
    const [x, y] = pos.current;
    timer.current = window.setTimeout(() => throwRef.current(x, y), LOCK_MS);
  };
  const lockRef = useRef(lock);
  lockRef.current = lock;

  // a computer: Space or Enter locks too
  useEffect(() => {
    if (!enabled) return;
    const key = (e: KeyboardEvent) => {
      if ((e.key !== ' ' && e.key !== 'Enter') || (e.target as HTMLElement)?.closest?.('input, textarea, button, [contenteditable]')) return;
      e.preventDefault();
      lockRef.current();
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [enabled]);

  const handlers = {
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => {
      if (!enabled) return;
      e.preventDefault();
      lock();
    },
  };
  return { step, handlers };
}

/** the two sweeping lines and, once both are locked, the crosshair where the dart will land */
export function Reticle({ elRef, step }: { elRef: RefObject<HTMLDivElement>; step: AimStep }) {
  return (
    <div ref={elRef} className={`dt-sweep s-${step}`} style={{ visibility: step === 'off' ? 'hidden' : 'visible' }} aria-hidden>
      <span className={`dt-sw-h${step !== 'y' ? ' locked' : ''}`}>
        <i />
      </span>
      <span className={`dt-sw-v${step === 'lock' ? ' locked' : ''}`} style={{ visibility: step === 'y' ? 'hidden' : 'visible' }}>
        <i />
      </span>
      <span className="dt-sw-dot" style={{ visibility: step === 'lock' ? 'visible' : 'hidden' }} />
    </div>
  );
}
