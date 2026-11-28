/** Carrom's rules in short; shown in the lobby and as the How to play sheet */
export function CarromRules() {
  return (
    <ul className="ludo-rules">
      <li>2–4 players. 19 coins in the centre: 9 white, 9 black and the red queen. Each player shoots from their own side.</li>
      <li>🎯 Slide the striker along your baseline (it can't sit on a coin), then pull back from it like a slingshot and let go. Pull further for more power.</li>
      <li>Classic: you own a colour (white breaks first). Pocket your own coin or the queen and you shoot again. 4 players play 2 v 2; partners sit opposite.</li>
      <li>👑 Queen: pocket one of your own coins first. After the queen, cover her by pocketing your own coin on the same or the next shot, or she goes back to the centre.</li>
      <li>❌ Fouls: the striker falls in a pocket, or touches nothing. One of your pocketed coins goes back and your turn ends. Pocketing your last coin before the queen is covered is a foul too.</li>
      <li>Pocket all your coins to win the board: 1 point for each of your rival's coins left, +3 if you covered the queen. Quick = 1 board; Full = first to 25 (or the leader after 8 boards).</li>
      <li>Freestyle: any coin counts. White 20, black 10, queen 50 (cover her). Pocket anything to shoot again; a foul is −10. Quick = 1 board, Full = 3 boards. Highest score wins.</li>
      <li>⏰ About 20 seconds a shot; time up plays a soft straight shot for you.</li>
    </ul>
  );
}
