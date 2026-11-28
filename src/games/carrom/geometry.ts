import { CARROM, strikerFits, nearestFit, toLocal as frameOf, type CarromCoin, type CarromSide } from './lib';

// Board geometry for the app, in board units (the surface is 1 × 1). "Screen" here means my frame: the board turned
// so my baseline is at the bottom. The aim line's first contact is app-side only; the physics never uses this

export interface Pt {
  x: number;
  y: number;
}

/** a board point on my screen (my side at the bottom) */
export function toScreen(side: CarromSide, x: number, y: number): Pt {
  const [u, f] = frameOf(side, x, y);
  return { x: u, y: 1 - f };
}

/** the striker's centre on my baseline for x in 0..1, on my screen */
export const strikerAt = (x: number): Pt => ({
  x: CARROM.baseFrom + Math.max(0, Math.min(1, x)) * (CARROM.baseTo - CARROM.baseFrom),
  y: 1 - CARROM.baseAt,
});

/** a striker at x would overlap a coin (board coins, my side) */
export const blockedAt = (coins: readonly CarromCoin[], side: CarromSide, x: number) => !strikerFits(coins, side, x);
/** the nearest free x to the wanted one (the striker hops off a coin) */
export const freeX = (coins: readonly CarromCoin[], side: CarromSide, want: number) => nearestFit(coins, side, want) ?? want;

/** keeps a direction pointing into the board (up on my screen), never flatter than ~6° */
export function clampDir(dx: number, dy: number): Pt {
  const n0 = Math.hypot(dx, dy) || 1;
  const x = dx / n0;
  const y = Math.min(dy / n0, -0.1);
  const n = Math.hypot(x, y) || 1;
  return { x: x / n, y: y / n };
}

export interface AimPath {
  /** where the striker first touches something */
  hit: Pt;
  /** the short line after the contact, from `from` */
  from: Pt;
  after: Pt;
  coin: boolean;
}

/** the striker's path to its first contact (a coin or a wall), then a short line after it; all on my screen */
export function aimPath(from: Pt, d: Pt, coins: Pt[]): AimPath {
  let best = Infinity;
  let coin: Pt | null = null;
  const R = CARROM.strikerR + CARROM.coinR;
  for (const c of coins) {
    const fx = c.x - from.x;
    const fy = c.y - from.y;
    const along = fx * d.x + fy * d.y;
    if (along <= 0) continue;
    const off = fx * fx + fy * fy - along * along;
    if (off > R * R) continue;
    const t = along - Math.sqrt(R * R - off);
    if (t < best) (best = t), (coin = c);
  }
  const lo = CARROM.strikerR;
  const hi = 1 - CARROM.strikerR;
  const tx = d.x > 0 ? (hi - from.x) / d.x : d.x < 0 ? (lo - from.x) / d.x : Infinity;
  const ty = d.y > 0 ? (hi - from.y) / d.y : d.y < 0 ? (lo - from.y) / d.y : Infinity;
  const tw = Math.min(tx, ty);
  if (coin && best < tw) {
    const hit = { x: from.x + d.x * best, y: from.y + d.y * best };
    const nx = coin.x - hit.x;
    const ny = coin.y - hit.y;
    const n = Math.hypot(nx, ny) || 1;
    return { hit, from: coin, after: { x: coin.x + (nx / n) * 0.12, y: coin.y + (ny / n) * 0.12 }, coin: true };
  }
  const hit = { x: from.x + d.x * tw, y: from.y + d.y * tw };
  const r = tx < ty ? { x: -d.x, y: d.y } : { x: d.x, y: -d.y };
  return { hit, from: hit, after: { x: hit.x + r.x * 0.1, y: hit.y + r.y * 0.1 }, coin: false };
}
