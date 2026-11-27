import { DARTS_PER_TURN } from '../../types';

/** Darts' rules in short; shown in the lobby and as the How to play sheet */
export function DartsRules() {
  return (
    <ul className="ludo-rules">
      <li>2–4 players. Everyone starts at 301 (or 501, host's choice) and counts down to exactly 0.</li>
      <li>{`🎯 ${DARTS_PER_TURN} darts a turn. Press and hold on the board to aim; your hand shakes more the longer you hold. Let go to throw.`}</li>
      <li>The board scores like a real one: the number you hit, ×2 in the outer double ring, ×3 in the thin treble ring, 25 for the outer bull, 50 for the bull.</li>
      <li>💥 Bust: go below 0 and that turn's darts don't count; your turn ends.</li>
      <li>Land exactly on 0 to finish. Play goes on for 2nd and 3rd place.</li>
      <li>🔥 Three darts for 180 (three treble 20s) gets the big cheer.</li>
      <li>⏰ With the turn timer on, time up throws for you. Leaving mid-game counts as a loss.</li>
    </ul>
  );
}
