import type { ChessVariant } from './lib';
import type { ChessPerf } from './contract';

// Chess words for the lobby, the table and the profile: time controls, speeds, perfs and end reasons

export type ChessSpeed = 'bullet' | 'blitz' | 'rapid' | 'classical' | 'untimed';
export const CHESS_TIMES = ['1+0', '2+1', '3+0', '3+2', '5+0', '5+3', '10+0', '10+5', '15+10', '30+0', '30+20', 'none'] as const;
export type ChessTime = (typeof CHESS_TIMES)[number];

/** Lichess's estimate: minutes×60 + 40×increment seconds */
export function speedOf(time: string): ChessSpeed {
  if (time === 'none') return 'untimed';
  const [m, inc] = time.split('+').map(Number);
  const est = m * 60 + 40 * (inc || 0);
  return est < 180 ? 'bullet' : est < 480 ? 'blitz' : est < 1500 ? 'rapid' : 'classical';
}

export const SPEEDS: { id: ChessSpeed; name: string; icon: string }[] = [
  { id: 'bullet', name: 'Bullet', icon: '🚀' },
  { id: 'blitz', name: 'Blitz', icon: '🔥' },
  { id: 'rapid', name: 'Rapid', icon: '🐇' },
  { id: 'classical', name: 'Classical', icon: '🐢' },
  { id: 'untimed', name: 'Untimed', icon: '♾️' },
];

export const timeLabel = (t: string) => (t === 'none' ? 'No clock' : t);

export const PERFS: { id: ChessPerf; name: string; icon: string }[] = [
  { id: 'bullet', name: 'Bullet', icon: '🚀' },
  { id: 'blitz', name: 'Blitz', icon: '🔥' },
  { id: 'rapid', name: 'Rapid', icon: '🐇' },
  { id: 'classical', name: 'Classical', icon: '🐢' },
  { id: 'chess960', name: 'Chess960', icon: '🔀' },
  { id: 'crazyhouse', name: 'Crazyhouse', icon: '🏚️' },
  { id: 'kingOfTheHill', name: 'King of the Hill', icon: '⛰️' },
  { id: 'threeCheck', name: 'Three-check', icon: '3️⃣' },
  { id: 'antichess', name: 'Antichess', icon: '🙃' },
  { id: 'atomic', name: 'Atomic', icon: '💥' },
  { id: 'horde', name: 'Horde', icon: '🐜' },
  { id: 'racingKings', name: 'Racing Kings', icon: '🏁' },
];
export const perfInfo = (p: ChessPerf) => PERFS.find((x) => x.id === p) ?? PERFS[0];

export const VARIANT_ICON: Record<ChessVariant, string> = {
  standard: '♟️',
  chess960: '🔀',
  crazyhouse: '🏚️',
  kingOfTheHill: '⛰️',
  threeCheck: '3️⃣',
  antichess: '🙃',
  atomic: '💥',
  horde: '🐜',
  racingKings: '🏁',
};

/** why the game ended, in a few words */
export const END_REASON: Record<string, string> = {
  checkmate: 'Checkmate',
  stalemate: 'Stalemate',
  insufficient: 'Not enough pieces to mate',
  threefold: 'Threefold repetition',
  fiftyMove: '50-move rule',
  variantWin: 'Variant win',
  variantLoss: 'Variant loss',
  kingOfTheHill: 'King reached the hill',
  threeCheck: 'Third check',
  atomicExplosion: 'King blown up',
  hordeDestroyed: 'Horde wiped out',
  raceFinished: 'King reached the 8th rank',
  resign: 'Resigned',
  timeout: 'Time out',
  agreement: 'Draw agreed',
  abort: 'Game aborted',
};

/** the 9 variants' one-line pitch for the lobby (the library's `about` is the longer line) */
export const VARIANT_LINE: Record<ChessVariant, string> = {
  standard: 'Classic chess',
  chess960: 'Back rank shuffled, 960 starts',
  crazyhouse: 'Captured pieces drop back in',
  kingOfTheHill: 'King to the centre wins',
  threeCheck: 'Give check 3 times to win',
  antichess: 'Captures forced. Lose everything to win',
  atomic: 'Captures explode around them',
  horde: '36 pawns against a full army',
  racingKings: 'No checks. First king to the top wins',
};
