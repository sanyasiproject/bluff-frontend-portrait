import { RMCS_OPEN_SEC, RMCS_POINTS } from '../../types';

/** Raja Mantri Chor Sipahi's rules in short; shown in the lobby and as the How to play sheet */
export function RmcsRules() {
  return (
    <ul className="ludo-rules">
      <li>Exactly 4 players: add 🤖 bots to fill the seats. The host picks 5 or 10 rounds.</li>
      <li>📜 Each round 4 secret chits are dealt: 👑 Raja, 🧐 Mantri, 🦹 Chor and 👮 Sipahi.</li>
      <li>{`Tap your chit to open it. It opens by itself after ${RMCS_OPEN_SEC} seconds. Only you see yours.`}</li>
      <li>👑 The Raja shows himself to everyone. Then the Mantri is shown too.</li>
      <li>🧐 The Mantri has 20 seconds to point at the Chor among the other two. Time up counts as wrong.</li>
      <li>{`Points: Raja ${RMCS_POINTS.raja}, Mantri ${RMCS_POINTS.mantri}, Sipahi ${RMCS_POINTS.sipahi}, Chor ${RMCS_POINTS.chor}.`}</li>
      <li>❌ A wrong guess swaps the Mantri's and the Chor's points for that round.</li>
      <li>🏆 After the last round the highest total wins; equal totals share the place.</li>
    </ul>
  );
}
