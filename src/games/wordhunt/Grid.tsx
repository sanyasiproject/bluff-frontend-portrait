import { useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { cx } from '../../lib/cards';
import { sfx } from '../../lib/sounds';

// Word Grid Hunt letter tiles: drag through touching tiles; a tile joins when the finger reaches its inner circle

/** the inner circle's radius, as a share of one tile's pitch (70% wide) */
const INNER = 0.35;

export const tileText = (s: string) => (s.toLowerCase() === 'qu' ? 'Qu' : s.toUpperCase());
export const pathWord = (grid: string[], path: number[]) => path.map((i) => grid[i] ?? '').join('').toLowerCase();

export interface GridFlash {
  key: number;
  path: number[];
  tone: 'good' | 'bad' | 'dup';
}

export function LetterGrid({ grid, size, live, hidden, flash, onPath, onWord }: {
  grid: string[];
  size: number;
  live: boolean;
  /** tiles face down (countdown) */
  hidden: boolean;
  flash: GridFlash | null;
  onPath: (path: number[]) => void;
  onWord: (path: number[]) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [path, setPath] = useState<number[]>([]);
  const ref = useRef<number[]>([]);
  const dragging = useRef(false);

  const update = (next: number[]) => {
    if (next.length > ref.current.length) {
      sfx.wordTile(next.length);
      navigator.vibrate?.(6);
    }
    ref.current = next;
    setPath(next);
    onPath(next);
  };
  /** the tile under a point: anywhere on it for the first, else only inside its inner circle */
  const tileAt = (e: PointerEvent, loose: boolean): number | null => {
    const r = box.current?.getBoundingClientRect();
    if (!r) return null;
    const pitch = r.width / size;
    const x = (e.clientX - r.left) / pitch;
    const y = (e.clientY - r.top) / pitch;
    const c = Math.floor(x);
    const rr = Math.floor(y);
    if (c < 0 || rr < 0 || c >= size || rr >= size) return null;
    if (!loose && Math.hypot(x - (c + 0.5), y - (rr + 0.5)) > INNER) return null;
    return rr * size + c;
  };
  const near = (a: number, b: number) => Math.abs((a % size) - (b % size)) <= 1 && Math.abs(Math.floor(a / size) - Math.floor(b / size)) <= 1;

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!live) return;
    const t = tileAt(e, true);
    if (t === null) return;
    try {
      box.current?.setPointerCapture(e.pointerId);
    } catch {
      // not a live pointer
    }
    dragging.current = true;
    update([t]);
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    const t = tileAt(e, false);
    const p = ref.current;
    if (t === null || t === p[p.length - 1]) return;
    // back onto the previous tile: undo the last one
    if (t === p[p.length - 2]) return update(p.slice(0, -1));
    if (p.includes(t) || !near(t, p[p.length - 1])) return;
    update([...p, t]);
  };
  const onUp = () => {
    if (!dragging.current) return;
    dragging.current = false;
    const p = ref.current;
    update([]);
    if (p.length > 0) onWord(p);
  };

  const flashSet = new Set(flash?.path ?? []);
  // the grid is secret until play starts: blank tiles
  const tiles = grid.length === size * size ? grid : Array<string>(size * size).fill('');
  const pts = path.map((i) => `${(i % size) + 0.5},${Math.floor(i / size) + 0.5}`).join(' ');
  return (
    <div
      ref={box}
      className={cx('wh-grid', `n${size}`, live && 'live', hidden && 'hidden')}
      style={{ '--n': size } as CSSProperties}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      {tiles.map((ch, i) => (
        <div key={i} className={cx('wh-tile', path.includes(i) && 'on', path[path.length - 1] === i && 'head', flashSet.has(i) && `flash-${flash?.tone}`)} data-k={flashSet.has(i) ? flash?.key : undefined}>
          <span className={cx('wh-letter', ch.length > 1 && 'qu')}>{hidden ? '' : tileText(ch)}</span>
        </div>
      ))}
      {path.length > 1 && (
        <svg className="wh-path" viewBox={`0 0 ${size} ${size}`} aria-hidden>
          <polyline className="glow" points={pts} />
          <polyline points={pts} />
        </svg>
      )}
    </div>
  );
}
