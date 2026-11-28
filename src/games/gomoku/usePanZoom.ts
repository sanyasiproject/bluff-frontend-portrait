import { useRef, useState, type PointerEvent } from 'react';
import { reducedMotion } from '../../lib/motion';

// Pinch and double-tap zoom for a square board; one finger pans when zoomed; plain taps report where on the board they landed

const ZOOM = 2.2;
const MAX = 3;
const DOUBLE_MS = 300;

interface Opts {
  enabled: boolean;
  /** a tap at this fraction of the board's width and height */
  onTap: (fx: number, fy: number) => void;
}

export function usePanZoom({ enabled, onTap }: Opts) {
  const [view, setView] = useState({ z: 1, tx: 0, ty: 0 });
  const [moving, setMoving] = useState(false);
  const box = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const pts = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ x: number; y: number; z: number; tx: number; ty: number; dist: number; mx: number; my: number; moved: boolean; multi: boolean } | null>(null);
  const lastTap = useRef<{ at: number; x: number; y: number } | null>(null);
  const cur = useRef(view);
  cur.current = view;

  /** keeps the board covering its frame */
  const clamp = (z: number, tx: number, ty: number) => {
    const w = box.current?.clientWidth ?? 0;
    const h = box.current?.clientHeight ?? 0;
    const zz = Math.min(MAX, Math.max(1, z));
    return { z: zz, tx: Math.min(0, Math.max(w - w * zz, tx)), ty: Math.min(0, Math.max(h - h * zz, ty)) };
  };
  const local = (e: { clientX: number; clientY: number }) => {
    const r = box.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  /** zoom in round a point of the frame, or back out */
  const zoomAt = (x: number, y: number) => {
    const v = cur.current;
    if (v.z > 1.05) return setView({ z: 1, tx: 0, ty: 0 });
    const px = (x - v.tx) / v.z;
    const py = (y - v.ty) / v.z;
    setView(clamp(ZOOM, x - px * ZOOM, y - py * ZOOM));
  };
  const toggle = () => {
    const w = box.current?.clientWidth ?? 0;
    zoomAt(w / 2, w / 2);
  };

  const spread = () => {
    const [a, b] = [...pts.current.values()];
    return { dist: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
  };
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!box.current) return;
    try {
      box.current.setPointerCapture(e.pointerId);
    } catch {
      // not a live pointer
    }
    pts.current.set(e.pointerId, local(e));
    const v = cur.current;
    const p = local(e);
    if (pts.current.size === 2 && enabled) {
      const s = spread();
      gesture.current = { x: p.x, y: p.y, z: v.z, tx: v.tx, ty: v.ty, dist: s.dist, mx: s.mx, my: s.my, moved: true, multi: true };
      setMoving(true);
    } else if (pts.current.size === 1) {
      gesture.current = { x: p.x, y: p.y, z: v.z, tx: v.tx, ty: v.ty, dist: 0, mx: 0, my: 0, moved: false, multi: false };
    }
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g || !pts.current.has(e.pointerId)) return;
    pts.current.set(e.pointerId, local(e));
    if (g.multi && pts.current.size === 2) {
      const s = spread();
      const z = Math.min(MAX, Math.max(1, (g.z * s.dist) / Math.max(1, g.dist)));
      const px = (g.mx - g.tx) / g.z;
      const py = (g.my - g.ty) / g.z;
      setView(clamp(z, s.mx - px * z, s.my - py * z));
      return;
    }
    const p = local(e);
    if (!g.moved && Math.hypot(p.x - g.x, p.y - g.y) < 8) return;
    g.moved = true;
    if (g.z > 1.05) {
      setMoving(true);
      setView(clamp(g.z, g.tx + p.x - g.x, g.ty + p.y - g.y));
    }
  };
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    const had = pts.current.delete(e.pointerId);
    if (pts.current.size > 0) return;
    gesture.current = null;
    setMoving(false);
    if (!had || !g || g.moved || g.multi) return;
    const p = local(e);
    const t = lastTap.current;
    const now = performance.now();
    if (enabled && t && now - t.at < DOUBLE_MS && Math.hypot(p.x - t.x, p.y - t.y) < 30) {
      lastTap.current = null;
      return zoomAt(p.x, p.y);
    }
    lastTap.current = { at: now, x: p.x, y: p.y };
    const r = svgRef.current?.getBoundingClientRect();
    if (r) onTap((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
  };
  const onPointerCancel = (e: PointerEvent<HTMLDivElement>) => {
    pts.current.delete(e.pointerId);
    if (pts.current.size === 0) {
      gesture.current = null;
      setMoving(false);
    }
  };

  return {
    ...view,
    zoomed: view.z > 1.05,
    moving: moving || reducedMotion(),
    toggle,
    svgRef,
    bind: { ref: box, onPointerDown, onPointerMove, onPointerUp, onPointerCancel },
  };
}
