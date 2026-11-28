import { memo } from 'react';

// Our own carrom board in cm (real proportions): a 74 cm birch playing surface inside a dark wooden frame,
// net pockets in the corners, baselines with red circles on each side, corner arrows and the centre design

export const SURFACE = 74;
export const FRAME = 7;
/** pocket centres and the drawn hole (a touch bigger than the capture radius) */
const POCKET_AT = 2.33;
const POCKET_R = 2.55;
/** baseline: 47 cm long, two lines 3.18 cm apart, 10.15 cm in from the edge */
const BL_IN = 10.15;
const BL_GAP = 3.18;
const BL_HALF = 23.5;
const C = SURFACE / 2;

/** one side's baseline (drawn for the bottom side, rotated for the others) */
function Baseline({ rot }: { rot: number }) {
  const y0 = SURFACE - BL_IN;
  const y1 = y0 - BL_GAP;
  const x0 = C - BL_HALF + BL_GAP / 2;
  const x1 = C + BL_HALF - BL_GAP / 2;
  return (
    <g transform={`rotate(${rot} ${C} ${C})`}>
      <line x1={x0} y1={y0} x2={x1} y2={y0} />
      <line x1={x0} y1={y1} x2={x1} y2={y1} />
      {[x0, x1].map((x) => (
        <g key={x}>
          <circle cx={x} cy={(y0 + y1) / 2} r={BL_GAP / 2} fill="#c62828" />
          <circle cx={x} cy={(y0 + y1) / 2} r={BL_GAP / 2 - 0.5} fill="none" stroke="#fff" strokeOpacity={0.35} strokeWidth={0.12} />
        </g>
      ))}
      {/* the corner arrow: from near the pocket towards the board, ending in an open circle */}
      <g transform={`rotate(0 ${C} ${C})`}>
        <line x1={SURFACE - 6.2} y1={SURFACE - 6.2} x2={SURFACE - 22} y2={SURFACE - 22} />
        <path d={`M${SURFACE - 6.2} ${SURFACE - 8.6} L${SURFACE - 6.2} ${SURFACE - 6.2} L${SURFACE - 8.6} ${SURFACE - 6.2}`} fill="none" />
        <circle cx={SURFACE - 24.2} cy={SURFACE - 24.2} r={3.1} fill="none" />
      </g>
    </g>
  );
}

