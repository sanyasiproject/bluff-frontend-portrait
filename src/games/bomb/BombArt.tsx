import { memo } from 'react';
import { cx } from '../../lib/cards';

// Our own cartoon bomb: a glossy round body, a brass cap, a curly fuse with a spark and smoke puffs.
// heat 0..3 makes the glow hotter and the wobble faster (all in CSS)

export const BombArt = memo(function BombArt({ heat, held }: { heat: number; held: boolean }) {
  return (
    <div className={cx('bm-bomb', held && 'held', `heat-${heat}`)} aria-hidden>
      <i className="bm-glow" />
      <svg viewBox="0 0 120 130" className="bm-bomb-svg">
        <defs>
          <radialGradient id="bm-body" cx="38%" cy="36%" r="70%">
            <stop offset="0" stopColor="#5b6270" />
            <stop offset="0.35" stopColor="#2c313b" />
            <stop offset="1" stopColor="#0c0e12" />
          </radialGradient>
          <linearGradient id="bm-cap" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#8a6a1f" />
            <stop offset="0.45" stopColor="#f2d27a" />
            <stop offset="1" stopColor="#6d5214" />
          </linearGradient>
          <radialGradient id="bm-heat" cx="50%" cy="55%" r="55%">
            <stop offset="0" stopColor="#ff5722" stopOpacity="0.7" />
            <stop offset="1" stopColor="#ff5722" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* fuse: a curly cord from the cap */}
        <path className="bm-fuse" d="M68 30 C74 18 88 22 86 12 C85 6 92 3 96 6" fill="none" stroke="#c8a774" strokeWidth="4" strokeLinecap="round" />
        <path d="M68 30 C74 18 88 22 86 12 C85 6 92 3 96 6" fill="none" stroke="#7a5a2e" strokeWidth="4" strokeLinecap="round" strokeDasharray="2 3" opacity="0.6" />
        {/* body */}
        <circle cx="56" cy="78" r="44" fill="url(#bm-body)" />
        <circle className="bm-hot" cx="56" cy="78" r="44" fill="url(#bm-heat)" />
        <ellipse cx="40" cy="58" rx="13" ry="8" fill="#fff" opacity="0.28" transform="rotate(-30 40 58)" />
        <circle cx="34" cy="52" r="3.2" fill="#fff" opacity="0.7" />
        {/* cap */}
        <rect x="52" y="26" width="22" height="14" rx="3" fill="url(#bm-cap)" transform="rotate(28 63 33)" />
        <rect x="52" y="26" width="22" height="3" rx="1.5" fill="#fff6d0" opacity="0.6" transform="rotate(28 63 33)" />
      </svg>
      {/* the spark at the fuse tip and a few smoke puffs */}
      <span className="bm-spark">
        <i />
        <i />
        <i />
        <i />
      </span>
      <span className="bm-smoke">
        <i />
        <i />
        <i />
      </span>
    </div>
  );
});

/** a comic blast: a jagged star, a ring and smoke clouds */
export function Blast() {
  return (
    <div className="bm-blast" aria-hidden>
      <svg viewBox="-60 -60 120 120">
        <path
          d="M0 -56 L12 -24 L42 -40 L28 -10 L58 0 L28 12 L44 40 L12 26 L0 56 L-12 26 L-42 42 L-28 12 L-58 0 L-28 -10 L-40 -40 L-12 -24Z"
          fill="#ffd54f"
          stroke="#e65100"
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <path d="M0 -34 L8 -14 L26 -22 L16 -4 L34 4 L14 10 L22 28 L4 16 L-6 32 L-10 14 L-30 20 L-18 2 L-34 -8 L-14 -12 L-20 -30Z" fill="#ff7043" />
        <text y="8" textAnchor="middle" fontSize="20" fontWeight="900" fill="#fff" stroke="#b71c1c" strokeWidth="1.4" style={{ paintOrder: 'stroke' }}>
          BOOM!
        </text>
      </svg>
      <i className="bm-ring" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <i key={i} className="bm-cloud" style={{ ['--a' as string]: `${i * 60 + 15}deg` }} />
      ))}
    </div>
  );
}

/** a heart: full or popped */
export function Heart({ full, pop }: { full: boolean; pop?: boolean }) {
  return <i className={cx('bm-heart', !full && 'gone', pop && 'pop')}>{full || pop ? '❤️' : '🖤'}</i>;
}
