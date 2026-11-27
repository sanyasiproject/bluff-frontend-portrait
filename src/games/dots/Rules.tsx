/** Dots and Boxes' rules in short; shown in the lobby and as the How to play sheet */
export function DotsRules() {
  return (
    <ul className="ludo-rules">
      <li>2–4 players on a grid of dots (4×4, 5×5 or 6×6 boxes, host's choice). Turns go round the table.</li>
      <li>✏️ On your turn draw one line between two dots next to each other: tap near the line, or drag from dot to dot.</li>
      <li>⬛ Draw the fourth side of a box and it's yours: it fills with your colour and you go again.</li>
      <li>Careful: drawing the third side of a box hands it to the next player.</li>
      <li>When every box is closed, the most boxes wins (a tie shares the win).</li>
      <li>⏰ With the turn timer on, time up draws a line for you. Leaving mid-game counts as a loss.</li>
    </ul>
  );
}
