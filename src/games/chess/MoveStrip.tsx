import { useEffect, useRef } from 'react';
import { cx } from '../../lib/cards';

// Moves as SAN in numbered pairs, in one scrolling strip; the current move stays in view

export const JUDGE_MARK: Record<string, string> = { inaccuracy: '?!', mistake: '?', blunder: '??' };

export function MoveStrip({ sans, ply, onPly, judge, startBlack }: { sans: string[]; ply: number; onPly?: (ply: number) => void; judge?: (string | undefined)[]; startBlack?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current?.querySelector<HTMLElement>('.on');
    const box = ref.current;
    if (!box) return;
    if (el) box.scrollTo({ left: el.offsetLeft - box.clientWidth / 2 + el.clientWidth / 2, behavior: 'smooth' });
    else if (ply >= sans.length) box.scrollTo({ left: box.scrollWidth });
  }, [ply, sans.length]);
  if (!sans.length) return <div className="ch-moves empty">No moves yet</div>;
  const off = startBlack ? 1 : 0;
  const items: JSX.Element[] = [];
  sans.forEach((san, i) => {
    const n = i + off;
    if (n % 2 === 0 || i === 0) items.push(<span key={`n${i}`} className="ch-num">{`${Math.floor(n / 2) + 1}.${n % 2 ? '..' : ''}`}</span>);
    const j = judge?.[i];
    items.push(
      <button key={i} className={cx('ch-san', ply === i + 1 && 'on', j && `j-${j}`)} onClick={onPly ? () => onPly(i + 1) : undefined} tabIndex={onPly ? 0 : -1} data-no-translate>
        {san}
        {j && JUDGE_MARK[j] && <sup>{JUDGE_MARK[j]}</sup>}
      </button>,
    );
  });
  return (
    <div ref={ref} className="ch-moves" aria-label="Moves">
      {items}
    </div>
  );
}
