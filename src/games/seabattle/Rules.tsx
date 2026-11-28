/** Sea Battle's rules in short; shown in the lobby and as the How to play sheet */
export function SeaRules() {
  return (
    <ul className="ludo-rules">
      <li>2–4 players. Each has a 10 × 10 sea and 5 ships (5, 4, 3, 3 and 2 cells long).</li>
      <li>⚓ Place your ships in 60 seconds: drag them, tap to turn, or Shuffle. Ships can't touch, not even corner to corner. Tap Ready when done; anything left is placed for you.</li>
      <li>🎯 On your turn pick any rival still afloat and fire at a cell. A hit or a sink fires again; a miss ends your turn.</li>
      <li>Everyone sees every shot on every sea, but nobody sees ships that haven't been hit.</li>
      <li>⚡ With powers on, sinking a ship earns one (hold 2): 📡 Radar counts ship cells in a 3 × 3 area, 🎆 Salvo fires 3 shots at once, 🚀 Torpedo runs along a row from the left until it hits.</li>
      <li>All your ships sunk and you're out. The last fleet afloat wins. ⏰ About 20 seconds a shot; time up fires for you.</li>
    </ul>
  );
}
