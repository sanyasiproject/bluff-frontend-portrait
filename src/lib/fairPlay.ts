import type { RoomView } from '../types';

/** the Stop confirm's words: on staked and ranked tables Stop is the stopper's own forfeit and the rest play on */
export function stopWords(view: RoomView): { title: string; body: string; action: string } {
  return view.strict
    ? {
        title: 'Stop and forfeit?',
        body: 'On staked and ranked tables, stopping counts as your forfeit: you lose this game and the others play on.',
        action: 'Stop and forfeit',
      }
    : { title: 'Stop this game for everyone?', body: 'Nobody wins or loses and no coins move. Everyone goes back to the lobby.', action: 'Stop game' };
}
