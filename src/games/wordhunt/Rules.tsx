/** Word Grid Hunt's rules in short; shown in the lobby and as the How to play sheet */
export function WordHuntRules() {
  return (
    <ul className="ludo-rules">
      <li>2–4 players, everyone at once, 3 rounds. Each round everyone gets the same random letter grid (4 × 4 or 5 × 5).</li>
      <li>👆 Drag through touching letters, sideways or diagonally, to make an English word. Each tile once per word. "Qu" is one tile.</li>
      <li>📏 Words need 3+ letters on 4 × 4 and 4+ letters on 5 × 5. Each word is checked at once: green is good, a shake means not a word.</li>
      <li>🔢 Points: 3–4 letters 1, 5 letters 2, 6 letters 3, 7 letters 5, 8 or more 11.</li>
      <li>★ At the round's end everyone's words show. A word only you found scores double.</li>
      <li>⏰ 2 minutes a round (the host can pick 90 s or 3 min). Highest total after 3 rounds wins; ties share.</li>
    </ul>
  );
}
