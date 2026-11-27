import { SPIKES_LIVES } from '../../types';

/** Spike Attack's rules in short; shown in the lobby and as the How to play sheet */
export function SpikesRules() {
  return (
    <ul className="ludo-rules">
      <li>2 to 4 players, all at once. The host picks a 5 × 5 or 6 × 6 arena and Normal or Fast.</li>
      <li>🕹️ Everyone starts in a corner. Move one box at a time with the arrow pad, a swipe or the keyboard arrows.</li>
      <li>🔺 A row or column glows red with a 3-2-1 countdown: that's where a spike will shoot right across.</li>
      <li>{`💔 Still on that line when it strikes? You lose a heart. Everyone has ${SPIKES_LIVES}; after a hit you're safe for a second.`}</li>
      <li>⏩ Warnings get shorter and come more often as the game goes on.</li>
      <li>👻 No hearts left and you're out. The last one standing wins; if the last players fall together they share.</li>
    </ul>
  );
}
