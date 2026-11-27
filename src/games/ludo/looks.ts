import { useEffect, useState } from 'react';
import { loadPref, savePref } from '../../lib/storage';
import {
  DEFAULT_LUDO_LOOK,
  LUDO_BOARD_LOOKS,
  LUDO_DICE_LOOKS,
  LUDO_GOTI_LOOKS,
  ludoLookOk,
  type LudoLookChoice,
  type LudoLookDef,
  type LudoLookKind,
  type RoomView,
} from '../../types';

// Ludo looks: the lists are shared with the server; my picks are saved per phone and sent to the room

export type { LudoLookChoice };

export interface LudoLook extends LudoLookDef {
  /** swatch colours */
  colors: [string, string];
}

const COLORS: Record<LudoLookKind, Record<string, [string, string]>> = {
  board: {
    classic: ['#fdfaf2', '#e9e1cc'],
    wood: ['#e2b47a', '#8a5a2b'],
    neon: ['#1a1030', '#ff2bd6'],
    night: ['#2b3250', '#10142a'],
    royal: ['#f6e7b4', '#b8860b'],
  },
  goti: {
    glossy: ['#ff8a80', '#b71c1c'],
    marble: ['#ffffff', '#9e9e9e'],
    gem: ['#80deea', '#00838f'],
    metal: ['#fff59d', '#a67c00'],
    crown: ['#ffd54f', '#6a1b9a'],
  },
  dice: {
    ivory: ['#ffffff', '#e6e0d0'],
    ruby: ['#ff5c6c', '#a3001a'],
    neon: ['#2a1450', '#ff2bd6'],
    gold: ['#fff1a8', '#c79100'],
    jade: ['#7ee0a8', '#0f7a45'],
  },
};

const withColors = (kind: LudoLookKind, list: readonly LudoLookDef[]): LudoLook[] =>
  list.map((l) => ({ ...l, colors: COLORS[kind][l.id] ?? ['#ffffff', '#999999'] }));

export const LUDO_BOARDS = withColors('board', LUDO_BOARD_LOOKS);
export const LUDO_GOTIS = withColors('goti', LUDO_GOTI_LOOKS);
export const LUDO_DICE = withColors('dice', LUDO_DICE_LOOKS);

const KEYS: Record<LudoLookKind, string> = { board: 'ludo.board', goti: 'ludo.goti', dice: 'ludo.dice' };
const listeners = new Set<() => void>();

/** my picks on this phone, each kept only while my level unlocks it */
export function loadLudoLook(level: number): LudoLookChoice {
  return {
    board: ludoLookOk('board', loadPref(KEYS.board), level),
    goti: ludoLookOk('goti', loadPref(KEYS.goti), level),
    dice: ludoLookOk('dice', loadPref(KEYS.dice), level),
  };
}

export function saveLudoLook(change: Partial<LudoLookChoice>): void {
  if (change.board) savePref(KEYS.board, change.board);
  if (change.goti) savePref(KEYS.goti, change.goti);
  if (change.dice) savePref(KEYS.dice, change.dice);
  listeners.forEach((fn) => fn());
}

/** called whenever my picks change anywhere */
export function onLudoLookChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}

/** this phone's Ludo look, kept in step when it is changed anywhere */
export function useLudoLook(level: number): LudoLookChoice {
  const [look, setLook] = useState(() => loadLudoLook(level));
  useEffect(() => {
    const fn = () => setLook(loadLudoLook(level));
    fn();
    return onLudoLookChange(fn);
  }, [level]);
  return look;
}

/** a player's look as the room shows it; older servers send none */
export const lookOf = (view: RoomView, id: string | null | undefined): LudoLookChoice =>
  view.players.find((p) => p.id === id)?.ludoLook ?? DEFAULT_LUDO_LOOK;

/** keeps the room told my picks: on entering, on reconnect, on level up and on every change */
export function useSendLudoLook(view: RoomView | null, connectionId: string | null, send: (look: LudoLookChoice) => void): void {
  const code = view?.code ?? null;
  const level = view?.players.find((p) => p.id === view.meId)?.level ?? 1;
  const seated = !!view?.players.some((p) => p.id === view.meId);
  useEffect(() => {
    if (!code || !seated) return;
    const fn = () => send(loadLudoLook(level));
    fn();
    return onLudoLookChange(fn);
  }, [code, connectionId, level, seated]);
}
