import { FRUIT_POINTS } from '../../types';

/** Fruit Slice Duel's rules in short; shown in the lobby and as the How to play sheet */
export function FruitRules() {
  return (
    <ul className="ludo-rules">
      <li>2 to 4 players, all at once. The host picks 45 or 60 seconds.</li>
      <li>🍉 After 3-2-1 the same fruit fly up on everyone's screen. Swipe across them to slice.</li>
      <li>{`Points: 🍎 🍊 🍌 ${FRUIT_POINTS.apple} · 🍇 🥭 ${FRUIT_POINTS.mango} · 🍉 ${FRUIT_POINTS.melon}.`}</li>
      <li>⚡ Combo: 3 or more fruit in one swipe gives +1 for each fruit over 2.</li>
      <li>{`💣 Slicing a bomb costs ${-FRUIT_POINTS.bomb} points and shakes your screen.`}</li>
      <li>🏆 When the time is up the highest score wins; equal scores share.</li>
    </ul>
  );
}
