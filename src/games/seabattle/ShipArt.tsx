import { memo } from 'react';

// Our own warships, drawn lying left to right over `len` cells (one cell = 10 units):
// a grey hull with a pointed bow, deck planks, a bridge and guns by size

const HULL = '#7d8a96';
const DECK = '#a7b2bc';
const DARK = '#47525c';

function Turret({ x }: { x: number }) {
  return (
    <g>
      <rect x={x + 3.4} y={4.4} width={7} height={1.2} rx={0.6} fill={DARK} />
      <circle cx={x} cy={5} r={2.2} fill={DECK} stroke={DARK} strokeWidth={0.5} />
    </g>
  );
}

export const ShipArt = memo(function ShipArt({ len, sunk }: { len: number; sunk?: boolean }) {
  const w = len * 10;
  const hull = `M1.2 2.4 L${w - 6} 2.2 Q${w - 0.6} 5 ${w - 6} 7.8 L1.2 7.6 Q0.4 5 1.2 2.4Z`;
  const turrets = len >= 5 ? [9, 19, w - 16] : len === 4 ? [8, w - 14] : len === 3 ? [w - 12] : [];
  const bridgeX = len >= 4 ? w * 0.45 : len === 3 ? w * 0.3 : w * 0.28;
  return (
    <svg className={sunk ? 'sb-ship-svg sunk' : 'sb-ship-svg'} viewBox={`0 0 ${w} 10`} preserveAspectRatio="none" aria-hidden>
      {/* wake shadow */}
      <path d={hull} fill="#000" opacity={0.25} transform="translate(0.6 0.8)" />
      <path d={hull} fill={HULL} stroke={DARK} strokeWidth={0.5} />
      {/* deck */}
      <path d={`M3 3.6 L${w - 7} 3.5 Q${w - 3.5} 5 ${w - 7} 6.5 L3 6.4Z`} fill={DECK} />
      {Array.from({ length: Math.floor((w - 10) / 3) }, (_, i) => (
        <line key={i} x1={4.5 + i * 3} y1={3.7} x2={4.5 + i * 3} y2={6.3} stroke={HULL} strokeWidth={0.18} />
      ))}
      {/* bridge with windows and a mast */}
      <rect x={bridgeX - 3} y={3.1} width={6.5} height={3.8} rx={0.8} fill="#c3ccd4" stroke={DARK} strokeWidth={0.4} />
      <rect x={bridgeX - 2} y={4.4} width={4.5} height={0.9} rx={0.3} fill="#2b3640" />
      <circle cx={bridgeX + 0.2} cy={5} r={0.9} fill={DARK} />
      {len >= 3 && <rect x={bridgeX + 4.6} y={3.9} width={2.6} height={2.2} rx={1.1} fill={DARK} />}
      {turrets.map((x) => (
        <Turret key={x} x={x} />
      ))}
      {/* bow line */}
      <path d={`M${w - 9} 2.6 Q${w - 2.6} 5 ${w - 9} 7.4`} fill="none" stroke="#fff" strokeOpacity={0.3} strokeWidth={0.3} />
    </svg>
  );
});

/** a miss: a white splash ring */
export function Splash() {
  return (
    <i className="sb-splash" aria-hidden>
      <b />
      <b />
    </i>
  );
}

/** a hit: flames and smoke rising */
export function Fire({ big }: { big?: boolean }) {
  return (
    <i className={big ? 'sb-fire big' : 'sb-fire'} aria-hidden>
      <b className="sb-flame" />
      <b className="sb-flame f2" />
      <b className="sb-smoke" />
      <b className="sb-smoke s2" />
    </i>
  );
}
