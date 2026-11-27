import { LUDO_POINTS, LUDO_QUICK_HOME } from '../../types';

/** Ludo's rules in short; shown in the lobby and as the How to play sheet */
export function LudoRules() {
  return (
    <ul className="ludo-rules">
      <li>2 players play red and yellow (opposite), 3 add green, 4 use every colour. Turns go clockwise.</li>
      <li>🎲 Tap the dice to roll. A 6 opens a goti from your base onto your start square.</li>
      <li>Move one goti by the number rolled. Go round the board, then up your coloured lane: reaching home needs the exact number.</li>
      <li>💥 Land on an opponent's goti to knock it back to their base. Not on ⭐ safe squares or start squares, and never your partner's.</li>
      <li>🔁 Roll again after a 6, a kill or a goti reaching home. Three 6s in a row lose the turn.</li>
      <li>Nothing can move: the turn passes. Only one goti can move: it moves by itself.</li>
      <li>Classic: bring all 4 gotis home; play goes on for 2nd and 3rd place.</li>
      <li>{`Quick: gotis start open; the first to bring ${LUDO_QUICK_HOME} home wins.`}</li>
      <li>{`Timed: most points when time runs out. ${LUDO_POINTS.step} per square, ${LUDO_POINTS.kill} per kill, ${LUDO_POINTS.home} per goti home; a goti knocked off loses its squares.`}</li>
      <li>🔒 Master: your home lane opens only after your first kill.</li>
      <li>👥 2 vs 2: partners sit opposite. Once your gotis are home you roll and move for your partner; the team wins when both are done.</li>
      <li>⏰ With the turn timer on, time up rolls and moves for you. Leaving mid-game counts as a loss.</li>
    </ul>
  );
}
