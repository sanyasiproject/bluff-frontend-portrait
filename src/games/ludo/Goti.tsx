import { memo } from 'react';
import { LUDO_COLOR_HEX, type LudoColor } from '../../types';

// A glossy pawn drawn in SVG: soft shadow, rim, body gradient, head highlight; the style changes the finish

const SHADE: Record<LudoColor, [string, string, string]> = {
  red: ['#ff9a8f', LUDO_COLOR_HEX.red, '#7f0f0c'],
  green: ['#a5ec9f', LUDO_COLOR_HEX.green, '#185c1b'],
  yellow: ['#fff6a8', '#f4c20d', '#8a6400'],
  blue: ['#9fd2ff', LUDO_COLOR_HEX.blue, '#0b3f85'],
};

function GotiSvg({ color, style, id }: { color: LudoColor; style: string; id: string }) {
  const [light, mid, dark] = SHADE[color];
  const metal = style === 'metal';
  const gem = style === 'gem';
  const marble = style === 'marble';
  return (
    <svg className="ld-pawn" viewBox="0 0 40 52" aria-hidden>
      <defs>
        <radialGradient id={`b${id}`} cx="35%" cy="30%" r="80%">
          <stop offset="0" stopColor={marble ? '#ffffff' : light} />
          <stop offset={marble ? '0.45' : '0.55'} stopColor={mid} />
          <stop offset="1" stopColor={dark} />
        </radialGradient>
        <linearGradient id={`r${id}`} x1="0" x2="1">
          <stop offset="0" stopColor={metal ? '#7a5a00' : dark} />
          <stop offset="0.5" stopColor={metal ? '#fff3b0' : light} />
          <stop offset="1" stopColor={metal ? '#7a5a00' : dark} />
        </linearGradient>
      </defs>
      {/* the shadow on the board */}
      <ellipse className="ld-pawn-shadow" cx="20" cy="47" rx="14" ry="4.2" />
      {/* rim */}
      <ellipse cx="20" cy="43" rx="14" ry="5.2" fill={`url(#r${id})`} />
      <ellipse cx="20" cy="41.4" rx="12.5" ry="4.2" fill={dark} opacity="0.55" />
      {/* body */}
      <path d="M9 41 C 11 31, 15 26, 15.5 21 L 24.5 21 C 25 26, 29 31, 31 41 Z" fill={`url(#b${id})`} />
      {/* collar */}
      <ellipse cx="20" cy="21.5" rx="7.2" ry="2.4" fill={`url(#r${id})`} />
      {/* head */}
      {gem ? (
        <polygon points="20,3 29,10 27,18 13,18 11,10" fill={`url(#b${id})`} stroke={light} strokeWidth="0.8" strokeLinejoin="round" />
      ) : (
        <circle cx="20" cy="12" r="8.6" fill={`url(#b${id})`} />
      )}
      {gem && <path d="M20 3 L20 18 M11 10 L29 10 M13 18 L20 10 L27 18" stroke="#fff" strokeOpacity="0.45" strokeWidth="0.6" fill="none" />}
      {marble && <path d="M14 30 C 18 27, 22 35, 27 31 M15 10 C 18 8, 21 15, 25 12" stroke="#fff" strokeOpacity="0.7" strokeWidth="1.3" fill="none" />}
      {/* highlights */}
      <ellipse cx="16.6" cy="8.6" rx="3.2" ry="2.2" fill="#fff" opacity={metal ? 0.9 : 0.75} transform="rotate(-25 16.6 8.6)" />
      <path d="M14 38 C 14.5 32, 16.5 28, 17.5 24" stroke="#fff" strokeOpacity="0.45" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      {style === 'crown' && <path d="M13 6 L15 1.5 L17.5 5 L20 0.5 L22.5 5 L25 1.5 L27 6 Z" fill="#ffd54f" stroke="#a67c00" strokeWidth="0.7" />}
    </svg>
  );
}

export const Goti = memo(GotiSvg);
