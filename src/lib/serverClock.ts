import { ServerClock } from '../games/fruit/clock';
import type { RoomView } from '../types';

/** the server's clock on this phone, learned from every view that carries the server's time */
export const serverClock = new ServerClock();

/** server time now (ms since epoch); this phone's clock until a view has told us better */
export const serverNow = () => serverClock.now();

const timeIn = (o: unknown): number | null => {
  const t = o && typeof o === 'object' ? (o as { now?: unknown }).now : undefined;
  return typeof t === 'number' && t > 0 ? t : null;
};

/** feeds the clock from a fresh view: the room's own time, or its game's */
export function noteServerTime(v: RoomView): void {
  const p = v.plugged as Record<string, unknown> | null | undefined;
  const t = timeIn(v) ?? (p ? timeIn(p[p.kind as string]) : null);
  if (t !== null) serverClock.atLeast(t);
}
