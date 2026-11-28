import { useRef, type PointerEvent } from 'react';
import { cx } from '../../lib/cards';
import { BOMB_ARROWS, BOMB_INK_HEX, type BombArrow, type BombTask } from '../../types';

// The holder's task, big at the bottom: a prompt and 2–4 big one-tap buttons (the arrow task also takes a swipe)

const ARROW: Record<BombArrow, string> = { up: '↑', right: '→', down: '↓', left: '←' };
const TITLE: Record<BombTask['kind'], string> = {
  sum: 'Solve it!',
  bigger: 'Tap the bigger number',
  colour: 'Tap the INK colour',
  odd: 'Tap the odd one out',
  count: 'How many dots?',
  arrow: 'Swipe or tap the arrow',
};

export function TaskCard({ task, mine, shaking, locked, onAnswer, who }: { task: BombTask | null; mine: boolean; shaking: boolean; locked: boolean; onAnswer: (i: number) => void; who: string }) {
  const swipe = useRef<{ x: number; y: number } | null>(null);
  if (!task)
    return (
      <div className="bm-card idle">
        <p className="bm-card-wait">💣 Get ready…</p>
      </div>
    );
  const can = mine && !locked && !shaking;
  const onDown = (e: PointerEvent) => {
    if (task.kind === 'arrow' && can) swipe.current = { x: e.clientX, y: e.clientY };
  };
  const onUp = (e: PointerEvent) => {
    const s = swipe.current;
    swipe.current = null;
    if (!s || task.kind !== 'arrow' || !can) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.hypot(dx, dy) < 40) return;
    const dir: BombArrow = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
    onAnswer(BOMB_ARROWS.indexOf(dir));
  };
  return (
    <div key={task.id} className={cx('bm-card', mine && 'mine', shaking && 'shake', `k-${task.kind}`)} onPointerDown={onDown} onPointerUp={onUp}>
      <p className="bm-card-title">{mine ? TITLE[task.kind] : `${who} must solve:`}</p>
      <div className="bm-card-q">
        {task.kind === 'colour' ? (
          <b className="bm-word" style={{ color: task.ink ? BOMB_INK_HEX[task.ink] : undefined }}>
            {task.word}
          </b>
        ) : task.kind === 'count' ? (
          <span className="bm-dots">
            {(task.dots ?? []).map(([x, y], i) => (
              <i key={i} style={{ left: `${x * 100}%`, top: `${y * 100}%` }} />
            ))}
          </span>
        ) : task.kind === 'arrow' ? (
          <b className="bm-arrow">{task.arrow ? ARROW[task.arrow] : '?'}</b>
        ) : task.kind === 'sum' ? (
          <b className="bm-sum">{task.prompt} = ?</b>
        ) : task.kind === 'odd' || task.kind === 'bigger' ? null : (
          <b className="bm-sum">{task.prompt}</b>
        )}
      </div>
      <div className={cx('bm-choices', `n${task.choices.length}`)}>
        {task.choices.map((c, i) => (
          <button key={i} className={cx('bm-choice', task.kind === 'odd' && 'emoji', task.kind === 'bigger' && 'big')} disabled={!can} onClick={() => onAnswer(i)}>
            {task.kind === 'arrow' ? ARROW[c as BombArrow] ?? c : task.kind === 'colour' ? c.toUpperCase() : c}
          </button>
        ))}
      </div>
    </div>
  );
}
