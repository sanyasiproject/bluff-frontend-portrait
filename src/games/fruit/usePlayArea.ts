import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { fruitWave, type FruitSpawn, type FruitView } from '../../types';
import type { ServerClock } from './clock';
import { FruitStage, type Pt } from './stage';

// The live play area: the canvas at 60 fps, the swipe that cuts fruit, and the countdown / time left

/** cut ids are sent together when a swipe ends, or this long after its first cut */
const BATCH_MS = 200;

export interface CutHit {
  f: FruitSpawn;
  /** where it was cut, css px inside the play area */
  x: number;
  y: number;
}

export function usePlayArea({
  canvas,
  wrap,
  fr,
  clock,
  meId,
  canCut,
  blade,
  onCut,
  onSend,
  onOther,
}: {
  canvas: RefObject<HTMLCanvasElement>;
  wrap: RefObject<HTMLDivElement>;
  fr: FruitView;
  clock: ServerClock;
  meId: string;
  canCut: boolean;
  blade: string;
  onCut: (hit: CutHit) => void;
  onSend: (ids: number[], at: number) => void;
  onOther: (id: string, f: FruitSpawn) => string | null;
}) {
  const stage = useRef<FruitStage | null>(null);
  const live = useRef({ fr, canCut, onCut, onSend, onOther });
  live.current = { fr, canCut, onCut, onSend, onOther };
  const wave = useMemo(() => fruitWave(fr.seed, fr.seconds), [fr.seed, fr.seconds]);
  const byId = useMemo(() => new Map(wave.map((f) => [f.id, f])), [wave]);
  // whole seconds to the start (3-2-1) and to the end, only changing when the number does
  const [count, setCount] = useState<number | null>(null);
  const [secs, setSecs] = useState<number | null>(null);
  const seen = useRef<Record<string, Set<number>>>({});

  // the canvas and its size
  useEffect(() => {
    const cv = canvas.current;
    const box = wrap.current;
    if (!cv || !box) return;
    const st = new FruitStage(cv);
    stage.current = st;
    const fit = () => st.resize(box.clientWidth, box.clientHeight, Math.min(2, window.devicePixelRatio || 1));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(box);
    let raf = 0;
    let lastCount: number | null = null;
    let lastSecs: number | null = null;
    const loop = () => {
      const f = live.current.fr;
      const now = clock.now();
      st.draw(now - f.startsAt);
      const c = f.phase === 'over' ? null : now < f.startsAt ? Math.ceil((f.startsAt - now) / 1000) : now - f.startsAt < 800 ? 0 : null;
      if (c !== lastCount) setCount((lastCount = c));
      const s = f.phase === 'over' ? null : Math.max(0, Math.ceil((f.endsAt - Math.max(now, f.startsAt)) / 1000));
      if (s !== lastSecs) setSecs((lastSecs = s));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  useEffect(() => {
    if (stage.current) stage.current.wave = wave;
  }, [wave]);
  useEffect(() => {
    if (stage.current) stage.current.blade = blade;
  }, [blade]);

  // fruit I already cut stay gone (a phone that reconnects); others' cuts flash a ring in their colour
  useEffect(() => {
    const st = stage.current;
    if (!st) return;
    const ms = clock.now() - fr.startsAt;
    for (const [id, ids] of Object.entries(fr.sliced)) {
      const had = (seen.current[id] ??= new Set());
      for (const n of ids) {
        if (had.has(n)) continue;
        had.add(n);
        if (id === meId) st.gone.add(n);
        else {
          const f = byId.get(n);
          const color = f && live.current.onOther(id, f);
          if (f && color) st.ping(f, ms, color);
        }
      }
    }
  }, [fr.sliced, byId]);

  // the swipe
  useEffect(() => {
    const cv = canvas.current;
    if (!cv) return;
    let last: Pt | null = null;
    let batch: { ids: number[]; at: number } | null = null;
    let timer = 0;
    const flush = () => {
      window.clearTimeout(timer);
      timer = 0;
      if (batch?.ids.length) live.current.onSend(batch.ids, batch.at);
      batch = null;
    };
    const point = (e: PointerEvent): Pt => {
      const r = cv.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top, t: performance.now() };
    };
    const move = (p: Pt) => {
      const st = stage.current;
      if (!st) return;
      st.addTrail(p.x, p.y);
      const f = live.current.fr;
      if (last && live.current.canCut && f.phase === 'play') {
        const ms = clock.now() - f.startsAt;
        const angle = Math.atan2(p.y - last.y, p.x - last.x);
        for (const fruit of st.hits(last, p, ms)) {
          const w = st.where(fruit, ms);
          st.cut(fruit, ms, angle);
          live.current.onCut({ f: fruit, x: w?.x ?? p.x, y: w?.y ?? p.y });
          batch ??= { ids: [], at: Math.round(ms) };
          batch.ids.push(fruit.id);
          if (!timer) timer = window.setTimeout(flush, BATCH_MS);
        }
      }
      last = p;
    };
    const down = (e: PointerEvent) => {
      e.preventDefault();
      cv.setPointerCapture?.(e.pointerId);
      last = null;
      move(point(e));
    };
    const drag = (e: PointerEvent) => {
      if (!cv.hasPointerCapture?.(e.pointerId) && e.buttons === 0) return;
      const list = e.getCoalescedEvents?.() ?? [];
      for (const ev of list.length ? list : [e]) move(point(ev));
    };
    const up = () => {
      last = null;
      flush();
    };
    cv.addEventListener('pointerdown', down);
    cv.addEventListener('pointermove', drag);
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', up);
    return () => {
      flush();
      cv.removeEventListener('pointerdown', down);
      cv.removeEventListener('pointermove', drag);
      cv.removeEventListener('pointerup', up);
      cv.removeEventListener('pointercancel', up);
    };
  }, []);

  return { count, secs, wave };
}
