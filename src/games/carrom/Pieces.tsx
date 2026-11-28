import { memo, type Ref } from 'react';
import { FRAME, SURFACE } from './Board';

// Coins and the striker, drawn in board cm over the board. Each piece is a <g> whose transform the table moves
// straight from the simulation (no React render per frame)

export type PieceKind = 'w' | 'b' | 'q' | 's';
/** board units to drawn cm */
export const CM = SURFACE;

/** shared gradients for the pieces (once per board) */
export function PieceDefs() {
  return (
    <defs>
      <radialGradient id="cr-w" cx="38%" cy="32%" r="75%">
        <stop offset="0" stopColor="#fffdf6" />
        <stop offset="0.6" stopColor="#f1e3c4" />
        <stop offset="1" stopColor="#cdb58a" />
      </radialGradient>
      <radialGradient id="cr-b" cx="38%" cy="32%" r="75%">
        <stop offset="0" stopColor="#5c4033" />
        <stop offset="0.55" stopColor="#2a1810" />
        <stop offset="1" stopColor="#0d0805" />
      </radialGradient>
      <radialGradient id="cr-q" cx="38%" cy="32%" r="75%">
        <stop offset="0" stopColor="#ff8a80" />
        <stop offset="0.5" stopColor="#d50000" />
        <stop offset="1" stopColor="#7f0000" />
      </radialGradient>
      <radialGradient id="cr-s" cx="38%" cy="30%" r="80%">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="0.55" stopColor="#e8eef3" />
        <stop offset="1" stopColor="#9fb0bd" />
      </radialGradient>
      <radialGradient id="cr-gloss" cx="34%" cy="26%" r="40%">
        <stop offset="0" stopColor="#fff" stopOpacity="0.85" />
        <stop offset="1" stopColor="#fff" stopOpacity="0" />
      </radialGradient>
    </defs>
  );
}

const RING: Record<PieceKind, string> = { w: '#b89564', b: '#7a5440', q: '#ff5252', s: '#1e88e5' };

/** one piece at the origin, radius r: body, wood-grain rings, a rim and the gloss */
export function PieceShape({ kind, r }: { kind: PieceKind; r: number }) {
  return (
    <>
      <circle r={r} cy={r * 0.14} fill="#000" opacity={0.35} />
      <circle r={r} fill={`url(#cr-${kind})`} />
      {[0.78, 0.56, 0.34].map((k) => (
        <circle key={k} r={r * k} fill="none" stroke={RING[kind]} strokeOpacity={kind === 's' ? 0.5 : 0.45} strokeWidth={r * (kind === 's' ? 0.07 : 0.05)} />
      ))}
      {kind === 's' && <circle r={r * 0.2} fill="#1e88e5" opacity={0.7} />}
      <circle r={r - 0.06} fill="none" stroke="#000" strokeOpacity={0.3} strokeWidth={0.12} />
      <ellipse rx={r * 0.62} ry={r * 0.42} cx={-r * 0.18} cy={-r * 0.3} fill="url(#cr-gloss)" />
    </>
  );
}

export interface PieceInfo {
  id: string;
  kind: PieceKind;
  /** radius and centre in board units, on my screen */
  r: number;
  x: number;
  y: number;
}

/** every piece on the board; `bind` hands each <g> to the animator */
export const Pieces = memo(function Pieces({ pieces, bind, svgRef }: { pieces: PieceInfo[]; bind: (id: string, el: SVGGElement | null) => void; svgRef?: Ref<SVGSVGElement> }) {
  return (
    <svg ref={svgRef} className="cr-pieces" viewBox={`${-FRAME} ${-FRAME} ${SURFACE + FRAME * 2} ${SURFACE + FRAME * 2}`} aria-hidden>
      <PieceDefs />
      {pieces.map((p) => (
        <g key={p.id} ref={(el) => bind(p.id, el)} className={`cr-piece ${p.kind}`} transform={`translate(${p.x * CM} ${p.y * CM})`}>
          <PieceShape kind={p.kind} r={p.r * CM} />
        </g>
      ))}
    </svg>
  );
});
