import { useEffect, useRef, type CSSProperties } from 'react';
import type { FruitItemKind } from '../../types';
import { JUICE, SIZE, sprite } from './sprites';

// The item on the plate (our glossy fruit sprite, or the red-silver magnet), its two halves when cut, and the talwar

/** one glossy fruit, drawn once from the sprite cache; `half` shows only the left or right half */
export function FruitArt({ kind, px, half }: { kind: Exclude<FruitItemKind, 'magnet'>; px: number; half?: 'l' | 'r' }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const r = px / 3 / SIZE[kind];
    const img = sprite(kind, r, dpr);
    cv.width = img.width;
    cv.height = img.height;
    const c = cv.getContext('2d');
    c?.clearRect(0, 0, cv.width, cv.height);
    c?.drawImage(img, 0, 0);
  }, [kind, px]);
  return <canvas ref={ref} className={half ? `fr-half ${half}` : 'fr-fruit'} style={{ width: px, height: px }} aria-hidden />;
}

/** the magnet: a big red horseshoe with silver tips and a spark, plainly "don't cut" */
export function MagnetArt({ px }: { px: number }) {
  return (
    <svg className="fr-magnet" viewBox="-50 -50 100 100" style={{ width: px, height: px }} aria-hidden>
      <defs>
        <linearGradient id="fr-mag-red" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff6b6b" />
          <stop offset="0.5" stopColor="#e53935" />
          <stop offset="1" stopColor="#8e0000" />
        </linearGradient>
        <linearGradient id="fr-mag-steel" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#90a4ae" />
          <stop offset="0.45" stopColor="#ffffff" />
          <stop offset="1" stopColor="#607d8b" />
        </linearGradient>
      </defs>
      <circle r="44" fill="rgba(255, 82, 82, 0.18)" />
      <path d="M -26 -30 L -26 2 A 26 26 0 0 0 26 2 L 26 -30" fill="none" stroke="#3b0000" strokeWidth="23" strokeLinecap="butt" />
      <path d="M -26 -30 L -26 2 A 26 26 0 0 0 26 2 L 26 -30" fill="none" stroke="url(#fr-mag-red)" strokeWidth="19" />
      <rect x="-36" y="-42" width="20" height="14" rx="2" fill="url(#fr-mag-steel)" stroke="#37474f" strokeWidth="1.5" />
      <rect x="16" y="-42" width="20" height="14" rx="2" fill="url(#fr-mag-steel)" stroke="#37474f" strokeWidth="1.5" />
      <path d="M -20 -12 Q -18 10 0 18" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="3" strokeLinecap="round" />
      <path className="fr-spark" d="M -8 -40 l 6 -6 l -2 6 l 7 -5" fill="none" stroke="#ffeb3b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** juice drops flying out from a cut fruit */
export function Juice({ kind }: { kind: Exclude<FruitItemKind, 'magnet'> }) {
  return (
    <span className="fr-juice" aria-hidden>
      {Array.from({ length: 9 }, (_, i) => (
        <i key={i} style={{ '--a': `${i * 40 + 10}deg`, '--d': `${70 + (i % 3) * 22}%`, background: JUICE[kind] } as CSSProperties} />
      ))}
    </span>
  );
}

/** a talwar pointing up: a curved steel blade, a gold guard and a grip in the player's colour */
export function Sword({ color }: { color: string }) {
  return (
    <svg className="fr-sword-art" viewBox="0 0 40 160" aria-hidden>
      <defs>
        <linearGradient id="fr-blade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#b0bec5" />
          <stop offset="0.5" stopColor="#ffffff" />
          <stop offset="1" stopColor="#78909c" />
        </linearGradient>
      </defs>
      <path d="M 16 112 C 12 80 14 40 30 6 C 28 40 26 80 26 112 Z" fill="url(#fr-blade)" stroke="#455a64" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M 20 108 C 18 80 20 46 28 16" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="1.2" />
      <path d="M 4 114 Q 21 106 38 114 Q 21 122 4 114 Z" fill="#ffca28" stroke="#8d6e00" strokeWidth="1.5" />
      <rect x="15" y="118" width="12" height="28" rx="5" fill={color} stroke="rgba(0,0,0,0.45)" strokeWidth="1.5" />
      <path d="M 15 126 h 12 M 15 134 h 12" stroke="rgba(0,0,0,0.3)" strokeWidth="2" />
      <circle cx="21" cy="151" r="6" fill="#ffca28" stroke="#8d6e00" strokeWidth="1.5" />
    </svg>
  );
}
