import { memo } from 'react';
import { DART_NUMBERS, DART_RINGS } from '../../types';

// Our own dartboard drawing: black and cream singles, red and green doubles and trebles (sized from DART_RINGS),
// silver wires, a chrome number ring on the black surround.
// Board units: scoring radius 1, the board drawn to BOARD_R; SVG y runs down, so a point (x, y) sits at (x, -y)

export const BOARD_R = 1.32;
const R = DART_RINGS;
/** the number ring sits between the scoring edge and the rim */
const NUM_R = (R.doubleOut + BOARD_R) / 2 + 0.005;

/** a point at radius r, angle a degrees clockwise from the top */
const xy = (r: number, a: number): [number, number] => {
  const t = (a * Math.PI) / 180;
  return [r * Math.sin(t), -r * Math.cos(t)];
};
const pt = (r: number, a: number) => xy(r, a).map((v) => v.toFixed(4)).join(' ');
/** a ring slice between two radii and two angles */
function slice(r0: number, r1: number, a0: number, a1: number): string {
  return `M${pt(r0, a0)} L${pt(r1, a0)} A${r1} ${r1} 0 0 1 ${pt(r1, a1)} L${pt(r0, a1)} A${r0} ${r0} 0 0 0 ${pt(r0, a0)}Z`;
}

const SEGS = DART_NUMBERS.map((n, i) => ({
  n,
  i,
  a0: i * 18 - 9,
  a1: i * 18 + 9,
  dark: i % 2 === 0,
}));

export const DartBoard = memo(function DartBoard() {
  return (
    <svg className="dt-svg" viewBox={`${-BOARD_R} ${-BOARD_R} ${BOARD_R * 2} ${BOARD_R * 2}`} aria-hidden>
      <defs>
        <radialGradient id="dt-light" cx="45%" cy="35%" r="75%">
          <stop offset="0" stopColor="#fff" stopOpacity="0.18" />
          <stop offset="0.55" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.35" />
        </radialGradient>
        <radialGradient id="dt-rim" cx="50%" cy="38%" r="60%">
          <stop offset="0.8" stopColor="#2b2b2b" />
          <stop offset="1" stopColor="#050505" />
        </radialGradient>
        <linearGradient id="dt-chrome" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f5f7f8" />
          <stop offset="0.35" stopColor="#9aa3a8" />
          <stop offset="0.55" stopColor="#eef1f2" />
          <stop offset="1" stopColor="#6b7378" />
        </linearGradient>
        <pattern id="dt-fibre" width="0.024" height="0.024" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
          <rect width="0.012" height="0.024" fill="#000" opacity="0.07" />
        </pattern>
      </defs>
      {/* the black surround, a chrome lip and the number ring */}
      <circle r={BOARD_R} fill="url(#dt-rim)" />
      <circle r={BOARD_R - 0.02} fill="none" stroke="url(#dt-chrome)" strokeWidth="0.03" />
      <circle r={R.doubleOut + 0.012} fill="none" stroke="url(#dt-chrome)" strokeWidth="0.02" />
      {SEGS.map((s) => (
        <g key={s.n}>
          {/* inner single, treble, outer single, double */}
          <path d={slice(R.outerBull, R.trebleIn, s.a0, s.a1)} className={s.dark ? 'dt-dark' : 'dt-light'} />
          <path d={slice(R.trebleIn, R.trebleOut, s.a0, s.a1)} className={s.dark ? 'dt-red' : 'dt-green'} />
          <path d={slice(R.trebleOut, R.doubleIn, s.a0, s.a1)} className={s.dark ? 'dt-dark' : 'dt-light'} />
          <path d={slice(R.doubleIn, R.doubleOut, s.a0, s.a1)} className={s.dark ? 'dt-red' : 'dt-green'} />
        </g>
      ))}
      <circle r={R.outerBull} className="dt-green" />
      <circle r={R.bull} className="dt-red" />
      <circle r={R.doubleOut} fill="url(#dt-fibre)" />
      {/* the metal spider: a dark shadow line under a bright wire */}
      {['dt-wire-shadow', 'dt-wire'].map((k) => (
        <g key={k} className={k}>
          {SEGS.map((s) => {
            const [x1, y1] = xy(R.outerBull, s.a0);
            const [x2, y2] = xy(R.doubleOut, s.a0);
            return <line key={s.n} x1={x1} y1={y1} x2={x2} y2={y2} />;
          })}
          {[R.bull, R.outerBull, R.trebleIn, R.trebleOut, R.doubleIn, R.doubleOut].map((r) => (
            <circle key={r} r={r} fill="none" />
          ))}
        </g>
      ))}
      <circle r={BOARD_R} fill="url(#dt-light)" pointerEvents="none" />
      {SEGS.map((s) => {
        const [x, y] = xy(NUM_R, s.i * 18);
        return (
          <text key={s.n} x={x} y={y} className="dt-num" textAnchor="middle" dominantBaseline="central">
            {s.n}
          </text>
        );
      })}
    </svg>
  );
});
