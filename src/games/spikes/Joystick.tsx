import { useEffect, useRef, useState, type CSSProperties, type MutableRefObject } from 'react';

// The joystick: touch anywhere in the play area and drag; it shows under the thumb and the character runs that way,
// full speed once the thumb is FULL_PX away. Arrow keys / WASD on a computer. Let go = stop

const FULL_PX = 60;
const KEYS: Record<string, [number, number]> = {
  ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
  w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0], W: [0, -1], S: [0, 1], A: [-1, 0], D: [1, 0],
};

interface Touch { id: number; ox: number; oy: number; dx: number; dy: number }

/** vec: where I'm running, length 0..1; zone: spread on the element that catches the thumb */
export function useJoystick(enabled: boolean): { vec: MutableRefObject<[number, number]>; zone: Record<string, (e: React.PointerEvent<HTMLElement>) => void>; touch: Touch | null } {
  const vec = useRef<[number, number]>([0, 0]);
  const held = useRef(new Set<string>());
  const [touch, setTouch] = useState<Touch | null>(null);
  const touchRef = useRef<Touch | null>(null);

  const fromKeys = () => {
    let x = 0;
    let y = 0;
    held.current.forEach((k) => ((x += KEYS[k][0]), (y += KEYS[k][1])));
    const n = Math.hypot(x, y);
    vec.current = n ? [x / n, y / n] : [0, 0];
  };
  const set = (t: Touch | null) => {
    touchRef.current = t;
    setTouch(t);
    if (!t) return fromKeys();
    const n = Math.hypot(t.dx, t.dy);
    const k = n < 4 ? 0 : Math.min(1, n / FULL_PX) / n;
    vec.current = [t.dx * k, t.dy * k];
  };

  useEffect(() => {
    if (enabled) return;
    held.current.clear();
    set(null);
  }, [enabled]);
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (!KEYS[e.key] || !enabled || (e.target as HTMLElement)?.closest?.('input, textarea, [contenteditable]')) return;
      e.preventDefault();
      held.current.add(e.key);
      if (!touchRef.current) fromKeys();
    };
    const up = (e: KeyboardEvent) => {
      if (!held.current.delete(e.key)) return;
      if (!touchRef.current) fromKeys();
    };
    const blur = () => {
      held.current.clear();
      if (!touchRef.current) fromKeys();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, [enabled]);

  const zone = {
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      if (!enabled || touchRef.current || (e.target as HTMLElement).closest('button')) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture?.(e.pointerId);
      const r = e.currentTarget.getBoundingClientRect();
      set({ id: e.pointerId, ox: e.clientX - r.left, oy: e.clientY - r.top, dx: 0, dy: 0 });
    },
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
      const t = touchRef.current;
      if (!t || t.id !== e.pointerId) return;
      const r = e.currentTarget.getBoundingClientRect();
      set({ ...t, dx: e.clientX - r.left - t.ox, dy: e.clientY - r.top - t.oy });
    },
    onPointerUp: (e: React.PointerEvent<HTMLElement>) => {
      if (touchRef.current?.id === e.pointerId) set(null);
    },
    onPointerCancel: (e: React.PointerEvent<HTMLElement>) => {
      if (touchRef.current?.id === e.pointerId) set(null);
    },
  };
  return { vec, zone, touch };
}

/** the stick under the thumb: a ring and a knob in my colour */
export function Joystick({ touch, color }: { touch: Touch | null; color: string }) {
  if (!touch) return null;
  const n = Math.hypot(touch.dx, touch.dy);
  const k = n > FULL_PX ? FULL_PX / n : 1;
  return (
    <span className="sp-stick" style={{ '--pc': color, left: touch.ox, top: touch.oy } as CSSProperties} aria-hidden>
      <span className="sp-stick-base" />
      <span className="sp-stick-knob" style={{ transform: `translate(${touch.dx * k}px, ${touch.dy * k}px)` }} />
    </span>
  );
}
