import { useEffect, useRef } from 'react';
import { cx } from '../../lib/cards';
import type { Step } from './Arena';

// The arrow pad under the arena for thumbs (hold to keep walking), and the keyboard arrows / WASD on a computer

const REPEAT_MS = 170;
const KEYS: Record<string, Step> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right' };
const LABEL: Record<Step, string> = { up: 'Up', down: 'Down', left: 'Left', right: 'Right' };
const ICON: Record<Step, string> = { up: '▲', down: '▼', left: '◀', right: '▶' };

export function Pad({ onStep, disabled, color }: { onStep: (d: Step) => void; disabled: boolean; color: string }) {
  const held = useRef<{ dir: Step; timer: number } | null>(null);
  const step = useRef(onStep);
  step.current = onStep;

  const stop = () => {
    if (held.current) window.clearInterval(held.current.timer);
    held.current = null;
  };
  useEffect(() => stop, []);
  useEffect(() => {
    if (disabled) stop();
  }, [disabled]);

  // keyboard: one step per press, the browser's key repeat walks
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const d = KEYS[e.key];
      if (!d || disabled || (e.target as HTMLElement)?.closest?.('input, textarea, [contenteditable]')) return;
      e.preventDefault();
      step.current(d);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [disabled]);

  const press = (dir: Step) => (e: React.PointerEvent) => {
    e.preventDefault();
    if (disabled) return;
    stop();
    step.current(dir);
    held.current = { dir, timer: window.setInterval(() => step.current(dir), REPEAT_MS) };
  };

  const btn = (dir: Step) => (
    <button
      type="button"
      className={cx('sp-key', `k-${dir}`)}
      aria-label={LABEL[dir]}
      disabled={disabled}
      onPointerDown={press(dir)}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onContextMenu={(e) => e.preventDefault()}
    >
      {ICON[dir]}
    </button>
  );

  return (
    <div className={cx('sp-pad', disabled && 'off')} style={{ '--pc': color } as React.CSSProperties}>
      {btn('up')}
      {btn('left')}
      {btn('down')}
      {btn('right')}
    </div>
  );
}
