import { FRUIT_GRAVITY, fruitAt, type FruitKind, type FruitSpawn } from '../../types';
import { FLESH, JUICE, RIND, SIZE, sprite } from './sprites';

// The fruit play area on a canvas: whole fruit from the shared wave, cut halves, juice, splats and the blade trail

interface Half { kind: FruitKind; x: number; y: number; vx: number; vy: number; rot: number; cut: number; side: 1 | -1; t0: number }
interface Drop { x: number; y: number; vx: number; vy: number; r: number; color: string; t0: number; life: number }
interface Splat { x: number; y: number; r: number; color: string; t0: number; seed: number }
interface Ring { x: number; y: number; color: string; t0: number; big?: boolean }
interface Slash { x: number; y: number; a: number; len: number; color: string; t0: number }
export interface Pt { x: number; y: number; t: number }

const TRAIL_MS = 170;
const SLASH_MS = 280;

export class FruitStage {
  W = 0;
  H = 0;
  dpr = 1;
  /** base fruit radius in css px */
  R = 28;
  wave: FruitSpawn[] = [];
  /** fruit I've cut, no longer drawn whole */
  gone = new Set<number>();
  blade = '#ffffff';
  private halves: Half[] = [];
  private drops: Drop[] = [];
  private splats: Splat[] = [];
  private rings: Ring[] = [];
  private slashes: Slash[] = [];
  private trail: Pt[] = [];
  private c: CanvasRenderingContext2D;

  constructor(private cv: HTMLCanvasElement) {
    this.c = cv.getContext('2d')!;
  }

  resize(w: number, h: number, dpr: number): void {
    this.W = w;
    this.H = h;
    this.dpr = dpr;
    // big fruit: about a ninth of the width, kept in check on short screens
    this.R = Math.max(22, Math.min(w / 9, h * 0.08));
    this.cv.width = Math.round(w * dpr);
    this.cv.height = Math.round(h * dpr);
  }

  private g(): number {
    return -FRUIT_GRAVITY * this.H;
  }

  /** a fruit's place on screen (css px), its spin, or null when off screen */
  where(f: FruitSpawn, ms: number): { x: number; y: number; rot: number } | null {
    const p = fruitAt(f, ms);
    if (!p) return null;
    const spin = (f.id % 2 ? 1 : -1) * (1.1 + (f.id % 5) * 0.35);
    return { x: p.x * this.W, y: this.H - p.y * this.H, rot: (spin * (ms - f.t)) / 1000 };
  }

  /** whole fruit on screen now */
  live(ms: number): { f: FruitSpawn; x: number; y: number; rot: number }[] {
    const out: { f: FruitSpawn; x: number; y: number; rot: number }[] = [];
    for (const f of this.wave) {
      if (f.t > ms) break;
      if (f.t < ms - 4000 || this.gone.has(f.id)) continue;
      const w = this.where(f, ms);
      if (w) out.push({ f, ...w });
    }
    return out;
  }

