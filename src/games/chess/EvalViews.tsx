import { useRef, type PointerEvent as RPointerEvent } from 'react';
import { cx } from '../../lib/cards';
import { winPercent, type Color } from './lib';

// The eval bar beside the board and the eval graph across a game's moves

/** a vertical bar: White's share from the bottom when White is at the bottom */
export function EvalBar({ cp, orient, label }: { cp: number; orient: Color; label: string }) {
  const white = Math.max(0.02, Math.min(0.98, winPercent(cp) / 100));
  return (
    <div className={cx('ce-bar', orient === 'b' && 'flipped')} role="meter" aria-label={`Evaluation ${label}`} aria-valuenow={Math.round(white * 100)}>
      <i className="ce-bar-white" style={{ transform: `scaleY(${white})` }} />
      <i className="ce-bar-mid" />
      <span className={cx('ce-bar-num', cp >= 0 ? 'w' : 'b')}>{label}</span>
    </div>
  );
}

/** an area graph of White's winning chances move by move; tap or drag to jump to a move */
export function EvalGraph({ evals, ply, onPly, marks }: { evals: number[]; ply: number; onPly: (ply: number) => void; marks?: { ply: number; tone: string }[] }) {
  const ref = useRef<SVGSVGElement>(null);
  const n = Math.max(1, evals.length - 1);
  const W = 300;
  const H = 70;
  const y = (cp: number) => H - (winPercent(cp) / 100) * H;
  const pts = evals.map((cp, i) => `${((i / n) * W).toFixed(1)},${y(cp).toFixed(1)}`);
  const area = `M0,${H} L${pts.join(' L')} L${W},${H} Z`;
  const jump = (e: RPointerEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const i = Math.round(((e.clientX - r.left) / r.width) * n);
    onPly(Math.max(0, Math.min(evals.length - 1, i)));
  };
  return (
    <svg
      ref={ref}
      className="ce-graph"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      onPointerDown={(e) => (e.currentTarget.setPointerCapture(e.pointerId), jump(e))}
      onPointerMove={(e) => e.buttons && jump(e)}
      role="img"
      aria-label="Evaluation graph"
    >
      <rect width={W} height={H} className="ce-graph-bg" />
      <path d={area} className="ce-graph-area" />
      <line x1={0} x2={W} y1={H / 2} y2={H / 2} className="ce-graph-mid" />
      {marks?.map((m) => (
        <circle key={m.ply} cx={(m.ply / n) * W} cy={y(evals[m.ply] ?? 0)} r={3} fill={m.tone} vectorEffect="non-scaling-stroke" />
      ))}
      <line x1={(ply / n) * W} x2={(ply / n) * W} y1={0} y2={H} className="ce-graph-now" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
