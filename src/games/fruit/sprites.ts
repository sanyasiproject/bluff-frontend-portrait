import type { FruitKind } from '../../types';

// Our own glossy fruit and the bomb, drawn once per size onto small canvases and reused every frame

/** size of each kind against the base radius */
export const SIZE: Record<FruitKind, number> = { apple: 1, orange: 1, melon: 1.3, banana: 1.12, mango: 1.05, grapes: 1.05, bomb: 0.95 };
/** the inside, shown on the cut face of each half */
export const FLESH: Record<FruitKind, string> = { apple: '#fff3c4', orange: '#ffb74d', melon: '#ff4d5e', banana: '#fff8c8', mango: '#ffc93c', grapes: '#cde8a8', bomb: '#333' };
/** the rind round the cut face */
export const RIND: Record<FruitKind, string> = { apple: '#d50000', orange: '#ef6c00', melon: '#2e7d32', banana: '#f9a825', mango: '#f57c00', grapes: '#6a1b9a', bomb: '#111' };
/** juice drops and the splat on the floor */
export const JUICE: Record<FruitKind, string> = { apple: '#fff176', orange: '#ff9800', melon: '#ff1744', banana: '#fff59d', mango: '#ffb300', grapes: '#ab47bc', bomb: '#424242' };

const cache = new Map<string, HTMLCanvasElement>();

