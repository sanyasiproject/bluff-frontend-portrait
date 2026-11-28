import { lazy, Suspense, useState } from 'react';
import type { Auth } from '../../useAuth';
import { chessApi } from './chessApi';
import '../../styles/chess-profile.css';

// Profile → Stats: the button that opens Profile → Chess (ratings, graphs, games, leaderboards), loaded on tap

const ChessProfile = lazy(() => import('./ChessProfile').then((m) => ({ default: m.ChessProfile })));

export function ChessProfileButton({ auth }: { auth: Auth }) {
  const [open, setOpen] = useState(false);
  const token = auth.token;
  return (
    <>
      <button className="ch-profile-btn" onClick={() => setOpen(true)}>
        <span aria-hidden>♟️</span>
        <span className="grow">
          <b>Chess ratings</b>
          <small>Ratings per speed and variant, graphs, games to analyse, leaderboards</small>
        </span>
        <span aria-hidden>›</span>
      </button>
      {open && (
        <Suspense fallback={null}>
          <ChessProfile
            myId={auth.user?.id ?? null}
            source={{
              ratings: () => chessApi.ratings(token),
              leaderboard: (perf) => chessApi.leaderboard(token, perf),
              games: () => chessApi.games(token),
              game: (id) => chessApi.game(token, id),
            }}
            onClose={() => setOpen(false)}
          />
        </Suspense>
      )}
    </>
  );
}