  /** fruit the blade crossed going from a to b */
  hits(a: Pt, b: Pt, ms: number): FruitSpawn[] {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy || 1;
    return this.live(ms)
      .filter(({ f, x, y }) => {
        // the server only counts fruit inside the play area (a small margin)
        if (y > this.H * 1.03 || x < -this.W * 0.03 || x > this.W * 1.03) return false;
        const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / len2));
        const ex = a.x + dx * t - x;
        const ey = a.y + dy * t - y;
        const reach = this.R * SIZE[f.kind] * 1.05 + 6;
        return ex * ex + ey * ey < reach * reach;
      })
      .map((h) => h.f);
  }

  addTrail(x: number, y: number): void {
    const t = performance.now();
    this.trail.push({ x, y, t });
    if (this.trail.length > 40) this.trail.shift();
  }

  /** cut a fruit: two halves fly apart, juice sprays, a splat stays on the floor */
  cut(f: FruitSpawn, ms: number, angle: number, color = JUICE[f.kind]): void {
    const w = this.where(f, ms);
    this.gone.add(f.id);
    if (!w) return;
    const t0 = performance.now();
    const s = (ms - f.t) / 1000;
    const vx = f.vx * this.W;
    const vy = -(f.vy + FRUIT_GRAVITY * s) * this.H;
    const px = -Math.sin(angle);
    const py = Math.cos(angle);
    if (f.kind === 'bomb') return this.blast(w.x, w.y, t0);
    for (const side of [1, -1] as const)
      this.halves.push({ kind: f.kind, x: w.x, y: w.y, vx: vx * 0.6 + side * px * 110, vy: vy * 0.5 + side * py * 110, rot: w.rot, cut: angle, side, t0 });
    for (let i = 0; i < 26; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 120 + Math.random() * 340;
      this.drops.push({ x: w.x, y: w.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80, r: 2 + Math.random() * 4.6, color, t0, life: 500 + Math.random() * 500 });
    }
    this.slashes.push({ x: w.x, y: w.y, a: angle, len: this.R * SIZE[f.kind] * 2.6, color: '#ffffff', t0 });
    this.splats.push({ x: w.x, y: w.y, r: this.R * SIZE[f.kind] * 1.25, color, t0, seed: f.id });
    if (this.splats.length > 14) this.splats.shift();
  }

  /** a bomb goes off: smoke, sparks and a shock ring */
  private blast(x: number, y: number, t0: number): void {
    for (let i = 0; i < 30; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 80 + Math.random() * 360;
      const spark = i % 3 === 0;
      this.drops.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: spark ? 2 + Math.random() * 2 : 4 + Math.random() * 6, color: spark ? '#ffca28' : '#424242', t0, life: 500 + Math.random() * 500 });
    }
    this.rings.push({ x, y, color: '#ff7043', t0, big: true });
  }

  /** someone else cut this fruit on their phone: a quick slash and sparks in their colour */
  ping(f: FruitSpawn, ms: number, color: string): void {
    const w = this.where(f, ms);
    if (!w) return;
    const t0 = performance.now();
    this.slashes.push({ x: w.x, y: w.y, a: (f.id * 1.3) % Math.PI, len: this.R * 2.2, color, t0 });
    for (let i = 0; i < 6; i++) {
      const a = Math.random() * Math.PI * 2;
      this.drops.push({ x: w.x, y: w.y, vx: Math.cos(a) * 160, vy: Math.sin(a) * 160, r: 2.2, color, t0, life: 320 });
    }
  }

  draw(ms: number): void {
    const { c, W, H, R } = this;
    const now = performance.now();
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.clearRect(0, 0, W, H);

    // splats on the floor, fading out
    this.splats = this.splats.filter((s) => now - s.t0 < 2600);
    for (const s of this.splats) {
      const age = now - s.t0;
      c.globalAlpha = 0.6 * (age < 1400 ? 1 : 1 - (age - 1400) / 1200);
      c.fillStyle = s.color;
      c.beginPath();
      c.arc(s.x, s.y, s.r * 0.75, 0, Math.PI * 2);
      for (let i = 0; i < 7; i++) {
        const a = s.seed * 1.7 + i * 0.9;
        const d = s.r * (0.7 + ((s.seed * (i + 3)) % 7) / 12);
        c.moveTo(s.x + Math.cos(a) * d, s.y + Math.sin(a) * d);
        c.arc(s.x + Math.cos(a) * d, s.y + Math.sin(a) * d, s.r * (0.12 + (i % 3) * 0.07), 0, Math.PI * 2);
      }
      c.fill();
    }
    c.globalAlpha = 1;

    // whole fruit
    for (const { f, x, y, rot } of this.live(ms)) {
      const img = sprite(f.kind, R, this.dpr);
      const sz = img.width / this.dpr;
      if (f.kind === 'bomb') {
        // a red warning glow and a fizzing fuse
        const pulse = 0.55 + 0.45 * Math.sin(now / 90);
        const gl = c.createRadialGradient(x, y, R * 0.4, x, y, R * 1.6);
        gl.addColorStop(0, `rgba(255,40,40,${0.45 * pulse})`);
        gl.addColorStop(1, 'rgba(255,40,40,0)');
        c.fillStyle = gl;
        c.beginPath();
        c.arc(x, y, R * 1.6, 0, Math.PI * 2);
        c.fill();
      }
      c.save();
      c.translate(x, y);
      c.rotate(rot);
      c.drawImage(img, -sz / 2, -sz / 2, sz, sz);
      if (f.kind === 'bomb') {
        const r = R * SIZE.bomb;
        for (let k = 0; k < 4; k++) {
          c.fillStyle = k === 0 ? '#fffde7' : Math.random() < 0.5 ? '#ffeb3b' : '#ff6d00';
          c.beginPath();
          c.arc(r * 1.0 + (Math.random() - 0.5) * r * 0.5 * k, -r * 1.1 - Math.random() * r * 0.35 * k, k === 0 ? 4 + Math.random() * 3 : 1.5 + Math.random() * 2, 0, Math.PI * 2);
          c.fill();
        }
      }
      c.restore();
    }

    // cut halves, the flesh showing on the cut face
    const g = this.g();
    this.halves = this.halves.filter((h) => now - h.t0 < 1600);
    for (const h of this.halves) {
      const t = (now - h.t0) / 1000;
      const x = h.x + h.vx * t;
      const y = h.y + h.vy * t + 0.5 * g * t * t;
      if (y > H + R * 2) continue;
      const img = sprite(h.kind, R, this.dpr);
      const sz = img.width / this.dpr;
      const r = R * SIZE[h.kind];
      c.save();
      c.translate(x, y);
      c.rotate(h.cut + h.side * t * 3.2);
      c.beginPath();
      c.rect(-sz, h.side > 0 ? 0 : -sz, sz * 2, sz);
      c.clip();
      c.save();
      c.rotate(h.rot - h.cut);
      c.drawImage(img, -sz / 2, -sz / 2, sz, sz);
      c.restore();
      c.fillStyle = RIND[h.kind];
      c.beginPath();
      c.ellipse(0, 0, r * 0.95, r * 0.3, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = FLESH[h.kind];
      c.beginPath();
      c.ellipse(0, 0, r * 0.82, r * 0.22, 0, 0, Math.PI * 2);
      c.fill();
      if (h.kind === 'melon') {
        c.fillStyle = '#212121';
        for (let i = -2; i <= 2; i++) c.fillRect(i * r * 0.25 - 1, h.side * r * 0.08 - 1.5, 2.5, 3);
      }
      c.restore();
    }

    // juice drops and sparks
    this.drops = this.drops.filter((d) => now - d.t0 < d.life);
    for (const d of this.drops) {
      const t = (now - d.t0) / 1000;
      c.globalAlpha = 1 - (now - d.t0) / d.life;
      c.fillStyle = d.color;
      c.beginPath();
      c.arc(d.x + d.vx * t, d.y + d.vy * t + 0.35 * g * t * t, d.r, 0, Math.PI * 2);
      c.fill();
    }

    // slashes: a bright streak across each cut, tapering as it fades
    this.slashes = this.slashes.filter((s) => now - s.t0 < SLASH_MS);
    c.lineCap = 'round';
    for (const s of this.slashes) {
      const k = (now - s.t0) / SLASH_MS;
      const half = (s.len / 2) * (0.6 + k * 0.6);
      const dx = Math.cos(s.a) * half;
      const dy = Math.sin(s.a) * half;
      c.globalAlpha = 1 - k;
      c.strokeStyle = s.color;
      c.lineWidth = 7 * (1 - k) + 1;
      c.beginPath();
      c.moveTo(s.x - dx, s.y - dy);
      c.lineTo(s.x + dx, s.y + dy);
      c.stroke();
    }
    c.globalAlpha = 1;

    // rings: a bomb's shock wave
    this.rings = this.rings.filter((r) => now - r.t0 < (r.big ? 500 : 420));
    for (const r of this.rings) {
      const k = (now - r.t0) / (r.big ? 500 : 420);
      c.globalAlpha = 1 - k;
      c.strokeStyle = r.color;
      c.lineWidth = r.big ? 8 * (1 - k) + 1 : 3;
      c.beginPath();
      c.arc(r.x, r.y, R * (r.big ? 0.6 + k * 4 : 0.7 + k * 0.7), 0, Math.PI * 2);
      c.stroke();
    }
    c.globalAlpha = 1;

    // the blade: a glowing streak that thins out at the tail
    this.trail = this.trail.filter((p) => now - p.t < TRAIL_MS);
    const n = this.trail.length;
    if (n > 1) {
      c.lineCap = 'round';
      for (const [width, color, alpha] of [[30, this.blade, 0.22], [16, this.blade, 0.75], [6, '#ffffff', 1]] as const) {
        for (let i = 1; i < n; i++) {
          const a = this.trail[i - 1];
          const b = this.trail[i];
          const k = 1 - (now - b.t) / TRAIL_MS;
          c.globalAlpha = alpha * k;
          c.strokeStyle = color;
          c.lineWidth = width * (0.25 + 0.75 * (i / n));
          c.beginPath();
          c.moveTo(a.x, a.y);
          c.lineTo(b.x, b.y);
          c.stroke();
        }
      }
      c.globalAlpha = 1;
    }
  }
}
