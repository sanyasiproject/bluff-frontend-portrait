import { useEffect } from 'react';
import { isPlugged, type GameKind, type LifetimeStats, type PluggedKind } from '../types';
import { loadLastPlayed } from '../lib/gamePick';
import { loadTable } from './registry';

// Downloads a game's table chunk ahead of time (lobby, home idle), so "Setting up the board…" is gone when the game starts

const started = new Set<PluggedKind>();

/** starts downloading this game's table now; repeats and errors are ignored */
export function prefetchGame(kind: GameKind | null | undefined): void {
  if (!kind || !isPlugged(kind) || started.has(kind)) return;
  started.add(kind);
  loadTable(kind).catch(() => started.delete(kind));
}

/** the registry games played most on this account, most first */
function mostPlayed(stats: LifetimeStats | null | undefined): PluggedKind[] {
  const per = stats?.perGame ?? {};
  return (Object.keys(per) as GameKind[])
    .filter(isPlugged)
    .filter((k) => (per[k]?.played ?? 0) > 0)
    .sort((a, b) => (per[b]?.played ?? 0) - (per[a]?.played ?? 0));
}

/** home screen: once the phone is idle, fetch the last-played and most-played tables (a few at most) */
export function useIdlePrefetch(active: boolean, stats: LifetimeStats | null | undefined): void {
  useEffect(() => {
    if (!active) return;
    const kinds = [...new Set([...loadLastPlayed().filter(isPlugged).slice(0, 2), ...mostPlayed(stats).slice(0, 2)])];
    if (!kinds.length) return;
    const run = () => kinds.forEach(prefetchGame);
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(run, { timeout: 4000 });
      return () => w.cancelIdleCallback?.(id);
    }
    const t = window.setTimeout(run, 2000);
    return () => window.clearTimeout(t);
  }, [active, stats]);
}
