import { FRUIT_ITEM_POINTS, FRUIT_MAGNET_ROUNDS, FRUIT_SLOW_MS } from '../../types';

/** Fruit Slice Duel's rules in short; shown in the lobby and as the How to play sheet */
export function FruitRules() {
  return (
    <ul className="ludo-rules">
      <li>2 to 4 players, all at once. The host picks 15 or 25 items.</li>
      <li>⚔️ Everyone has a sword and one big Strike button. One item at a time pops up on the plate in the middle, at a moment nobody can guess.</li>
      <li>🍉 A fruit: the fastest strike wins it. Your time counts from when the fruit showed on your own screen, so a slow internet doesn't hurt.</li>
      <li>{`Points: 🍎 🍊 🍌 ${FRUIT_ITEM_POINTS.apple} · 🍇 🥭 ${FRUIT_ITEM_POINTS.mango} · 🍉 ${FRUIT_ITEM_POINTS.melon}.`}</li>
      <li>{`🧲 A magnet: don't strike it! Strike it and your sword is slow for the next ${FRUIT_MAGNET_ROUNDS} items (+${(FRUIT_SLOW_MS / 1000).toFixed(2)}s on your time). No points are lost.`}</li>
      <li>✋ Tapping before anything shows does nothing; one strike per item.</li>
      <li>🏆 After the last item the highest score wins; equal scores share.</li>
    </ul>
  );
}
