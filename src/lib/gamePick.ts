import { GAME_CATALOG, type GameKind } from '../types';
import { loadPref, savePref } from './storage';

// The home grid: the game picked on a tile (for the next room I create) and the games last played on this phone

const LAST_KEY = 'lastPlayed';
const PENDING_KEY = 'bluff.pendingGame';
const known = (k: unknown): k is GameKind => GAME_CATALOG.some((g) => g.kind === k);

/** games played on this phone, most recent first */
export function loadLastPlayed(): GameKind[] {
  try {
    const list = JSON.parse(loadPref(LAST_KEY) ?? '[]') as unknown[];
    return Array.isArray(list) ? list.filter(known) : [];
  } catch {
    return [];
  }
}

export function noteLastPlayed(kind: GameKind): void {
  savePref(LAST_KEY, JSON.stringify([kind, ...loadLastPlayed().filter((k) => k !== kind)].slice(0, 6)));
}

/** a tile was tapped: the room I create next starts in this game */
export function setPendingGame(kind: GameKind | null): void {
  try {
    if (kind) sessionStorage.setItem(PENDING_KEY, kind);
    else sessionStorage.removeItem(PENDING_KEY);
  } catch {
    // ignore
  }
}

/** the picked game, once; null if none */
export function takePendingGame(): GameKind | null {
  try {
    const k = sessionStorage.getItem(PENDING_KEY);
    sessionStorage.removeItem(PENDING_KEY);
    return known(k) ? k : null;
  } catch {
    return null;
  }
}
