import type { PluggedMove, PublicPlayer, RoomView } from '../types';
import type { Actions } from '../useBluff';

// Dev previews: fake players, a fake room view round a game's view, and actions that only take game moves

export const PREVIEW_NAMES = ['Ravi', 'Priya', 'Raju', 'Meera'];
export const PREVIEW_IDS = ['me', 'b1', 'b2', 'b3'];

export const previewPlayer = (id: string, name: string, bot: boolean): PublicPlayer =>
  ({ id, name, avatar: null, back: 'classic', table: 'classic', cardCount: 0, handValue: null, connected: true, place: null, registered: true, coins: 5000, username: null, level: 20, bot, ready: true, saza: null }) as PublicPlayer;

/** a room view round a game's own view; `over` with places fills the winners */
export function previewView(kind: string, game: unknown, ids: string[], opts: Record<string, unknown>, end: { places: Record<string, number> } | null, turnId: string | null, turnMsLeft: number | null = null): RoomView {
  const players = ids.map((id, i) => previewPlayer(id, PREVIEW_NAMES[i], id !== 'me'));
  if (end) players.forEach((p) => (p.place = end.places[p.id] ?? ids.length));
  const winner = end ? ids.filter((id) => end.places[id] === 1) : [];
  return {
    code: kind.toUpperCase().slice(0, 5),
    meId: 'me',
    hostId: 'me',
    phase: end ? 'over' : 'playing',
    players,
    watchers: [],
    leftPlayers: [],
    turnId,
    turnMsLeft,
    config: { game: kind, stake: 500, opts, turnTimer: true, turnSec: 20, voice: false, teams: false },
    watchRequests: [],
    winnerIds: winner,
    loserIds: end ? ids.filter((id) => !winner.includes(id)) : [],
    teams: null,
    slots: null,
    swapAsks: [],
    coinResults: null,
    stopped: false,
    awards: [],
    plugged: { kind, [kind]: game },
    crazy7: null,
    rang: null,
    hand: [],
    pileCount: 0,
    pileTopBy: [],
    passedIds: [],
    endedEarly: false,
  } as unknown as RoomView;
}

/** actions for a preview: game moves go to `onMove`, everything else does nothing */
export function previewActions(onMove: (m: { kind: string; move: unknown }) => void): Actions {
  return new Proxy({} as Actions, {
    get: (_, key) =>
      key === 'gameMove'
        ? async (m: PluggedMove) => {
            onMove(m as unknown as { kind: string; move: unknown });
            return true;
          }
        : async () => null,
  });
}
