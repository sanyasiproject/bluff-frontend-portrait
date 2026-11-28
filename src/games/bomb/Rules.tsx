/** Bomb Pass's rules in short; shown in the lobby and as the How to play sheet */
export function BombRules() {
  return (
    <ul className="ludo-rules">
      <li>2–4 players, 2 or 3 ❤️ each. A lit bomb starts with someone; nobody knows how long its fuse is.</li>
      <li>💣 Holding it? Solve the quick task (a sum, the bigger number, the ink colour, the odd one out, count the dots, the arrow) with one tap and the bomb flies to the next player.</li>
      <li>Wrong answer: the bomb shakes and stays with you; a new task comes at once.</li>
      <li>💥 BOOM: whoever holds it when the fuse runs out loses a heart. The next round starts with the player after them.</li>
      <li>🔥 The bomb ticks faster and glows hotter near the end, but never says exactly when.</li>
      <li>No hearts left and you're out. The last player standing wins. Fast speed has shorter fuses.</li>
    </ul>
  );
}
