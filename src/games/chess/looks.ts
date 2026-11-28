import { useEffect, useState } from 'react';
import type { PieceSet } from './pieces';

// Chess looks and settings, per phone: board theme, piece set, confirm move

export type BoardTheme = 'wood' | 'meadow' | 'ocean' | 'night';
export const BOARD_THEMES: { id: BoardTheme; name: string; light: string; dark: string }[] = [
  { id: 'wood', name: 'Classic wood', light: '#ecd3a8', dark: '#b07d52' },
  { id: 'meadow', name: 'Meadow', light: '#eaeed2', dark: '#73985a' },
  { id: 'ocean', name: 'Ocean', light: '#e1e9ef', dark: '#7f99b0' },
  { id: 'night', name: 'Night', light: '#a4adbd', dark: '#55607a' },
];
export const PIECE_SETS: { id: PieceSet; name: string }[] = [
  { id: 'classic', name: 'Classic' },
  { id: 'modern', name: 'Modern' },
];

export interface ChessLooks {
  board: BoardTheme;
  pieces: PieceSet;
  confirm: boolean;
  coords: boolean;
}
const KEY = 'bluff.chessLooks';
const DEFAULT: ChessLooks = { board: 'wood', pieces: 'classic', confirm: false, coords: true };

function load(): ChessLooks {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<ChessLooks>;
    return {
      board: BOARD_THEMES.some((t) => t.id === v.board) ? v.board! : DEFAULT.board,
      pieces: PIECE_SETS.some((s) => s.id === v.pieces) ? v.pieces! : DEFAULT.pieces,
      confirm: v.confirm === true,
      coords: v.coords !== false,
    };
  } catch {
    return DEFAULT;
  }
}

let current = load();
const subs = new Set<(l: ChessLooks) => void>();

export function setChessLooks(patch: Partial<ChessLooks>): void {
  current = { ...current, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    /* private mode: keep for this visit */
  }
  subs.forEach((fn) => fn(current));
}

export function useChessLooks(): ChessLooks {
  const [looks, setLooks] = useState(current);
  useEffect(() => {
    subs.add(setLooks);
    return () => void subs.delete(setLooks);
  }, []);
  return looks;
}

export const themeOf = (id: BoardTheme) => BOARD_THEMES.find((t) => t.id === id) ?? BOARD_THEMES[0];
