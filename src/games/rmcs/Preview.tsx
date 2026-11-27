import { useEffect, useRef, useState } from 'react';
import { RMCS_OPEN_SEC, RMCS_POINTS, RMCS_ROLES, type PluggedMove, type PublicPlayer, type RmcsRole, type RmcsRound, type RmcsView, type RoomView } from '../../types';
import type { Auth } from '../../useAuth';
import type { Actions } from '../../useBluff';
import { RmcsTable } from './RmcsTable';

// Dev only (?rmcsPreview=1): a local Raja Mantri game against 3 bots, no server needed.
// ?rmcsPreview=over shows the podium; window.rmcsRole = 'mantri' forces my next chit.

const IDS = ['me', 'b1', 'b2', 'b3'];
const ROUNDS = 5;
const player = (id: string, name: string, bot: boolean): PublicPlayer =>
  ({ id, name, avatar: null, back: 'classic', table: 'classic', cardCount: 0, handValue: null, connected: true, place: null, registered: true, coins: 5000, username: null, level: 20, bot, ready: true, saza: null }) as PublicPlayer;

interface Sim {
  rm: RmcsView;
  roles: Record<string, RmcsRole>;
  /** when each bot opens its chit */
  botOpen: Record<string, number>;
  /** when the bot Mantri guesses, or the result moves on */
  nextAt: number | null;
  over: boolean;
}

const shuffle = <T,>(a: T[]): T[] => [...a].sort(() => Math.random() - 0.5);

function deal(round: number, scores: Record<string, number>, history: RmcsRound[]): Sim {
  const w = window as unknown as { rmcsRole?: RmcsRole };
  // round 1 I'm the Sipahi, round 2 the Mantri, then random
  const mine: RmcsRole = w.rmcsRole ?? (round === 1 ? 'sipahi' : round === 2 ? 'mantri' : shuffle([...RMCS_ROLES])[0]);
  delete w.rmcsRole;
  const rest = shuffle(RMCS_ROLES.filter((r) => r !== mine));
  const roles: Record<string, RmcsRole> = { me: mine, b1: rest[0], b2: rest[1], b3: rest[2] };
  const now = Date.now();
  const botOpen = Object.fromEntries(IDS.slice(1).map((id) => [id, now + 1200 + Math.random() * 3500]));
  return {
    roles,
    botOpen,
    nextAt: null,
    over: false,
    rm: { round, rounds: ROUNDS, phase: 'open', myRole: mine, shown: {}, opened: [], endsAt: now + RMCS_OPEN_SEC * 1000, scores, history },
  };
}

/** someone opens: the Raja shows himself; all open moves on to the guess */
function open(s: Sim, id: string): Sim {
  if (s.rm.phase !== 'open' || s.rm.opened.includes(id)) return s;
  const opened = [...s.rm.opened, id];
  const shown = s.roles[id] === 'raja' ? { ...s.rm.shown, [id]: 'raja' as RmcsRole } : s.rm.shown;
  if (opened.length < 4) return { ...s, rm: { ...s.rm, opened, shown } };
  const mantri = IDS.find((x) => s.roles[x] === 'mantri')!;
  const botGuess = mantri !== 'me' ? Date.now() + 2200 : null;
  return { ...s, nextAt: botGuess, rm: { ...s.rm, opened, phase: 'guess', shown: { ...shown, [mantri]: 'mantri' }, endsAt: Date.now() + 20_000 } };
}

function settle(s: Sim, target: string | null): Sim {
  const chor = IDS.find((x) => s.roles[x] === 'chor')!;
  const mantri = IDS.find((x) => s.roles[x] === 'mantri')!;
  const correct = target === chor;
  const points = Object.fromEntries(IDS.map((id) => [id, RMCS_POINTS[s.roles[id]]]));
  if (!correct) [points[mantri], points[chor]] = [points[chor], points[mantri]];
  const scores = Object.fromEntries(IDS.map((id) => [id, (s.rm.scores[id] ?? 0) + points[id]]));
  const history = [...s.rm.history, { round: s.rm.round, roles: s.roles, guess: target, correct, points }];
  return { ...s, nextAt: Date.now() + 4000, rm: { ...s.rm, phase: 'result', shown: { ...s.roles }, endsAt: null, scores, history } };
}

