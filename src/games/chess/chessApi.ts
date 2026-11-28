import { api } from '../../lib/api';
import type { ChessGameRecord, ChessGameSummary, ChessLeaderboard, ChessPerf, ChessRatingsResponse } from './contract';

// The server's chess pages (logged-in players only): ratings, leaderboards and saved games

export const chessApi = {
  ratings: (token: string | null, userId = 'me') => api<ChessRatingsResponse>(`/chess/ratings/${encodeURIComponent(userId)}`, { token }),
  leaderboard: (token: string | null, perf: ChessPerf) => api<ChessLeaderboard>(`/chess/leaderboard/${perf}`, { token }),
  games: (token: string | null, before?: number) => api<{ games: ChessGameSummary[] }>(`/chess/games?limit=30${before ? `&before=${before}` : ''}`, { token }),
  game: (token: string | null, id: string) => api<{ game: ChessGameRecord }>(`/chess/games/${encodeURIComponent(id)}`, { token }),
};
