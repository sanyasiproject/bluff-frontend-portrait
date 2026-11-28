import type { Role } from './lib';

// Piece art is shared with the landscape app (pieceArt.tsx, copied byte-identical); these are chess-wide helpers
export { PieceSvg, type PieceSet } from './pieceArt';

/** material points, for the captured-material diff */
export const PIECE_VALUE: Record<Role, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
export const ROLE_NAME: Record<Role, string> = { p: 'Pawn', n: 'Knight', b: 'Bishop', r: 'Rook', q: 'Queen', k: 'King' };