function tick(s: Sim): Sim {
  const now = Date.now();
  if (s.over) return s;
  if (s.rm.phase === 'open') {
    let n = s;
    for (const id of IDS.slice(1)) if (now >= s.botOpen[id]) n = open(n, id);
    if (n.rm.phase === 'open' && n.rm.endsAt && now >= n.rm.endsAt) for (const id of IDS) n = open(n, id);
    return n;
  }
  if (s.rm.phase === 'guess') {
    const mantri = IDS.find((x) => s.roles[x] === 'mantri')!;
    const pool = IDS.filter((x) => x !== mantri && s.roles[x] !== 'raja');
    if (s.nextAt && now >= s.nextAt) return settle(s, pool[Math.floor(Math.random() * 2)]);
    if (s.rm.endsAt && now >= s.rm.endsAt) return settle(s, null);
    return s;
  }
  if (s.nextAt && now >= s.nextAt) return s.rm.round >= ROUNDS ? { ...s, over: true } : deal(s.rm.round + 1, s.rm.scores, s.rm.history);
  return s;
}

/** a finished game: five rounds, with a tie for 2nd */
function finished(): Sim {
  const plan: [RmcsRole[], boolean][] = [
    [['raja', 'mantri', 'chor', 'sipahi'], true],
    [['mantri', 'chor', 'sipahi', 'raja'], false],
    [['sipahi', 'raja', 'mantri', 'chor'], true],
    [['chor', 'sipahi', 'raja', 'mantri'], true],
    [['raja', 'sipahi', 'chor', 'mantri'], false],
  ];
  let s = deal(1, {}, []);
  plan.forEach(([order, right], i) => {
    s = { ...s, roles: Object.fromEntries(IDS.map((id, k) => [id, order[k]])), rm: { ...s.rm, round: i + 1 } };
    const chor = IDS[order.indexOf('chor')];
    const other = IDS[order.indexOf('sipahi')];
    s = settle(s, right ? chor : other);
  });
  return { ...s, over: true };
}

export function RmcsPreview({ auth }: { auth: Auth }) {
  const over = new URLSearchParams(location.search).get('rmcsPreview') === 'over';
  const [sim, setSim] = useState<Sim>(() => (over ? finished() : deal(1, Object.fromEntries(IDS.map((id) => [id, 0])), [])));
  const ref = useRef(sim);
  ref.current = sim;

  useEffect(() => {
    const t = window.setInterval(() => setSim((s) => tick(s)), 300);
    return () => window.clearInterval(t);
  }, []);

  const actions = new Proxy({} as Actions, {
    get: (_, key) =>
      key === 'gameMove'
        ? async (m: PluggedMove) => {
            const s = ref.current;
            if (m.kind !== 'rmcs') return false;
            if (m.move.type === 'open') setSim(open(s, 'me'));
            if (m.move.type === 'guess' && s.rm.phase === 'guess' && s.roles.me === 'mantri') setSim(settle(s, m.move.target));
            return true;
          }
        : async () => null,
  });
  const players = [player('me', 'Ravi', false), player('b1', 'Asha', true), player('b2', 'Bina', true), player('b3', 'Meera', true)];
  const top = Math.max(...Object.values(sim.rm.scores));
  const winners = sim.over ? IDS.filter((id) => sim.rm.scores[id] === top) : [];
  const view = {
    code: 'RAJA', meId: 'me', hostId: 'me', phase: sim.over ? 'over' : 'playing', players, watchers: [], leftPlayers: [], turnId: null, turnMsLeft: null,
    config: { game: 'rmcs', stake: 0, opts: { rounds: ROUNDS }, turnTimer: false, voice: false, teams: false },
    watchRequests: [], winnerIds: winners, loserIds: sim.over ? IDS.filter((id) => !winners.includes(id)) : [], teams: null, slots: null, swapAsks: [], coinResults: null, stopped: false, awards: [],
    plugged: { kind: 'rmcs', rmcs: sim.rm }, crazy7: null, rang: null, hand: [], pileCount: 0, pileTopBy: [], passedIds: [], endedEarly: false,
  } as unknown as RoomView;
  return <RmcsTable view={view} actions={actions} bubbles={[]} auth={auth} />;
}
