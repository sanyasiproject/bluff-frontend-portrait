import { createElement as h, useRef } from 'react';
import type { FruitView } from '../../types';

// What this phone saw this game: fruit won, magnets struck and best reaction per player, for the podium recap

export interface DuelLog {
  won: Record<string, number>;
  magnets: Record<string, number>;
  best: Record<string, number>;
}

export function useDuelLog(fr: FruitView): DuelLog {
  const log = useRef<DuelLog & { seen: Set<number>; startsAt: number }>({ won: {}, magnets: {}, best: {}, seen: new Set(), startsAt: fr.startsAt });
  const l = log.current;
  // a rematch starts a fresh log
  if (l.startsAt !== fr.startsAt) Object.assign(l, { won: {}, magnets: {}, best: {}, seen: new Set(), startsAt: fr.startsAt });
  const r = fr.result;
  if (r && !l.seen.has(r.round)) {
    l.seen.add(r.round);
    if (r.winner && r.kind !== 'magnet') l.won[r.winner] = (l.won[r.winner] ?? 0) + 1;
    r.slowed.forEach((id) => (l.magnets[id] = (l.magnets[id] ?? 0) + 1));
    if (r.kind !== 'magnet')
      for (const [id, ms] of Object.entries(r.reactions)) if (ms != null) l.best[id] = Math.min(l.best[id] ?? Infinity, ms);
  }
  return l;
}

const top = (rec: Record<string, number>, low = false) =>
  Object.entries(rec).reduce<[string, number] | null>((b, e) => (!b || (low ? e[1] < b[1] : e[1] > b[1]) ? e : b), null);

/** the podium's short recap */
export function FruitRecap({ log, name }: { log: DuelLog; name: (id: string) => string }) {
  const fast = top(log.best, true);
  const most = top(log.won);
  const mag = top(log.magnets);
  const line = (label: string, who: string, tail: string) => h('li', { key: label }, `${label} `, h('b', { 'data-no-translate': true }, name(who)), ` ${tail}`);
  return h(
    'ul',
    null,
    fast && line('⚡ Fastest sword:', fast[0], `${(fast[1] / 1000).toFixed(2)}s`),
    most && line('🍉 Most fruit:', most[0], `×${most[1]}`),
    mag && line('🧲 Magnet grabs:', mag[0], `×${mag[1]}`),
  );
}
