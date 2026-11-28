/** Five in a Row's rules in short; shown in the lobby and as the How to play sheet */
export function GomokuRules() {
  return (
    <ul className="ludo-rules">
      <li>2–4 players. Two play on a 15 × 15 board; three or four play on 19 × 19. Everyone has their own stone colour.</li>
      <li>⚫ Take turns placing one stone on any empty point. The very first stone goes on the centre point.</li>
      <li>🏆 Make a line of 5 or more of your stones, in a row, a column or a diagonal, and you win at once.</li>
      <li>🛡️ Watch the others: block an open three or a four before it becomes five.</li>
      <li>With 3 or 4 players the first five wins; everyone else is placed by their longest line. A full board is a draw.</li>
      <li>✌️ Tap a point to see your stone, tap again (or Place) to put it down. Pinch or double-tap to zoom. ⏰ About 30 seconds a turn; time up plays next to your best line.</li>
    </ul>
  );
}
