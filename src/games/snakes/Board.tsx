import { memo } from 'react';
import { SNAKES_GOAL, snakesCellOf } from '../../types';
import { headAngle, LADDER_LIST, ladderOf, SNAKE_LIST, smoothPath, snakeBody, snakePoints } from './geometry';

// The flat 10×10 board: numbered squares in snaking order, our own curvy snakes and wooden ladders, all SVG

/** each snake's skin: body, belly stripe, spots */
const SKINS: [string, string, string][] = [
  ['#43a047', '#c5e1a5', '#1b5e20'],
  ['#8e24aa', '#e1bee7', '#4a148c'],
  ['#fb8c00', '#ffe0b2', '#bf360c'],
  ['#1e88e5', '#bbdefb', '#0d47a1'],
  ['#e53935', '#ffcdd2', '#7f0000'],
  ['#00897b', '#b2dfdb', '#004d40'],
  ['#c0ca33', '#f0f4c3', '#558b2f'],
  ['#d81b60', '#f8bbd0', '#880e4f'],
];

/** a bright row colour, a light and a deep shade for the checker */
const cellFill = (col: number, row: number) => {
  const hue = [4, 28, 46, 96, 148, 178, 205, 238, 278, 322][row];
  return (col + row) % 2 === 0 ? `hsl(${hue} 88% 66%)` : `hsl(${hue} 78% 54%)`;
};

function Snake({ head, tail, skin }: { head: number; tail: number; skin: [string, string, string] }) {
  const pts = snakePoints(head, tail);
  const [hx, hy] = pts[0];
  const [body, belly, spot] = skin;
  return (
    <g className="sn-snake">
      <path d={snakeBody(pts)} fill={body} stroke={spot} strokeWidth={0.05} strokeLinejoin="round" />
      <path d={smoothPath(pts.slice(3))} fill="none" stroke={belly} strokeWidth={0.06} strokeLinecap="round" opacity={0.85} />
      <path d={smoothPath(pts.slice(4, -4))} fill="none" stroke={spot} strokeWidth={0.12} strokeDasharray="0.04 0.26" strokeLinecap="round" opacity={0.9} />
      <g transform={`translate(${hx} ${hy}) rotate(${headAngle(pts)})`}>
        {/* forked tongue */}
        <path d="M0.2 0 L0.36 0 L0.43 -0.05 M0.36 0 L0.43 0.05" stroke="#e53935" strokeWidth={0.03} fill="none" strokeLinecap="round" />
        <ellipse cx={0.04} cy={0} rx={0.22} ry={0.17} fill={body} stroke={spot} strokeWidth={0.035} />
        <ellipse cx={0.08} cy={-0.085} rx={0.065} ry={0.07} fill="#fff" />
        <ellipse cx={0.08} cy={0.085} rx={0.065} ry={0.07} fill="#fff" />
        <circle cx={0.1} cy={-0.085} r={0.035} fill="#111" />
        <circle cx={0.1} cy={0.085} r={0.035} fill="#111" />
        <circle cx={0.115} cy={-0.1} r={0.012} fill="#fff" />
        <circle cx={0.115} cy={0.07} r={0.012} fill="#fff" />
        {/* blush */}
        <ellipse cx={-0.06} cy={-0.12} rx={0.04} ry={0.025} fill="#ff8a80" opacity={0.7} />
        <ellipse cx={-0.06} cy={0.12} rx={0.04} ry={0.025} fill="#ff8a80" opacity={0.7} />
      </g>
    </g>
  );
}

function Ladder({ foot, top }: { foot: number; top: number }) {
  const { rails, rungs } = ladderOf(foot, top);
  const line = ([a, b]: [[number, number], [number, number]], cls: string, i: number) => (
    <line key={`${cls}${i}`} className={cls} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} />
  );
  return (
    <g className="sn-ladder">
      {rails.map((r, i) => line(r, 'sn-rail-shadow', i))}
      {rungs.map((r, i) => line(r, 'sn-rung', i))}
      {rails.map((r, i) => line(r, 'sn-rail', i))}
      {rails.map((r, i) => line(r, 'sn-rail-shine', i))}
    </g>
  );
}

function BoardSvg() {
  const squares = Array.from({ length: SNAKES_GOAL }, (_, i) => i + 1);
  return (
    <svg className="sn-svg" viewBox="-0.08 -0.08 10.16 10.16" aria-label="Saanp Seedhi board">
      <defs>
        <linearGradient id="sn-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff3a0" />
          <stop offset="0.5" stopColor="#ffc531" />
          <stop offset="1" stopColor="#ff8f00" />
        </linearGradient>
        <radialGradient id="sn-gloss" cx="0.3" cy="0.2" r="0.9">
          <stop offset="0" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="0.6" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect className="sn-frame" x={-0.08} y={-0.08} width={10.16} height={10.16} rx={0.3} />
      {squares.map((sq) => {
        const [c, r] = snakesCellOf(sq)!;
        return (
          <g key={sq}>
            <rect x={c} y={r} width={1} height={1} fill={sq === SNAKES_GOAL ? 'url(#sn-gold)' : cellFill(c, r)} className="sn-cell" />
            <rect x={c} y={r} width={1} height={1} fill="url(#sn-gloss)" />
            <text x={c + 0.07} y={r + 0.3} className={sq === SNAKES_GOAL ? 'sn-num goal' : 'sn-num'}>
              {sq}
            </text>
          </g>
        );
      })}
      {/* 100: the finish */}
      <text x={0.56} y={0.9} className="sn-goal-flag" textAnchor="middle">
        🏁
      </text>
      {LADDER_LIST.map((l) => (
        <Ladder key={`l${l.foot}`} foot={l.foot} top={l.top} />
      ))}
      {SNAKE_LIST.map((s, i) => (
        <Snake key={`s${s.head}`} head={s.head} tail={s.tail} skin={SKINS[i % SKINS.length]} />
      ))}
    </svg>
  );
}

export const Board = memo(BoardSvg);
