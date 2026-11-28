import type { ChessVariant, Square } from './lib';
import type { Arrow } from './Arrows';

// A still diagram per variant: a position, marked squares and an arrow, for the lobby picker and rules

export interface Diagram {
  fen: string;
  marks?: Square[];
  arrows?: Arrow[];
}

const HILL: Square[] = [27, 28, 35, 36];
const TOP: Square[] = [56, 57, 58, 59, 60, 61, 62, 63];

export const DIAGRAMS: Record<ChessVariant, Diagram> = {
  standard: { fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', arrows: [{ from: 12, to: 28, tone: 'best' }] },
  chess960: { fen: 'bbqnnrkr/pppppppp/8/8/8/8/PPPPPPPP/BBQNNRKR w KQkq - 0 1', marks: [0, 1, 2, 3, 4, 5, 6, 7] },
  crazyhouse: { fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4', arrows: [{ from: 53, to: 53, tone: 'mine' }], marks: [53] },
  kingOfTheHill: { fen: '8/5k2/8/8/8/4K3/8/8 w - - 0 1', marks: HILL, arrows: [{ from: 20, to: 27, tone: 'best' }] },
  threeCheck: { fen: 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3', arrows: [{ from: 31, to: 4, tone: 'bad' }] },
  antichess: { fen: 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w - - 0 2', arrows: [{ from: 28, to: 35, tone: 'bad' }] },
  atomic: { fen: 'rnbqkb1r/pppppppp/5n2/4N3/8/8/PPPPPPPP/RNBQKB1R w KQkq - 0 1', marks: [52, 53, 54, 60, 61, 62, 44, 45, 46], arrows: [{ from: 36, to: 53, tone: 'bad' }] },
  horde: { fen: 'rnbqkbnr/pppppppp/8/1PP2PP1/PPPPPPPP/PPPPPPPP/PPPPPPPP/PPPPPPPP w kq - 0 1' },
  racingKings: { fen: '8/8/8/8/8/8/krbnNBRK/qrbnNBRQ w - - 0 1', marks: TOP, arrows: [{ from: 15, to: 23, tone: 'best' }] },
};

/** each variant's rules in short */
export const VARIANT_RULES: Record<ChessVariant, string[]> = {
  standard: ['Checkmate the king to win. Stalemate, threefold repetition, the 50-move rule and too few pieces to mate are draws.'],
  chess960: [
    'The back rank is shuffled into one of 960 starts (bishops on opposite colours, king between the rooks). Black mirrors White.',
    'Castling still puts the king and rook on the usual squares (g and f, or c and d). Tap the king, then its rook or its castling square.',
  ],
  crazyhouse: [
    'A piece you capture joins your pocket in your colour. On your turn, drop a pocket piece on any empty square instead of moving.',
    'Pawns cannot be dropped on the first or last rank. A promoted piece goes back to the pocket as a pawn.',
  ],
  kingOfTheHill: ['Normal chess, plus: bring your king to one of the 4 centre squares (d4, e4, d5, e5) to win at once.'],
  threeCheck: ['Normal chess, plus: give check 3 times to win. The counters by each player show checks given.'],
  antichess: [
    'If you can capture, you must. The king is an ordinary piece: no check, no castling, and pawns may promote to a king.',
    'Lose all your pieces, or be stalemated, and you win.',
  ],
  atomic: [
    'Every capture explodes: the capturing piece, the captured one and every piece except pawns on the 8 squares around are gone.',
    'Blow up the enemy king to win. Kings cannot capture, and kings standing side by side cannot check each other.',
  ],
  horde: ['White has 36 pawns and no king; Black has a normal army. White wins by checkmate; Black wins by capturing every white piece.', "White's pawns on the first rank may move two squares."],
  racingKings: [
    'Both sides start on the first two ranks. Giving check is not allowed at all.',
    'The first king to reach the 8th rank wins. If White gets there first and Black can too on the very next move, it is a draw.',
  ],
};
