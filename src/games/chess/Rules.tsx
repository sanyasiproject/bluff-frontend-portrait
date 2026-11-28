import { useEffect, useState } from 'react';
import { cx } from '../../lib/cards';
import { CHESS_VARIANTS, type ChessVariant } from './lib';
import { DIAGRAMS, VARIANT_RULES } from './diagrams';
import { VARIANT_ICON } from './catalog';
import { MiniBoard } from './MiniBoard';
import '../../styles/chess-board.css';
import '../../styles/chess-lobby.css';

/** chess rules in short, then every variant with a diagram; shown in the lobby and as the How to play sheet */
export function ChessRules({ variant = 'standard' }: { variant?: ChessVariant }) {
  const [shown, setShown] = useState<ChessVariant>(variant);
  useEffect(() => setShown(variant), [variant]);
  const v = CHESS_VARIANTS.find((x) => x.id === shown) ?? CHESS_VARIANTS[0];
  const d = DIAGRAMS[shown];
  return (
    <div className="ch-rules">
      <ul className="ludo-rules">
        <li>2 players, White moves first. Anyone else in the room watches, and watchers see the engine's best move.</li>
        <li>♟️ Tap a piece, then a square, or drag it. Dots show where it can go, rings show captures.</li>
        <li>⏱️ The clock adds its increment after each move (3 + 2: 3 minutes, plus 2 seconds a move). Run out and you lose, unless the other side cannot mate: then it's a draw.</li>
        <li>🤝 Offer a draw, resign, or abort before both sides have moved. Takebacks only in casual games.</li>
        <li>📈 Rated games (both logged in, a clock, no bots) move your rating, separately for each speed and variant. Everyone starts at 800; a "?" means the rating is still settling.</li>
        <li>🔍 After the game, tap Analyse: the engine marks each move and shows a better one.</li>
      </ul>
      <p className="label">Variants</p>
      <div className="ch-rule-tabs" role="tablist" aria-label="Variants">
        {CHESS_VARIANTS.map((x) => (
          <button key={x.id} role="tab" aria-selected={x.id === shown} className={cx(x.id === shown && 'on')} onClick={() => setShown(x.id)}>
            {VARIANT_ICON[x.id]} <span>{x.name}</span>
          </button>
        ))}
      </div>
      <div className="ch-rule-card" key={shown}>
        <MiniBoard fen={d.fen} marks={d.marks} arrows={d.arrows} label={`${v.name} diagram`} />
        <div>
          <b>
            {VARIANT_ICON[v.id]} {v.name}
          </b>
          <ul>
            {VARIANT_RULES[shown].map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
