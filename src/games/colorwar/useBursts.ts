import { useEffect, useRef, useState } from 'react';
import { reducedMotion } from '../../lib/motion';
import { sfx } from '../../lib/sounds';
import { COLORWAR_FIRST, type ColorWarCell, type ColorWarView } from '../../types';

// Plays a tap and its chain wave by wave from last.waves: burst cells empty, blobs fly to the neighbours, captured cells flip

const WAVE_MS = 440;
const FLY_MS = 280;

export interface BurstFrame {
  cells: ColorWarCell[];
  /** cells bursting right now (their blobs are in the air) */
  flying: number[];
  /** cells that just changed colour */
  flips: number[];
  /** the cell that was tapped */
  tapped: number | null;
}

export const neighbours = (size: number, cell: number): number[] => {
  const r = Math.floor(cell / size);
  const c = cell % size;
  const out: number[] = [];
  if (r > 0) out.push(cell - size);
  if (r < size - 1) out.push(cell + size);
  if (c > 0) out.push(cell - 1);
  if (c < size - 1) out.push(cell + 1);
  return out;
};

export function useBursts(cv: ColorWarView): BurstFrame | null {
  const [frame, setFrame] = useState<BurstFrame | null>(null);
  const settled = useRef<ColorWarCell[]>(cv.cells);
  const seen = useRef(cv.last?.seq ?? null);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const last = cv.last;
    if (!last || last.seq === seen.current) {
      if (!frame) settled.current = cv.cells;
      return;
    }
    seen.current = last.seq;
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    const prev = settled.current;
    settled.current = cv.cells;
    const later = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));
    if (reducedMotion() || prev.length !== cv.cells.length) {
      sfx.cwTap();
      if (last.waves.length) sfx.cwBurst(0);
      setFrame(null);
      return;
    }
    // the tap: a first move places its dots, later ones add one
    const p = last.playerId;
    let cells = prev.map((c) => ({ ...c }));
    const was = cells[last.cell];
    cells[last.cell] = was.owner === null ? { owner: p, dots: COLORWAR_FIRST } : { owner: p, dots: was.dots + 1 };
    sfx.cwTap();
    setFrame({ cells, flying: [], flips: [], tapped: last.cell });
    const step = last.waves.length > 10 ? Math.max(180, (WAVE_MS * 10) / last.waves.length) : WAVE_MS;
    const fly = Math.min(FLY_MS, step * 0.65);
    last.waves.forEach((wave, k) => {
      const at = 260 + k * step;
      later(at, () => {
        cells = cells.map((c) => ({ ...c }));
        wave.forEach((b) => (cells[b] = { owner: null, dots: 0 }));
        sfx.cwBurst(k);
        setFrame({ cells, flying: wave, flips: [], tapped: null });
      });
      later(at + fly, () => {
        cells = cells.map((c) => ({ ...c }));
        const flips: number[] = [];
        for (const b of wave)
          for (const n of neighbours(cv.size, b)) {
            if (cells[n].owner !== null && cells[n].owner !== p) flips.push(n);
            cells[n] = { owner: p, dots: cells[n].dots + 1 };
          }
        setFrame({ cells, flying: [], flips, tapped: null });
      });
    });
    later(260 + last.waves.length * step + 120, () => setFrame(null));
  }, [cv.last?.seq, cv.cells]);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);
  return frame;
}
