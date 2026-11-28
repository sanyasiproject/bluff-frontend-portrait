import type { Color, Square } from './lib';
import { screenXY } from './boardKeys';

// Arrows over the board (best move, a better move, engine lines), drawn on an 8×8 grid

export interface Arrow {
  from: Square;
  to: Square;
  tone: 'best' | 'alt' | 'bad' | 'mine';
  /** 0..1, thinner and fainter for weaker lines */
  weight?: number;
}

const TONE: Record<Arrow['tone'], string> = { best: '#2f9e44', alt: '#1c7ed6', bad: '#e8590c', mine: '#f59f00' };

export function Arrows({ arrows, orient }: { arrows: Arrow[]; orient: Color }) {
  if (!arrows.length) return null;
  return (
    <svg className="cb-arrows" viewBox="0 0 8 8" aria-hidden>
      <defs>
        {Object.entries(TONE).map(([k, c]) => (
          <marker key={k} id={`cb-head-${k}`} viewBox="0 0 4 4" refX="2" refY="2" markerWidth="3" markerHeight="3" orient="auto">
            <path d="M0 0L4 2L0 4z" fill={c} />
          </marker>
        ))}
      </defs>
      {arrows.map((a, i) => {
        const [x1, y1] = screenXY(a.from, orient);
        const [x2, y2] = screenXY(a.to, orient);
        const ax = x1 + 0.5;
        const ay = y1 + 0.5;
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.hypot(dx, dy) || 1;
        // stop short so the head sits inside the target square
        const bx = x2 + 0.5 - (dx / len) * 0.38;
        const by = y2 + 0.5 - (dy / len) * 0.38;
        const w = a.weight ?? 1;
        if (a.from === a.to) return <circle key={i} cx={ax} cy={ay} r={0.42} fill="none" stroke={TONE[a.tone]} strokeWidth={0.08} opacity={0.85} />;
        return (
          <line
            key={i}
            x1={ax}
            y1={ay}
            x2={bx}
            y2={by}
            stroke={TONE[a.tone]}
            strokeWidth={0.1 + 0.08 * w}
            strokeLinecap="round"
            opacity={0.5 + 0.35 * w}
            markerEnd={`url(#cb-head-${a.tone})`}
          />
        );
      })}
    </svg>
  );
}
