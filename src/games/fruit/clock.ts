import { useRef } from 'react';

// The server's clock on this phone: server time ≈ Date.now() + offset. Real-time games (Fruit, Spikes) line up on it.

/** keeps the offset from view timestamps; every sample is a lower bound (the view left the server before it got here) */
export class ServerClock {
  private lows: { at: number; est: number }[] = [];
  private high: number | null = null;
  offset = 0;
  known = false;

  /** the server's time was at least `serverTime` when this view arrived */
  atLeast(serverTime: number): void {
    const at = Date.now();
    // recent samples only, so a drifting clock catches up
    this.lows = [...this.lows.filter((s) => at - s.at < 30_000), { at, est: serverTime - at }].slice(-24);
    this.fix();
  }

  /** the server's time was below `serverTime` when this view arrived (a countdown still running) */
  below(serverTime: number): void {
    const est = serverTime - Date.now() + 120;
    this.high = this.high === null ? est : Math.min(this.high, est);
    this.fix();
  }

  private fix(): void {
    // with no lower bound, trust this phone's clock unless it's clearly ahead
    const low = this.lows.length ? Math.max(...this.lows.map((s) => s.est)) : 0;
    this.offset = this.high !== null && low > this.high ? this.high : low;
    this.known = this.lows.length > 0;
  }

  now(): number {
    return Date.now() + this.offset;
  }
}

/** one clock per table */
export function useServerClock(): ServerClock {
  const ref = useRef<ServerClock | null>(null);
  ref.current ??= new ServerClock();
  return ref.current;
}
