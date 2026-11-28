/** Ultimate Tic-Tac-Toe's rules in short; shown in the lobby and as the How to play sheet */
export function UtttRules() {
  return (
    <ul className="ludo-rules">
      <li>2 players, ✕ and ◯. The big board is 3 × 3 small tic-tac-toe boards. ✕ moves first, anywhere.</li>
      <li>➡️ The cell you play sends your opponent to the matching small board: play the top-right cell and they must play in the top-right board.</li>
      <li>🆓 If that board is already won or full, they get a free move in any open board.</li>
      <li>✕ Three in a row in a small board wins it and stamps it with your mark. A full small board with no line counts for nobody.</li>
      <li>🏆 Win three small boards in a line on the big board. If every board is decided with no big line, it's a draw.</li>
      <li>👆 Hold a cell to see where it sends them, lift to play, slide off to cancel. ⏰ About 25 seconds a move.</li>
    </ul>
  );
}
