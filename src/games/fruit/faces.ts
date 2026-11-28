import type { FruitItemKind } from '../../types';

// The cut face inside each half: a round slice drawn once per size (rind ring, flesh, seeds / segments / core), shown squashed on the cut

type Fruit = Exclude<FruitItemKind, 'magnet'>;
const cache = new Map<string, HTMLCanvasElement>();

/** the face for a kind, `r` css px radius; the canvas is 2r square */
export function faceSprite(kind: Fruit, r: number, dpr: number): HTMLCanvasElement {
  const key = `${kind}:${Math.round(r)}:${dpr}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const cv = document.createElement('canvas');
  cv.width = cv.height = Math.max(2, Math.ceil(2 * r * dpr));
  const c = cv.getContext('2d')!;
  c.scale(dpr, dpr);
  c.translate(r, r);
  FACE[kind](c, r * 0.96);
  // a wet sheen across the cut
  const g = c.createLinearGradient(-r, -r, r, r);
  g.addColorStop(0, 'rgba(255,255,255,0.35)');
  g.addColorStop(0.4, 'rgba(255,255,255,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.12)');
  c.fillStyle = g;
  disc(c, r * 0.96);
  c.fill();
  cache.set(key, cv);
  return cv;
}

function disc(c: CanvasRenderingContext2D, r: number) {
  c.beginPath();
  c.arc(0, 0, r, 0, Math.PI * 2);
}

/** a ring of rind, then the flesh inside it */
function rind(c: CanvasRenderingContext2D, r: number, skin: string, pith: string, w: number, pw: number) {
  c.fillStyle = skin;
  disc(c, r);
  c.fill();
  c.fillStyle = pith;
  disc(c, r * (1 - w));
  c.fill();
  return r * (1 - w - pw);
}

function flesh(c: CanvasRenderingContext2D, r: number, inner: string, outer: string) {
  const g = c.createRadialGradient(0, 0, r * 0.1, 0, 0, r);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  c.fillStyle = g;
  disc(c, r);
  c.fill();
}

function seed(c: CanvasRenderingContext2D, x: number, y: number, s: number, rot: number, col: string) {
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.fillStyle = col;
  c.beginPath();
  c.ellipse(0, 0, s * 0.45, s, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = 'rgba(255,255,255,0.35)';
  c.beginPath();
  c.ellipse(-s * 0.12, -s * 0.3, s * 0.12, s * 0.3, 0, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

const FACE: Record<Fruit, (c: CanvasRenderingContext2D, r: number) => void> = {
  melon(c, r) {
    const f = rind(c, r, '#1b5e20', '#c5e1a5', 0.1, 0.06);
    flesh(c, f, '#ff6f7d', '#e0283c');
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + (i % 2) * 0.2;
      const d = f * (0.48 + (i % 3) * 0.1);
      seed(c, Math.cos(a) * d, Math.sin(a) * d, r * 0.07, a + Math.PI / 2, '#1a1110');
    }
  },
  orange(c, r) {
    const f = rind(c, r, '#ef6c00', '#fff3e0', 0.07, 0.07);
    flesh(c, f, '#ffcc80', '#fb8c00');
    // segment walls from the centre
    c.strokeStyle = 'rgba(255,243,224,0.9)';
    c.lineWidth = Math.max(1, r * 0.035);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(Math.cos(a) * f, Math.sin(a) * f);
      c.stroke();
    }
    // juicy vesicles
    c.fillStyle = 'rgba(255,255,255,0.22)';
    for (let i = 0; i < 40; i++) {
      const a = i * 2.399;
      const d = f * Math.sqrt((i + 0.5) / 40) * 0.92;
      c.beginPath();
      c.ellipse(Math.cos(a) * d, Math.sin(a) * d, r * 0.05, r * 0.025, a, 0, Math.PI * 2);
      c.fill();
    }
    c.fillStyle = '#fff3e0';
    disc(c, r * 0.08);
    c.fill();
  },
  apple(c, r) {
    const f = rind(c, r, '#c62828', '#fffde7', 0.05, 0);
    flesh(c, f, '#fffbe6', '#f6e7a8');
    // the core: a star of seed chambers
    c.strokeStyle = 'rgba(160,120,40,0.55)';
    c.lineWidth = Math.max(1, r * 0.03);
    c.beginPath();
    for (let i = 0; i <= 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(a) * r * 0.32;
      const y = Math.sin(a) * r * 0.32;
      if (i === 0) c.moveTo(x, y);
      else c.lineTo(x, y);
    }
    c.stroke();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      seed(c, Math.cos(a) * r * 0.2, Math.sin(a) * r * 0.2, r * 0.08, a + Math.PI / 2, '#4e2a12');
    }
  },
  mango(c, r) {
    const f = rind(c, r, '#e65100', '#ffe082', 0.05, 0.03);
    flesh(c, f, '#ffe082', '#ffb300');
    // the flat stone and its fibres
    c.fillStyle = '#fff8e1';
    c.beginPath();
    c.ellipse(0, 0, r * 0.22, r * 0.5, 0.3, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = 'rgba(230,140,0,0.4)';
    c.lineWidth = 1;
    for (let i = -3; i <= 3; i++) {
      c.beginPath();
      c.moveTo(i * r * 0.05, -r * 0.45);
      c.quadraticCurveTo(i * r * 0.09, 0, i * r * 0.05, r * 0.45);
      c.stroke();
    }
  },
  banana(c, r) {
    const f = rind(c, r, '#f9a825', '#fffde7', 0.08, 0);
    flesh(c, f, '#fffde7', '#fff3b0');
    c.fillStyle = 'rgba(120,80,20,0.55)';
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
      c.beginPath();
      c.arc(Math.cos(a) * r * 0.12, Math.sin(a) * r * 0.12, r * 0.04, 0, Math.PI * 2);
      c.fill();
    }
  },
  grapes(c, r) {
    const f = rind(c, r, '#6a1b9a', '#e6f2c8', 0.08, 0);
    flesh(c, f, '#f1f8e0', '#c5e1a5');
    seed(c, -r * 0.14, 0, r * 0.12, 0.3, '#6d4c2f');
    seed(c, r * 0.14, r * 0.04, r * 0.12, -0.3, '#6d4c2f');
  },
};
