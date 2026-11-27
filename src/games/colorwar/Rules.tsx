import { COLORWAR_BURST, COLORWAR_FIRST } from '../../types';

/** Colour Wars' rules in short; shown in the lobby and as the How to play sheet */
export function ColorWarRules() {
  return (
    <ul className="ludo-rules">
      <li>2–4 players on a 5×5 or 7×7 board (host's choice). Turns go round the table.</li>
      <li>{`🎨 Your first move: tap any empty cell. It becomes yours with ${COLORWAR_FIRST} dots.`}</li>
      <li>After that, tap one of your own cells to add a dot to it.</li>
      <li>{`💥 At ${COLORWAR_BURST} dots a cell bursts: it empties and throws one dot to each cell next to it (up, down, left, right). Those cells turn your colour, even if they were someone else's.`}</li>
      <li>Bursts can set off more bursts: big chains can flip half the board.</li>
      <li>💀 Lose all your cells (after your first move) and you're out. The last colour standing wins.</li>
      <li>⏰ With the turn timer on, time up taps for you. Leaving mid-game counts as a loss.</li>
    </ul>
  );
}
