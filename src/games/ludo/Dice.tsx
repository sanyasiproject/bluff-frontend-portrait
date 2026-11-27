import { useEffect, useRef } from 'react';
import { cx } from '../../lib/cards';
import { reducedMotion } from '../../lib/motion';

// A CSS 3D dice: six faces with pips; it tumbles to the new face each time rollSeq goes up

const PIPS: Record<number, number[]> = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
/** the cube's turn that brings each face to the front */
const FACE: Record<number, [number, number]> = { 1: [0, 0], 2: [0, -90], 3: [-90, 0], 4: [90, 0], 5: [0, 90], 6: [0, 180] };
const rest = (v: number) => `rotateX(${FACE[v][0] - 14}deg) rotateY(${FACE[v][1] + 18}deg)`;
export const DICE_MS = 500;

export function Dice({ value, seq, skin, live }: { value: number | null; seq: number; skin: string; live?: boolean }) {
  const cube = useRef<HTMLDivElement>(null);
  const hop = useRef<HTMLDivElement>(null);
  const seen = useRef(seq);
  const shown = value ?? 6;

  // a quick tumble in place: one turn on each axis, then settle on the face; no hop or travel
  useEffect(() => {
    if (seq === seen.current) return;
    seen.current = seq;
    if (reducedMotion() || !cube.current || !hop.current) return;
    const [x, y] = FACE[shown];
    const spinX = 360 * (Math.random() < 0.5 ? 1 : -1);
    const spinY = 360;
    cube.current.animate(
      [
        { transform: `rotateX(${x - 14 - spinX}deg) rotateY(${y + 18 - spinY}deg)` },
        { transform: `rotateX(${x - 14 - spinX * 0.15}deg) rotateY(${y + 18 - spinY * 0.15}deg)`, offset: 0.75 },
        { transform: rest(shown) },
      ],
      { duration: DICE_MS, easing: 'cubic-bezier(0.25, 0.7, 0.35, 1)' },
    );
    hop.current.animate([{ transform: 'scale(0.92)' }, { transform: 'scale(1)' }], { duration: DICE_MS, easing: 'ease-out' });
  }, [seq, shown]);

  return (
    <div className={cx('ld-dice', `dice-${skin}`, live && 'live', value === null && 'idle')} aria-label={value ? `Dice shows ${value}` : 'Dice'}>
      <div ref={hop} className="ld-dice-hop">
        <div ref={cube} className="ld-cube" style={{ transform: rest(shown) }}>
          {[1, 2, 3, 4, 5, 6].map((f) => (
            <div key={f} className={`ld-face f${f}`}>
              {Array.from({ length: 9 }, (_, i) => (
                <i key={i} className={PIPS[f].includes(i) ? 'pip' : undefined} />
              ))}
            </div>
          ))}
        </div>
      </div>
      <span className="ld-dice-shadow" aria-hidden />
    </div>
  );
}