export const CarromBoard = memo(function CarromBoard() {
  const pockets: [number, number][] = [
    [POCKET_AT, POCKET_AT],
    [SURFACE - POCKET_AT, POCKET_AT],
    [SURFACE - POCKET_AT, SURFACE - POCKET_AT],
    [POCKET_AT, SURFACE - POCKET_AT],
  ];
  return (
    <svg className="cr-svg" viewBox={`${-FRAME} ${-FRAME} ${SURFACE + FRAME * 2} ${SURFACE + FRAME * 2}`} aria-hidden>
      <defs>
        <linearGradient id="cr-frame" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5a2e14" />
          <stop offset="0.45" stopColor="#3b1c0b" />
          <stop offset="1" stopColor="#24110a" />
        </linearGradient>
        <linearGradient id="cr-frame-lip" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8a5530" />
          <stop offset="1" stopColor="#4a2510" />
        </linearGradient>
        <radialGradient id="cr-birch" cx="50%" cy="45%" r="75%">
          <stop offset="0" stopColor="#f6e4bf" />
          <stop offset="0.7" stopColor="#ecd3a2" />
          <stop offset="1" stopColor="#d9b67c" />
        </radialGradient>
        <pattern id="cr-grain" width="74" height="3.2" patternUnits="userSpaceOnUse">
          <path d="M0 1.2 Q18 0.6 37 1.4 T74 1.1" fill="none" stroke="#b98a4e" strokeOpacity="0.16" strokeWidth="0.18" />
          <path d="M0 2.6 Q24 2.9 44 2.3 T74 2.7" fill="none" stroke="#a87a40" strokeOpacity="0.1" strokeWidth="0.12" />
        </pattern>
        <pattern id="cr-wood" width="6" height="90" patternUnits="userSpaceOnUse" patternTransform="rotate(90)">
          <path d="M1 0 Q2 45 1.4 90 M3.6 0 Q4.4 40 3.2 90" fill="none" stroke="#000" strokeOpacity="0.18" strokeWidth="0.25" />
        </pattern>
        <radialGradient id="cr-hole" cx="50%" cy="40%" r="60%">
          <stop offset="0" stopColor="#000" />
          <stop offset="0.7" stopColor="#0b0b0b" />
          <stop offset="1" stopColor="#2a2a2a" />
        </radialGradient>
        <pattern id="cr-net" width="0.9" height="0.9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <path d="M0 0 H0.9 M0 0 V0.9" stroke="#555" strokeWidth="0.1" />
        </pattern>
        <radialGradient id="cr-light" cx="40%" cy="30%" r="80%">
          <stop offset="0" stopColor="#fff" stopOpacity="0.22" />
          <stop offset="0.6" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.16" />
        </radialGradient>
      </defs>
      {/* frame: dark polished wood with a lighter inner lip */}
      <rect x={-FRAME} y={-FRAME} width={SURFACE + FRAME * 2} height={SURFACE + FRAME * 2} rx={3} fill="url(#cr-frame)" />
      <rect x={-FRAME} y={-FRAME} width={SURFACE + FRAME * 2} height={SURFACE + FRAME * 2} rx={3} fill="url(#cr-wood)" />
      <rect x={-FRAME + 0.6} y={-FRAME + 0.6} width={SURFACE + FRAME * 2 - 1.2} height={SURFACE + FRAME * 2 - 1.2} rx={2.6} fill="none" stroke="#a06a3d" strokeOpacity={0.45} strokeWidth={0.3} />
      <rect x={-1.2} y={-1.2} width={SURFACE + 2.4} height={SURFACE + 2.4} fill="url(#cr-frame-lip)" />
      {/* playing surface */}
      <rect width={SURFACE} height={SURFACE} fill="url(#cr-birch)" />
      <rect width={SURFACE} height={SURFACE} fill="url(#cr-grain)" />
      {/* line art */}
      <g stroke="#2a1a10" strokeWidth={0.28} fill="none" strokeLinecap="round">
        {[0, 90, 180, 270].map((r) => (
          <Baseline key={r} rot={r} />
        ))}
        <circle cx={C} cy={C} r={8.5} />
        <circle cx={C} cy={C} r={7.9} strokeWidth={0.14} />
      </g>
      {/* centre design: a red eight-point star in the outer circle */}
      <g transform={`translate(${C} ${C})`}>
        {[0, 45].map((a) => (
          <path key={a} transform={`rotate(${a})`} d="M0 -7.6 L1.5 -1.5 L7.6 0 L1.5 1.5 L0 7.6 L-1.5 1.5 L-7.6 0 L-1.5 -1.5Z" fill={a ? '#1d1d1d' : '#c62828'} opacity={a ? 0.75 : 0.9} />
        ))}
        <circle r={1.59} fill="#f3e0b8" stroke="#c62828" strokeWidth={0.3} />
        <circle r={0.6} fill="#c62828" />
      </g>
      {/* pockets: a dark lip, black depth and the net */}
      {pockets.map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <circle cx={x} cy={y} r={POCKET_R + 0.35} fill="#3a2414" />
          <circle cx={x} cy={y} r={POCKET_R} fill="url(#cr-hole)" />
          <circle cx={x} cy={y} r={POCKET_R * 0.78} fill="url(#cr-net)" opacity={0.75} />
          <circle cx={x} cy={y - 0.4} r={POCKET_R * 0.95} fill="none" stroke="#000" strokeOpacity={0.6} strokeWidth={0.5} />
        </g>
      ))}
      <rect width={SURFACE} height={SURFACE} fill="url(#cr-light)" pointerEvents="none" />
      {/* inner shadow from the frame */}
      <rect x={0.2} y={0.2} width={SURFACE - 0.4} height={SURFACE - 0.4} fill="none" stroke="#000" strokeOpacity={0.22} strokeWidth={0.5} />
    </svg>
  );
});
