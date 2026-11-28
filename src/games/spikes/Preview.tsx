import { useEffect, useRef, useState } from 'react';
import type { PluggedMove, PublicPlayer, RoomView } from '../../types';
import type { Auth } from '../../useAuth';
import type { Actions } from '../../useBluff';
import { SpikesTable } from './SpikesTable';
import { accept, finished, IDS, start, tick, type Sim } from './sim';

// Dev only (?spikesPreview=1): a local Spike Attack against bots, no server needed.
// ?spikesPreview=6 uses the 6 × 6 arena, =fast the fast speed, =over shows the podium; &seed=N fixes the crates.

const NAMES = ['Ravi', 'Asha', 'Bina', 'Meera'];
/** the server's views go out at most this often */
const PUSH_MS = 80;
const player = (id: string, name: string, bot: boolean): PublicPlayer =>
  ({ id, name, avatar: null, back: 'classic', table: 'classic', cardCount: 0, handValue: null, connected: true, place: null, registered: true, coins: 5000, username: null, level: 20, bot, ready: true, saza: null }) as PublicPlayer;

export function SpikesPreview({ auth }: { auth: Auth }) {
  const q = new URLSearchParams(location.search);
  const arg = q.get('spikesPreview') ?? '';
  const seed = q.has('seed') ? Number(q.get('seed')) : undefined;
  const size = arg === '6' ? 6 : 5;
  const [sim, setSim] = useState<Sim>(() => (arg === 'over' ? finished(size) : start(size, arg === 'fast', seed)));
  const ref = useRef(sim);
  ref.current = sim;

  useEffect(() => {
    const t = window.setInterval(() => setSim((s) => tick(s, PUSH_MS)), PUSH_MS);
    return () => window.clearInterval(t);
  }, []);

  const actions = new Proxy({} as Actions, {
    get: (_, key) =>
      key === 'gameMove' || key === 'gameMoveQuiet'
        ? async (m: PluggedMove) => {
            if (m.kind !== 'spikes') return false;
            const { x, y } = m.move;
            // a little network lag before the server sees it
            window.setTimeout(() => setSim((s) => (s.sp.phase === 'play' && s.sp.lives.me > 0 ? accept(s, 'me', [x, y], Date.now()) : s)), 60);
            return true;
          }
        : key === 'rematch'
          ? async () => setSim(start(size, arg === 'fast', seed))
          : async () => null,
  });
  const players = IDS.map((id, i) => player(id, NAMES[i], i > 0));
  const over = sim.sp.phase === 'over';
  const winners = over ? IDS.filter((id) => sim.sp.places[id] === 1) : [];
  const view = {
    code: 'SPIKE', meId: 'me', hostId: 'me', phase: over ? 'over' : 'playing', players, watchers: [], leftPlayers: [], turnId: null, turnMsLeft: null,
    config: { game: 'spikes', stake: 0, opts: { size, speed: arg === 'fast' ? 'fast' : 'normal' }, turnTimer: false, voice: false, teams: false },
    watchRequests: [], winnerIds: winners, loserIds: over ? IDS.filter((id) => !winners.includes(id)) : [], teams: null, slots: null, swapAsks: [], coinResults: null, stopped: false, awards: [],
    plugged: { kind: 'spikes', spikes: sim.sp }, crazy7: null, rang: null, hand: [], pileCount: 0, pileTopBy: [], passedIds: [], endedEarly: false,
  } as unknown as RoomView;
  return <SpikesTable view={view} actions={actions} bubbles={[]} auth={auth} />;
}
