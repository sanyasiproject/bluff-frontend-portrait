import { useEffect, useState } from 'react';
import { loadPref, savePref } from '../../lib/storage';

// Ludo board themes and goti styles: chosen per phone, unlocked by level, only this phone sees them

export interface LudoLook {
  id: string;
  name: string;
  emoji: string;
  /** level that unlocks it */
  level: number;
  /** swatch colours */
  colors: [string, string];
}

export const LUDO_BOARDS: LudoLook[] = [
  { id: 'classic', name: 'Classic', emoji: '🎲', level: 1, colors: ['#fdfaf2', '#e9e1cc'] },
  { id: 'wood', name: 'Sheesham', emoji: '🪵', level: 4, colors: ['#e2b47a', '#8a5a2b'] },
  { id: 'night', name: 'Raat', emoji: '🌙', level: 8, colors: ['#2b3250', '#10142a'] },
  { id: 'royal', name: 'Mahal', emoji: '🏰', level: 14, colors: ['#f6e7b4', '#b8860b'] },
  { id: 'neon', name: 'Neon', emoji: '💡', level: 20, colors: ['#1a1030', '#ff2bd6'] },
];

export const LUDO_GOTIS: LudoLook[] = [
  { id: 'glossy', name: 'Glossy', emoji: '♟️', level: 1, colors: ['#ff8a80', '#b71c1c'] },
  { id: 'marble', name: 'Marble', emoji: '🔮', level: 3, colors: ['#ffffff', '#9e9e9e'] },
  { id: 'gem', name: 'Gem', emoji: '💎', level: 7, colors: ['#80deea', '#00838f'] },
  { id: 'metal', name: 'Metal', emoji: '🥇', level: 12, colors: ['#fff59d', '#a67c00'] },
  { id: 'crown', name: 'Raja', emoji: '👑', level: 18, colors: ['#ffd54f', '#6a1b9a'] },
];

export const LUDO_DICE: LudoLook[] = [
  { id: 'ivory', name: 'Ivory', emoji: '🎲', level: 1, colors: ['#ffffff', '#e6e0d0'] },
  { id: 'ruby', name: 'Ruby', emoji: '❤️', level: 5, colors: ['#ff5c6c', '#a3001a'] },
  { id: 'jade', name: 'Jade', emoji: '🟢', level: 10, colors: ['#7ee0a8', '#0f7a45'] },
  { id: 'gold', name: 'Sona', emoji: '✨', level: 16, colors: ['#fff1a8', '#c79100'] },
];

export interface LudoLookChoice {
  board: string;
  goti: string;
  dice: string;
}

const BOARD_KEY = 'ludo.board';
const GOTI_KEY = 'ludo.goti';
const DICE_KEY = 'ludo.dice';
const listeners = new Set<() => void>();

/** a saved look while the level allows it, else the first one */
const allowed = (list: LudoLook[], id: string | null, level: number) => (list.find((l) => l.id === id && l.level <= level) ?? list[0]).id;

export function loadLudoLook(level: number): LudoLookChoice {
  return { board: allowed(LUDO_BOARDS, loadPref(BOARD_KEY), level), goti: allowed(LUDO_GOTIS, loadPref(GOTI_KEY), level), dice: allowed(LUDO_DICE, loadPref(DICE_KEY), level) };
}

export function saveLudoLook(change: Partial<LudoLookChoice>): void {
  if (change.board) savePref(BOARD_KEY, change.board);
  if (change.goti) savePref(GOTI_KEY, change.goti);
  if (change.dice) savePref(DICE_KEY, change.dice);
  listeners.forEach((fn) => fn());
}

/** this phone's Ludo look, kept in step when it is changed anywhere */
export function useLudoLook(level: number): LudoLookChoice {
  const [look, setLook] = useState(() => loadLudoLook(level));
  useEffect(() => {
    const fn = () => setLook(loadLudoLook(level));
    fn();
    listeners.add(fn);
    return () => void listeners.delete(fn);
  }, [level]);
  return look;
}
