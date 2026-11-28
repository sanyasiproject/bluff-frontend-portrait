import { useEffect, useRef, type CSSProperties, type RefObject } from 'react';
import type { FruitItemKind } from '../../types';
import { faceSprite } from './faces';
import { JUICE, SIZE, sprite } from './sprites';

// The item on the plate (our glossy fruit sprite, or the red-silver magnet), the cut face inside a half, and the talwar

type Fruit = Exclude<FruitItemKind, 'magnet'>;

/** paints a cached sprite canvas into a <canvas> */
function usePaint(ref: RefObject<HTMLCanvasElement>, make: (dpr: number) => HTMLCanvasElement, deps: unknown[]) {
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const img = make(Math.min(3, window.devicePixelRatio || 1));
    cv.width = img.width;
    cv.height = img.height;
    const c = cv.getContext('2d');
    c?.clearRect(0, 0, cv.width, cv.height);
    c?.drawImage(img, 0, 0);
  }, deps);
}

/** one glossy fruit, drawn once from the sprite cache */
export function FruitArt({ kind, px }: { kind: Fruit; px: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  usePaint(ref, (dpr) => sprite(kind, px / 3 / SIZE[kind], dpr), [kind, px]);
  return <canvas ref={ref} className="fr-fruit" style={{ width: px, height: px }} aria-hidden />;
}

/** the inside of a cut fruit (melon red with seeds, orange segments, apple flesh and core), seen face-on */
export function CutFace({ kind, px }: { kind: Fruit; px: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  usePaint(ref, (dpr) => faceSprite(kind, px / 2, dpr), [kind, px]);
  return <canvas ref={ref} className="fr-face-art" style={{ width: px, height: px }} aria-hidden />;
}

/** the magnet: a shiny red horseshoe with polished silver poles and a spark, plainly "don't cut" */
export function MagnetArt({ px }: { px: number }) {
  const arc = 'M -26 -30 L -26 2 A 26 26 0 0 0 26 2 L 26 -30';
  return (
    <svg className="fr-magnet" viewBox="-50 -50 100 100" style={{ width: px, height: px }} aria-hidden>
      <defs>
        <linearGradient id="fr-mag-red" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#7f0000" />
          <stop offset="0.22" stopColor="#ff5f5f" />
          <stop offset="0.34" stopColor="#ffd0d0" />
          <stop offset="0.48" stopColor="#e53935" />
          <stop offset="1" stopColor="#6d0000" />
        </linearGradient>
        <linearGradient id="fr-mag-steel" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#607d8b" />
          <stop offset="0.3" stopColor="#ffffff" />
          <stop offset="0.55" stopColor="#b0bec5" />
          <stop offset="1" stopColor="#455a64" />
        </linearGradient>
        <radialGradient id="fr-mag-glow">
          <stop offset="0.5" stopColor="rgba(255,82,82,0.28)" />
          <stop offset="1" stopColor="rgba(255,82,82,0)" />
        </radialGradient>
      </defs>
      <circle r="48" fill="url(#fr-mag-glow)" />
      <ellipse cx="0" cy="34" rx="30" ry="6" fill="rgba(0,0,0,0.28)" />
      <path d={arc} fill="none" stroke="#2b0000" strokeWidth="24" />
      <path d={arc} fill="none" stroke="url(#fr-mag-red)" strokeWidth="20" />
      <path d="M -31 -28 L -31 2 A 31 31 0 0 0 -8 31" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2.2" strokeLinecap="round" />
      <rect x="-37" y="-44" width="22" height="15" rx="2.5" fill="url(#fr-mag-steel)" stroke="#263238" strokeWidth="1.4" />
      <rect x="15" y="-44" width="22" height="15" rx="2.5" fill="url(#fr-mag-steel)" stroke="#263238" strokeWidth="1.4" />
      <path d="M -33 -41 h 8 M 19 -41 h 8" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.9" />
      <path className="fr-spark" d="M -8 -40 l 6 -6 l -2 6 l 7 -5" fill="none" stroke="#ffeb3b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** juice drops flying out from a cut fruit */
export function Juice({ kind }: { kind: Fruit }) {
  return (
    <span className="fr-juice" aria-hidden>
      {Array.from({ length: 9 }, (_, i) => (
        <i key={i} style={{ '--a': `${i * 40 + 10}deg`, '--d': `${70 + (i % 3) * 22}%`, background: JUICE[kind] } as CSSProperties} />
      ))}
    </span>
  );
}

/** a curved Indian talwar pointing up: polished steel with a fuller and a shine, brass guard, knuckle bow, disc pommel */
export function Sword({ color }: { color: string }) {
  return (
    <svg className="fr-sword-art" viewBox="0 0 40 160" aria-hidden>
      <defs>
        <linearGradient id="fr-tw-steel" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#5f6f7a" />
          <stop offset="0.35" stopColor="#cfd8dc" />
          <stop offset="0.55" stopColor="#ffffff" />
          <stop offset="0.8" stopColor="#9aa9b2" />
          <stop offset="1" stopColor="#4e5d66" />
        </linearGradient>
        <linearGradient id="fr-tw-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff3b0" />
          <stop offset="0.45" stopColor="#e0a526" />
          <stop offset="1" stopColor="#7a4d00" />
        </linearGradient>
      </defs>
      {/* the blade: spine on the left, a curved edge sweeping to the tip */}
      <path d="M 15.5 117 C 11 86 10 50 27 3 C 26.5 24 25 48 25.6 117 Z" fill="url(#fr-tw-steel)" stroke="#33414a" strokeWidth="1.1" strokeLinejoin="round" />
      <path d="M 18 110 C 15.5 84 15 54 22.5 24" fill="none" stroke="rgba(38,50,56,0.55)" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M 19.3 110 C 16.9 84 16.4 54 23.8 24" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="0.7" strokeLinecap="round" />
      <path d="M 24.2 112 C 23.3 84 23.6 46 26.6 8" fill="none" stroke="#fff" strokeWidth="1" strokeLinecap="round" opacity="0.95" />
      {/* langets and the guard with curled ends */}
      <path d="M 16 117 L 20.5 105 L 25 117 Z" fill="url(#fr-tw-gold)" stroke="#5c3a00" strokeWidth="0.8" />
      <path d="M 2 121 Q 4 115 9 117 L 31 117 Q 36 115 38 121 Q 35 119 31 122 L 9 122 Q 5 119 2 121 Z" fill="url(#fr-tw-gold)" stroke="#5c3a00" strokeWidth="1" />
      {/* the knuckle bow from the guard round to the pommel */}
      <path d="M 35 121 C 41 130 39 146 28 151" fill="none" stroke="#5c3a00" strokeWidth="3.4" strokeLinecap="round" />
      <path d="M 35 121 C 41 130 39 146 28 151" fill="none" stroke="url(#fr-tw-gold)" strokeWidth="2.2" strokeLinecap="round" />
      {/* the grip, bulged in the middle, wrapped in the player's colour */}
      <path d="M 16.5 122 Q 14 134 16.5 146 L 25.5 146 Q 28 134 25.5 122 Z" fill={color} stroke="rgba(0,0,0,0.55)" strokeWidth="1.1" />
      <path d="M 16 127 l 10 3 M 15.6 133 l 10.8 3 M 16 139 l 10 3" stroke="rgba(0,0,0,0.3)" strokeWidth="1.4" />
      <path d="M 18 124 Q 16.3 134 18 144" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.2" />
      {/* the disc pommel with its dome and knob */}
      <ellipse cx="21" cy="149" rx="10.5" ry="3.4" fill="url(#fr-tw-gold)" stroke="#5c3a00" strokeWidth="1" />
      <ellipse cx="21" cy="152.5" rx="5" ry="3.2" fill="url(#fr-tw-gold)" stroke="#5c3a00" strokeWidth="0.9" />
      <circle cx="21" cy="157" r="2" fill="#e0a526" stroke="#5c3a00" strokeWidth="0.8" />
      <path d="M 13 148 Q 21 146 29 148" fill="none" stroke="#fff6c8" strokeWidth="0.8" />
    </svg>
  );
}
