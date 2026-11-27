import { SNAKES_BITE_BACK } from '../../types';

/** Saanp Seedhi's rules in short; shown in the lobby and as the How to play sheet */
export function SnakesRules() {
  return (
    <ul className="ludo-rules">
      <li>2–4 players, one goti each. Turns go round the table.</li>
      <li>🎲 Tap the dice to roll. Your goti walks by itself, square by square, from 1 up to 100.</li>
      <li>🪜 Land on the foot of a ladder: climb to its top. 🐍 Land on a snake's head: slide down to its tail.</li>
      <li>Need a 6 (host's choice, on by default): a 6 puts your goti on square 1.</li>
      <li>Exact roll (default): land on 100 exactly; roll too much and you bounce back by the extra. With Any roll, reaching 100 or more finishes.</li>
      <li>🔁 Roll again (default): a 6 gives another roll; three 6s in a row lose the turn.</li>
      <li>{`😬 Bite (default): land on another player and they go back ${SNAKES_BITE_BACK} squares.`}</li>
      <li>The first to 100 wins; play goes on for 2nd and 3rd place.</li>
      <li>⏰ With the turn timer on, time up rolls for you. Leaving mid-game counts as a loss.</li>
    </ul>
  );
}
