import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { cx } from '../../lib/cards';
import { SEA_SIZE, seaFleetError, seaRandomFleet, seaShipCells, type SeaShip } from '../../types';
import { Sea, ShipOnGrid } from './Sea';

// Placing my fleet: drag a ship (it snaps to the grid, red where it can't go), tap it to turn it, Shuffle, Ready

const same = (a: SeaShip[], b: SeaShip[]) => JSON.stringify(a) === JSON.stringify(b);

export function Placement({ start, ready, secsLeft, onPlace, onReady }: { start: SeaShip[]; ready: boolean; secsLeft: number; onPlace: (ships: SeaShip[]) => void; onReady: () => void }) {
  const [ships, setShips] = useState<SeaShip[]>(() => (start.length ? start : seaRandomFleet()));
  const [drag, setDrag] = useState<{ i: number; ship: SeaShip } | null>(null);
  const grab = useRef<{ i: number; dx: number; dy: number; moved: boolean; id: number; x0: number; y0: number } | null>(null);
  const grid = useRef<HTMLDivElement>(null);
  const sent = useRef<SeaShip[]>(start);
  const err = seaFleetError(ships);

  // a fresh legal layout goes to the server (the first one too, so time-up keeps it)
  useEffect(() => {
    if (ready || err || same(ships, sent.current)) return;
    sent.current = ships;
    onPlace(ships);
  }, [ships, ready, err]);

  const cellAt = (e: PointerEvent): [number, number] | null => {
    const g = grid.current?.querySelector('.sb-grid');
    if (!g) return null;
    const r = g.getBoundingClientRect();
    return [Math.floor(((e.clientX - r.left) / r.width) * SEA_SIZE), Math.floor(((e.clientY - r.top) / r.height) * SEA_SIZE)];
  };
  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if (ready) return;
    const c = cellAt(e);
    if (!c) return;
    const i = ships.findIndex((s) => seaShipCells(s).some(([x, y]) => x === c[0] && y === c[1]));
    if (i < 0) return;
    e.preventDefault();
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // a pointer that is already gone
    }
    grab.current = { i, dx: c[0] - ships[i].x, dy: c[1] - ships[i].y, moved: false, id: e.pointerId, x0: e.clientX, y0: e.clientY };
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const g = grab.current;
    if (!g || g.id !== e.pointerId) return;
    if (!g.moved && Math.hypot(e.clientX - g.x0, e.clientY - g.y0) < 8) return;
    g.moved = true;
    const c = cellAt(e);
    if (!c) return;
    const s = ships[g.i];
    const x = Math.max(0, Math.min(SEA_SIZE - (s.v ? 1 : s.len), c[0] - g.dx));
    const y = Math.max(0, Math.min(SEA_SIZE - (s.v ? s.len : 1), c[1] - g.dy));
    setDrag({ i: g.i, ship: { ...s, x, y } });
  };
  const onUp = (e: PointerEvent<HTMLDivElement>) => {
    const g = grab.current;
    if (!g || g.id !== e.pointerId) return;
    grab.current = null;
    if (!g.moved) {
      // a tap turns the ship, kept on the sea
      const s = ships[g.i];
      const v = !s.v;
      const turned = { ...s, v, x: Math.min(s.x, SEA_SIZE - (v ? 1 : s.len)), y: Math.min(s.y, SEA_SIZE - (v ? s.len : 1)) };
      setShips(ships.map((o, k) => (k === g.i ? turned : o)));
      return;
    }
    if (drag) setShips(ships.map((o, k) => (k === drag.i ? drag.ship : o)));
    setDrag(null);
  };

  const shown = drag ? ships.map((o, k) => (k === drag.i ? drag.ship : o)) : ships;
  // ships touching or overlapping another show red
  const bad = new Set(shown.map((_, k) => k).filter((k) => clashes(shown, k)));
  return (
    <div className="sb-place">
      <div ref={grid} className="sb-place-sea" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
        <Sea board={null} ships={[]} size="big">
          {shown.map((s, k) => (
            <ShipOnGrid key={k} ship={s} bad={bad.has(k)} style={drag?.i === k ? { zIndex: 5 } : undefined} />
          ))}
        </Sea>
      </div>
      <p className={cx('sb-place-note', err && 'bad')}>{ready ? '✅ Ready! Waiting for the others…' : err ? `⚠️ ${err}` : 'Drag a ship to move it · tap it to turn'}</p>
      <div className="sb-place-btns">
        <button className="btn ghost" disabled={ready} onClick={() => setShips(seaRandomFleet())}>
          🔀 Shuffle
        </button>
        <button className="btn primary" disabled={ready || !!err} onClick={onReady}>
          {`⚓ Ready · ${secsLeft}s`}
        </button>
      </div>
    </div>
  );
}

/** ship k touches or overlaps another */
function clashes(ships: SeaShip[], k: number): boolean {
  const mine = seaShipCells(ships[k]);
  return ships.some((o, j) => j !== k && seaShipCells(o).some(([x, y]) => mine.some(([a, b]) => Math.abs(a - x) <= 1 && Math.abs(b - y) <= 1)));
}
