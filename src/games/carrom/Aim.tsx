import { useRef, useState, type PointerEvent, type RefObject } from 'react';
import { FRAME, SURFACE as DRAWN } from './Board';
import { aimPath, blockedAt, clampDir, freeX, strikerAt, type Pt } from './geometry';
import { CARROM, type CarromCoin, type CarromSide } from './lib';

// My shot: drag the striker along the baseline, then pull back from it like a slingshot and let go.
// Everything here is on my screen (my baseline at the bottom), in board units

/** a pull this long (board units) is full power */
const FULL_PULL = 0.27;
const MIN_POWER = 0.04;

export type AimMode = 'idle' | 'slide' | 'pull';
export interface AimState {
  mode: AimMode;
  x: number;
  /** on my screen: x right, y down (into the board is negative y) */
  dir: Pt | null;
  power: number;
  blocked: boolean;
}

/** board units under a pointer, from the wrap's box (the board fills it, frame included) */
function boardPoint(el: HTMLElement, e: PointerEvent): Pt {
  const r = el.getBoundingClientRect();
  const span = DRAWN + FRAME * 2;
  return { x: (((e.clientX - r.left) / r.width) * span - FRAME) / DRAWN, y: (((e.clientY - r.top) / r.height) * span - FRAME) / DRAWN };
}

export function useStrikerAim(
  wrap: RefObject<HTMLDivElement>,
  enabled: boolean,
  coins: readonly CarromCoin[],
  side: CarromSide,
  onShoot: (x: number, du: number, df: number, power: number) => void,
) {
  const [aim, setAim] = useState<AimState>({ mode: 'idle', x: 0.5, dir: null, power: 0, blocked: false });
  const drag = useRef<{ id: number; start: Pt; startX: number; mode: AimMode } | null>(null);
  const live = useRef(aim);
  live.current = aim;
  const idle = (x: number): AimState => ({ mode: 'idle', x, dir: null, power: 0, blocked: blockedAt(coins, side, x) });

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!enabled || !wrap.current) return;
    const p = boardPoint(wrap.current, e);
    const s = strikerAt(live.current.x);
    // grab only near the striker (a finger-sized circle)
    if (Math.hypot(p.x - s.x, p.y - s.y) > CARROM.strikerR * 3.4) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // a pointer that is already gone
    }
    drag.current = { id: e.pointerId, start: p, startX: live.current.x, mode: 'idle' };
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId || !wrap.current) return;
    const p = boardPoint(wrap.current, e);
    const mx = p.x - d.start.x;
    const my = p.y - d.start.y;
    if (d.mode === 'idle') {
      if (Math.hypot(mx, my) < 0.018) return;
      // down, away from the board = pull back; sideways = slide
      d.mode = my > Math.abs(mx) * 0.8 ? 'pull' : 'slide';
    }
    if (d.mode === 'slide') {
      const x = Math.max(0, Math.min(1, d.startX + mx / (CARROM.baseTo - CARROM.baseFrom)));
      setAim({ ...idle(x), mode: 'slide' });
      return;
    }
    const s = strikerAt(d.startX);
    const len = Math.hypot(s.x - p.x, s.y - p.y);
    setAim({ mode: 'pull', x: d.startX, dir: clampDir(s.x - p.x, s.y - p.y), power: Math.min(1, len / FULL_PULL), blocked: live.current.blocked });
  };
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    const a = live.current;
    // let go on a coin: hop to the nearest free spot
    if (a.mode === 'slide') return setAim(idle(freeX(coins, side, a.x)));
    if (a.mode === 'pull' && a.dir && a.power >= MIN_POWER && !a.blocked) {
      onShoot(a.x, a.dir.x, -a.dir.y, a.power);
      return setAim({ ...a, mode: 'idle', dir: null, power: 0 });
    }
    setAim(idle(a.x));
  };
  return {
    aim,
    /** puts the striker at x (or the nearest free spot) */
    place: (x: number) => setAim(idle(freeX(coins, side, x))),
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp },
  };
}

const C = (v: number) => v * DRAWN;

/** the aim overlay: the slide track, a dotted path to the first contact, a short line after it and the power ring */
export function AimLayer({ aim, coins, live }: { aim: AimState; coins: Pt[]; live: boolean }) {
  const s = strikerAt(aim.x);
  const path = aim.dir ? aimPath(s, aim.dir, coins) : null;
  const R = CARROM.strikerR;
  const ringR = C(R) + 1 + aim.power * 6;
  const hot = aim.power > 0.8 ? '#ff5252' : aim.power > 0.5 ? '#ffb300' : '#69f0ae';
  return (
    <svg className="cr-aim" viewBox={`${-FRAME} ${-FRAME} ${DRAWN + FRAME * 2} ${DRAWN + FRAME * 2}`} aria-hidden>
      {live && aim.mode !== 'pull' && (
        <g className="cr-slide-hint">
          <line x1={C(strikerAt(0).x)} y1={C(s.y)} x2={C(strikerAt(1).x)} y2={C(s.y)} stroke="#ffd54f" strokeWidth={0.6} strokeOpacity={0.6} strokeLinecap="round" />
          <path d={`M${C(s.x - R) - 2.6} ${C(s.y)} l1.5 -1.3 v2.6z M${C(s.x + R) + 2.6} ${C(s.y)} l-1.5 -1.3 v2.6z`} fill="#ffd54f" />
          <path className="cr-pull-hint" d={`M${C(s.x)} ${C(s.y + R) + 3.2} l-1.3 -1.4 h2.6z`} fill="#fff" opacity={0.85} transform={`rotate(180 ${C(s.x)} ${C(s.y + R) + 2.5})`} />
        </g>
      )}
      {path && (
        <g>
          <line x1={C(s.x)} y1={C(s.y)} x2={C(path.hit.x)} y2={C(path.hit.y)} stroke="#fff" strokeWidth={0.6} strokeDasharray="0.1 1.5" strokeLinecap="round" />
          <circle cx={C(path.hit.x)} cy={C(path.hit.y)} r={C(R)} fill="none" stroke="#fff" strokeOpacity={0.75} strokeWidth={0.25} strokeDasharray="0.6 0.6" />
          <line x1={C(path.from.x)} y1={C(path.from.y)} x2={C(path.after.x)} y2={C(path.after.y)} stroke={hot} strokeWidth={0.5} strokeOpacity={0.9} strokeLinecap="round" />
        </g>
      )}
      {aim.mode === 'pull' && (
        <g>
          <circle cx={C(s.x)} cy={C(s.y)} r={ringR} fill={hot} fillOpacity={0.12} stroke={hot} strokeWidth={0.7} strokeOpacity={0.9} />
          {aim.dir && <line x1={C(s.x)} y1={C(s.y)} x2={C(s.x - aim.dir.x * aim.power * FULL_PULL)} y2={C(s.y - aim.dir.y * aim.power * FULL_PULL)} stroke="#fff" strokeOpacity={0.5} strokeWidth={0.4} />}
        </g>
      )}
      {aim.blocked && <circle cx={C(s.x)} cy={C(s.y)} r={C(R) + 0.7} fill="none" stroke="#ff1744" strokeWidth={0.7} />}
    </svg>
  );
}
