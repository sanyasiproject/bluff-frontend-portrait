import { useState } from 'react';
import type { GameConfig, PublicPlayer } from '../../types';
import type { Auth } from '../../useAuth';
import type { ChessGameRecord, ChessGameSummary, ChessPerf, ChessRating } from './contract';
import { ChessOptions } from './Options';
import { ChessRules } from './Rules';
import { ChessAnalysis } from './Analysis';
import { ChessProfile, type ChessSource } from './ChessProfile';
import { ChessGame } from './lib';

// Dev only: the chess lobby settings, an analysis and Profile → Chess with made-up data (see Preview.tsx)

const GAME = 'e2e4 e7e5 g1f3 b8c6 f1c4 g8f6 f3g5 d7d5 e4d5 f6d5 g5f7 e8f7 d1f3 f7e6 b1c3 c6b4 f3e4 c7c6 a2a3 b4a6 d2d4 a6c7 c1f4 e6f7 f4e5 c8e6 e5c7 d8c7'.split(' ');

function startFen(): string {
  return new ChessGame('standard').position().fen();
}

export function ChessPreviewPage({ mode, auth }: { mode: string; auth: Auth }) {
  if (mode === 'lobby') return <LobbyPreview />;
  if (mode === 'analysis')
    return <ChessAnalysis game={{ variant: 'standard', initialFen: startFen(), moves: GAME }} id={null} names={{ w: 'Ravi', b: 'Meera' }} orient="w" result="*" onClose={() => history.back()} />;
  return <ChessProfile source={fakeSource} myId={auth.user?.id ?? 'me'} onClose={() => history.back()} />;
}

function LobbyPreview() {
  const [opts, setOpts] = useState<Record<string, string | number | boolean>>({ variant: 'standard', time: '5+0', rated: 'no', color: 'random' });
  const bot = new URLSearchParams(location.search).has('bot');
  const players = [{ id: 'me', bot: false, registered: true }, { id: 'b', bot, registered: true }] as PublicPlayer[];
  return (
    <main className="screen lobby" style={{ padding: 12, overflow: 'auto', height: '100dvh' }}>
      <section className="panel">
        <h2 className="section-title">Game settings</h2>
        <ChessOptions config={{ opts } as Pick<GameConfig, 'opts'>} players={players} onPick={(id, v) => setOpts((o) => ({ ...o, [id]: v }))} />
      </section>
      <details className="panel rules" open>
        <summary>How to play Chess</summary>
        <ChessRules variant={opts.variant as 'standard'} />
      </details>
    </main>
  );
}

const DAY = 86400000;
function rating(base: number, games: number, rd: number): ChessRating {
  const history: [number, number][] = Array.from({ length: games }, (_, i) => [Date.now() - (games - i) * DAY * 0.7, Math.round(800 + (base - 800) * (i / Math.max(1, games - 1)) + Math.sin(i) * 25)]);
  return { r: base, rd, vol: 0.06, games, w: Math.round(games * 0.5), l: Math.round(games * 0.4), d: games - Math.round(games * 0.5) - Math.round(games * 0.4), peak: base + 22, streak: 2, bestStreak: 5, history, updatedAt: Date.now() };
}
const summary = (id: string, i: number): ChessGameSummary => ({
  id,
  variant: i % 3 === 2 ? 'atomic' : 'standard',
  time: i % 2 ? '3+2' : '10+0',
  speed: i % 2 ? 'blitz' : 'rapid',
  perf: i % 3 === 2 ? 'atomic' : i % 2 ? 'blitz' : 'rapid',
  rated: i % 4 !== 3,
  players: {
    w: { userId: 'me', name: 'Ravi', bot: null, before: 1012 - i * 8, after: 1012 - i * 8 + (i % 2 ? -9 : 14), prov: false },
    b: { userId: i % 4 === 3 ? null : `u${i}`, name: ['Meera', 'Raju', 'Priya', 'Bot'][i % 4], bot: i % 4 === 3 ? 4 : null, before: 1050, after: 1040, prov: i === 1 },
  },
  result: { winner: i % 2 ? 'b' : 'w', reason: i % 2 ? 'timeout' : 'checkmate' },
  plies: 40 + i,
  opening: { eco: 'C50', name: 'Italian Game' },
  endedAt: Date.now() - i * DAY * 0.4,
});
const fakeSource: ChessSource = {
  ratings: async () => ({ userId: 'me', perfs: { blitz: rating(1012, 34, 70), rapid: rating(940, 12, 95), bullet: rating(860, 3, 260), atomic: rating(905, 5, 180) } as Partial<Record<ChessPerf, ChessRating>> }),
  leaderboard: async (perf) => ({
    perf,
    top: Array.from({ length: 12 }, (_, i) => ({ rank: i + 1, userId: i === 6 ? 'me' : `u${i}`, username: `player${i}`, displayName: i === 6 ? 'Ravi' : ['Meera', 'Raju', 'Priya', 'Arjun', 'Kavya', 'Dev'][i % 6], avatar: null, r: 1600 - i * 45, rd: 60, games: 80 - i * 4 })),
    me: { rank: 7, rating: rating(1012, 34, 70) },
  }),
  games: async () => ({ games: Array.from({ length: 6 }, (_, i) => summary(`g${i}`, i)) }),
  game: async (id) => ({ game: { ...summary(id, 0), initialFen: startFen(), moves: GAME, pgn: '' } as ChessGameRecord }),
};
