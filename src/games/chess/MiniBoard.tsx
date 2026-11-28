import type { CSSProperties } from 'react';
import { cx } from '../../lib/cards';
import type { Color, Role, Square } from './lib';
import { PieceSvg } from './pieces';
import { Arrows, type Arrow } from './Arrows';
import { screenXY } from './boardKeys';
import { themeOf, useChessLooks } from './looks';

// A small still board drawn from a FEN, for the variant picker, rules sheets and game lists

/** pieces from a FEN's first field (pockets in [..] ignored) */
export function fenPieces(fen: string): { sq: Square; color: Color; role: Role }[] {
  const rows = fen.split(' ')[0].split('[')[0].split('/');
  const out: { sq: Square; color: Color; role: Role }[] = [];
  rows.slice(0, 8).forEach((row, i) => {
    let f = 0;
    for (const ch of row) {
      if (/\d/.test(ch)) f += Number(ch);
      else if (/[pnbrqk]/i.test(ch)) {
        out.push({ sq: (7 - i) * 8 + f, color: ch === ch.toUpperCase() ? 'w' : 'b', role: ch.toLowerCase() as Role });
        f++;
      }
    }
  });
  return out;
}

export function MiniBoard({ fen, orient = 'w', marks, arrows, className, label }: { fen: string; orient?: Color; marks?: Square[]; arrows?: Arrow[]; className?: string; label?: string }) {
  const looks = useChessLooks();
  const theme = themeOf(looks.board);
  const at = (s: Square): CSSProperties => {
    const [x, y] = screenXY(s, orient);
    return { transform: `translate(${x * 100}%, ${y * 100}%)` };
  };
  return (
    <div
      className={cx('cb-board cb-mini', `cb-${looks.board}`, className)}
      style={{ '--cb-light': theme.light, '--cb-dark': theme.dark } as CSSProperties}
      role="img"
      aria-label={label ?? 'Chess diagram'}
    >
      {marks?.map((s) => <div key={`m${s}`} className="cb-mark cb-hint" style={at(s)} />)}
      {fenPieces(fen).map((p) => (
        <div key={p.sq} className="cb-piece" style={at(p.sq)}>
          <PieceSvg color={p.color} role={p.role} set={looks.pieces} />
        </div>
      ))}
      {arrows && <Arrows arrows={arrows} orient={orient} />}
    </div>
  );
}
