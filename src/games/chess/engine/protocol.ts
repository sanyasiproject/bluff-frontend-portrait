import type { ChessVariant, GameReview, Move } from '../lib';

// Messages between the app and the chess engine Web Worker

/** a game to rebuild: start position and the UCI moves played */
export interface GameInput {
  variant: ChessVariant;
  initialFen: string;
  moves: string[];
}

export type EngineRequest =
  | ({ type: 'search'; id: number; multiPv: number; maxMs: number } & GameInput)
  | ({ type: 'review'; id: number; msPerMove: number } & GameInput);

/** one engine line, scores from White's side */
export interface EngineLine {
  first: Move;
  uci: string[];
  sans: string[];
  /** centipawns for White (null when it is a mate) */
  cp: number | null;
  /** moves to mate, + White mates, - Black mates */
  mate: number | null;
  depth: number;
}

/** the library's whole-game review (evals per position, judgements, accuracy, ACPL, counts, opening) */
export type Review = GameReview;

export type EngineReply =
  | { type: 'lines'; id: number; lines: EngineLine[]; done: boolean }
  | { type: 'progress'; id: number; done: number; total: number }
  | { type: 'review'; id: number; review: Review }
  | { type: 'error'; id: number; message: string };

/** an eval for the bar: white centipawns, mates pinned to the ends */
export const barCp = (l: Pick<EngineLine, 'cp' | 'mate'> | null | undefined): number => (!l ? 0 : l.mate !== null ? (l.mate > 0 ? 10000 : -10000) : (l.cp ?? 0));
/** "+1.4", "-0.3", "#3", "#-2" */
export function evalText(l: Pick<EngineLine, 'cp' | 'mate'> | null | undefined): string {
  if (!l) return '…';
  if (l.mate !== null) return `#${l.mate}`;
  const v = Math.round((l.cp ?? 0) / 10) / 10;
  return v === 0 ? '0.0' : `${v > 0 ? '+' : ''}${v.toFixed(1)}`;
}