/** the sprite for a kind: square, `r` (css px) is the base radius; draw it centred */
export function sprite(kind: FruitKind, r: number, dpr: number): HTMLCanvasElement {
  const key = `${kind}:${Math.round(r * 10)}:${dpr}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const size = Math.ceil(r * SIZE[kind] * 3);
  const cv = document.createElement('canvas');
  cv.width = cv.height = Math.ceil(size * dpr);
  const c = cv.getContext('2d')!;
  c.scale(dpr, dpr);
  c.translate(size / 2, size / 2);
  if (kind !== 'bomb') halo(c, r * SIZE[kind], RIND[kind]);
  DRAW[kind](c, r * SIZE[kind]);
  cache.set(key, cv);
  return cv;
}

/** a soft glow in the fruit's own colour so it pops off the sky */
function halo(c: CanvasRenderingContext2D, r: number, color: string) {
  const g = c.createRadialGradient(0, 0, r * 0.8, 0, 0, r * 1.25);
  g.addColorStop(0, `${color}38`);
  g.addColorStop(1, `${color}00`);
  c.fillStyle = g;
  c.beginPath();
  c.arc(0, 0, r * 1.25, 0, Math.PI * 2);
  c.fill();
}

const radial = (c: CanvasRenderingContext2D, r: number, stops: [number, string][], fx = -0.35, fy = -0.4) => {
  const g = c.createRadialGradient(r * fx, r * fy, r * 0.05, 0, 0, r * 1.05);
  stops.forEach(([o, col]) => g.addColorStop(o, col));
  return g;
};

/** the white shine on the top left that makes it glossy */
function shine(c: CanvasRenderingContext2D, r: number, x = -0.38, y = -0.42, a = 0.55) {
  c.save();
  c.globalAlpha = a;
  c.fillStyle = '#fff';
  c.beginPath();
  c.ellipse(r * x, r * y, r * 0.26, r * 0.15, -0.6, 0, Math.PI * 2);
  c.fill();
  c.globalAlpha = a * 0.6;
  c.beginPath();
  c.arc(r * (x + 0.28), r * (y - 0.08), r * 0.06, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

function leaf(c: CanvasRenderingContext2D, x: number, y: number, len: number, rot: number) {
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  const g = c.createLinearGradient(0, -len * 0.3, 0, len * 0.3);
  g.addColorStop(0, '#9ccc65');
  g.addColorStop(1, '#33691e');
  c.fillStyle = g;
  c.beginPath();
  c.moveTo(0, 0);
  c.quadraticCurveTo(len * 0.5, -len * 0.42, len, 0);
  c.quadraticCurveTo(len * 0.5, len * 0.42, 0, 0);
  c.fill();
  c.strokeStyle = 'rgba(255,255,255,0.35)';
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(len * 0.1, 0);
  c.lineTo(len * 0.85, 0);
  c.stroke();
  c.restore();
}

function stem(c: CanvasRenderingContext2D, r: number, bend = 0.12) {
  c.strokeStyle = '#5d4037';
  c.lineWidth = Math.max(2, r * 0.1);
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(0, -r * 0.78);
  c.quadraticCurveTo(r * bend, -r * 1.05, r * bend * 1.6, -r * 1.2);
  c.stroke();
}

/** skin inside the current path: fine speckles and streaks, then a shadow on the lower right so it looks round */
function skin(c: CanvasRenderingContext2D, r: number, dots: string, streak: string | null) {
  c.save();
  c.clip();
  if (streak) {
    c.strokeStyle = streak;
    c.lineWidth = Math.max(1, r * 0.04);
    for (let k = -4; k <= 4; k++) {
      c.beginPath();
      c.moveTo(k * r * 0.2, -r);
      c.quadraticCurveTo(k * r * 0.28, 0, k * r * 0.18, r);
      c.stroke();
    }
  }
  c.fillStyle = dots;
  for (let i = 0; i < 60; i++) {
    const a = i * 2.399;
    const d = r * 0.95 * Math.sqrt((i + 0.5) / 60);
    c.beginPath();
    c.arc(Math.cos(a) * d, Math.sin(a) * d, Math.max(0.5, r * 0.018), 0, Math.PI * 2);
    c.fill();
  }
  const g = c.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.4, 0, 0, r * 1.15);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(20,0,0,0.38)');
  c.fillStyle = g;
  c.fillRect(-r * 1.3, -r * 1.3, r * 2.6, r * 2.6);
  c.restore();
}

const DRAW: Record<FruitKind, (c: CanvasRenderingContext2D, r: number) => void> = {
  apple(c, r) {
    // two lobes on top, a soft bottom
    c.fillStyle = radial(c, r, [[0, '#ff8a80'], [0.45, '#e53935'], [1, '#8e0000']]);
    c.beginPath();
    c.moveTo(0, -r * 0.7);
    c.bezierCurveTo(r * 0.55, -r * 1.12, r * 1.18, -r * 0.55, r * 0.98, r * 0.2);
    c.bezierCurveTo(r * 0.85, r * 0.85, r * 0.35, r * 1.02, 0, r * 0.88);
    c.bezierCurveTo(-r * 0.35, r * 1.02, -r * 0.85, r * 0.85, -r * 0.98, r * 0.2);
    c.bezierCurveTo(-r * 1.18, -r * 0.55, -r * 0.55, -r * 1.12, 0, -r * 0.7);
    c.fill();
    skin(c, r, 'rgba(255,240,170,0.45)', 'rgba(255,200,120,0.18)');
    stem(c, r);
    leaf(c, r * 0.05, -r * 0.92, r * 0.62, -0.5);
    shine(c, r);
  },
  orange(c, r) {
    c.fillStyle = radial(c, r, [[0, '#ffd180'], [0.5, '#ff9800'], [1, '#d84315']]);
    c.beginPath();
    c.arc(0, 0, r, 0, Math.PI * 2);
    c.fill();
    skin(c, r, 'rgba(255,225,160,0.3)', null);
    // peel dimples
    c.fillStyle = 'rgba(120,40,0,0.14)';
    for (let i = 0; i < 26; i++) {
      const a = i * 2.399;
      const d = r * 0.85 * Math.sqrt((i + 0.5) / 26);
      c.beginPath();
      c.arc(Math.cos(a) * d, Math.sin(a) * d, r * 0.035, 0, Math.PI * 2);
      c.fill();
    }
    c.fillStyle = '#558b2f';
    c.beginPath();
    c.arc(0, -r * 0.92, r * 0.1, 0, Math.PI * 2);
    c.fill();
    leaf(c, r * 0.06, -r * 0.94, r * 0.5, -0.25);
    shine(c, r);
  },
  melon(c, r) {
    c.save();
    c.beginPath();
    c.ellipse(0, 0, r * 1.05, r * 0.92, 0, 0, Math.PI * 2);
    c.fillStyle = radial(c, r, [[0, '#aed581'], [0.55, '#558b2f'], [1, '#1b5e20']]);
    c.fill();
    c.clip();
    // dark wavy stripes
    c.strokeStyle = 'rgba(15,60,20,0.75)';
    c.lineWidth = r * 0.16;
    for (let k = -3; k <= 3; k++) {
      c.beginPath();
      for (let y = -r; y <= r; y += r * 0.1) {
        const x = k * r * 0.34 + Math.sin(y / (r * 0.18)) * r * 0.05 + (k * y * y) / (r * 9);
        if (y === -r) c.moveTo(x, y);
        else c.lineTo(x, y);
      }
      c.stroke();
    }
    c.beginPath();
    c.ellipse(0, 0, r * 1.05, r * 0.92, 0, 0, Math.PI * 2);
    skin(c, r, 'rgba(220,255,200,0.25)', null);
    c.restore();
    c.fillStyle = '#6d4c2f';
    c.beginPath();
    c.ellipse(0, -r * 0.9, r * 0.07, r * 0.05, 0, 0, Math.PI * 2);
    c.fill();
    shine(c, r, -0.45, -0.45, 0.45);
  },
  banana(c, r) {
    c.save();
    c.rotate(-0.5);
    const g = c.createLinearGradient(0, -r, 0, r * 0.6);
    g.addColorStop(0, '#fff59d');
    g.addColorStop(0.55, '#fdd835');
    g.addColorStop(1, '#f9a825');
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(-r * 1.1, -r * 0.2);
    c.quadraticCurveTo(0, r * 1.2, r * 1.1, -r * 0.3);
    c.quadraticCurveTo(r * 0.95, -r * 0.05, r * 0.8, 0);
    c.quadraticCurveTo(0, r * 0.2, -r * 0.85, -r * 0.05);
    c.closePath();
    c.fill();
    c.strokeStyle = 'rgba(160,110,0,0.5)';
    c.lineWidth = 1.2;
    c.stroke();
    // brown tips
    c.fillStyle = '#5d4037';
    c.beginPath();
    c.arc(-r * 1.08, -r * 0.16, r * 0.09, 0, Math.PI * 2);
    c.arc(r * 1.08, -r * 0.28, r * 0.07, 0, Math.PI * 2);
    c.fill();
    c.globalAlpha = 0.5;
    c.strokeStyle = '#fff';
    c.lineWidth = r * 0.08;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(-r * 0.5, r * 0.25);
    c.quadraticCurveTo(0, r * 0.55, r * 0.45, r * 0.25);
    c.stroke();
    c.restore();
  },
  mango(c, r) {
    c.save();
    c.rotate(0.45);
    const g = c.createLinearGradient(-r, -r, r, r);
    g.addColorStop(0, '#fff176');
    g.addColorStop(0.45, '#ffa726');
    g.addColorStop(1, '#e53935');
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(0, -r * 0.95);
    c.bezierCurveTo(r * 0.95, -r * 0.9, r * 0.95, r * 0.6, r * 0.1, r * 0.95);
    c.bezierCurveTo(-r * 0.7, r * 1.1, -r * 1.0, r * 0.1, -r * 0.7, -r * 0.55);
    c.bezierCurveTo(-r * 0.5, -r * 0.85, -r * 0.25, -r * 0.95, 0, -r * 0.95);
    c.fill();
    skin(c, r, 'rgba(255,255,200,0.4)', null);
    c.restore();
    stem(c, r, 0.2);
    leaf(c, r * 0.15, -r * 0.82, r * 0.6, -0.9);
    shine(c, r, -0.35, -0.3);
  },
  grapes(c, r) {
    c.strokeStyle = '#5d4037';
    c.lineWidth = Math.max(2, r * 0.09);
    c.beginPath();
    c.moveTo(0, -r * 0.75);
    c.lineTo(r * 0.08, -r * 1.12);
    c.stroke();
    leaf(c, r * 0.05, -r * 0.95, r * 0.55, -0.35);
    const g = r * 0.3;
    const rows = [[-1.5, -0.5, 0.5, 1.5], [-1, 0, 1], [-1, 0, 1], [-0.5, 0.5], [0]];
    rows.forEach((row, j) =>
      row.forEach((k) => {
        const x = k * g * 1.05;
        const y = -r * 0.55 + j * g * 0.88;
        c.save();
        c.translate(x, y);
        c.fillStyle = (() => {
          const gr = c.createRadialGradient(-g * 0.35, -g * 0.4, g * 0.05, 0, 0, g);
          gr.addColorStop(0, '#e1bee7');
          gr.addColorStop(0.45, '#8e24aa');
          gr.addColorStop(1, '#38006b');
          return gr;
        })();
        c.beginPath();
        c.arc(0, 0, g * 0.55, 0, Math.PI * 2);
        c.fill();
        c.restore();
      }),
    );
  },
  bomb(c, r) {
    c.fillStyle = radial(c, r, [[0, '#757575'], [0.4, '#2b2b2b'], [1, '#050505']]);
    c.beginPath();
    c.arc(0, r * 0.08, r * 0.92, 0, Math.PI * 2);
    c.fill();
    // metal cap and fuse
    c.fillStyle = '#9e9e9e';
    c.save();
    c.rotate(0.5);
    c.fillRect(-r * 0.2, -r * 1.02, r * 0.4, r * 0.24);
    c.restore();
    c.strokeStyle = '#a1887f';
    c.lineWidth = Math.max(2, r * 0.09);
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(r * 0.45, -r * 0.82);
    c.quadraticCurveTo(r * 0.7, -r * 1.25, r * 1.0, -r * 1.1);
    c.stroke();
    // a warning cross
    c.strokeStyle = 'rgba(255,82,82,0.9)';
    c.lineWidth = r * 0.14;
    c.beginPath();
    c.moveTo(-r * 0.28, -r * 0.18);
    c.lineTo(r * 0.28, r * 0.38);
    c.moveTo(r * 0.28, -r * 0.18);
    c.lineTo(-r * 0.28, r * 0.38);
    c.stroke();
    shine(c, r, -0.4, -0.3, 0.4);
  },
};
