import { useEffect, useState } from 'react';
import { cx } from '../../lib/cards';
import { errorText } from '../../lib/api';
import { Avatar } from '../../components/Avatar';
import type { ChessGameSummary, ChessLeaderboard, ChessPerf } from './contract';
import { chessProvisional } from './contract';
import { END_REASON, perfInfo, PERFS, timeLabel } from './catalog';
import type { ChessSource } from './ChessProfile';

// Profile → Chess lists: my recent games, and the leaderboard per perf

const when = (ts: number) => new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

export function ChessGameList({ source, myId, onOpen }: { source: ChessSource; myId: string | null; onOpen: (id: string) => void }) {
  const [games, setGames] = useState<ChessGameSummary[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    source.games().then((r) => setGames(r.games), (e) => setErr(errorText(e)));
  }, []);
  if (err) return <p className="error-text">{err}</p>;
  if (!games) return <p className="muted center">Loading…</p>;
  if (!games.length) return <p className="muted center">No chess games yet. Finished games show up here, ready to analyse.</p>;
  return (
    <ul className="ch-games">
      {games.map((g) => {
        const me = g.players.b.userId === myId ? 'b' : 'w';
        const them = me === 'w' ? 'b' : 'w';
        const res = g.result.winner === null ? 'draw' : g.result.winner === me ? 'win' : 'loss';
        const p = g.players[me];
        const diff = g.rated && p.before !== null && p.after !== null ? Math.round(p.after - p.before) : null;
        const opp = g.players[them];
        const info = perfInfo(g.perf);
        return (
          <li key={g.id}>
            <button className="ch-game" onClick={() => onOpen(g.id)} aria-label={`Analyse the game against ${opp.name}`}>
              <span className={cx('ch-res', res)}>{res === 'win' ? 'W' : res === 'loss' ? 'L' : '½'}</span>
              <span className="grow ch-game-main">
                <b data-no-translate>{`${opp.name}${opp.bot ? ` 🤖 L${opp.bot}` : ''}${opp.before !== null ? ` (${Math.round(opp.before)}${opp.prov ? '?' : ''})` : ''}`}</b>
                <small>{`${info.icon} ${info.name} · ${timeLabel(g.time)} · ${END_REASON[g.result.reason] ?? g.result.reason}`}</small>
                {g.opening && <small className="muted" data-no-translate>{`${g.opening.eco} ${g.opening.name}`}</small>}
              </span>
              <span className="ch-game-side">
                {diff !== null && <b className={cx('ch-rdiff', diff >= 0 ? 'up' : 'down')}>{`${diff >= 0 ? '+' : ''}${diff}`}</b>}
                <small>{when(g.endedAt)}</small>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function ChessLeaders({ source, perf, onPerf, myId }: { source: ChessSource; perf: ChessPerf; onPerf: (p: ChessPerf) => void; myId: string | null }) {
  const [board, setBoard] = useState<ChessLeaderboard | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    setBoard(null);
    setErr(null);
    source.leaderboard(perf).then(setBoard, (e) => setErr(errorText(e)));
  }, [perf]);
  return (
    <>
      <div className="ch-rule-tabs ch-perf-chips">
        {PERFS.map((p) => (
          <button key={p.id} className={cx(p.id === perf && 'on')} aria-pressed={p.id === perf} onClick={() => onPerf(p.id)}>
            {p.icon} <span>{p.name}</span>
          </button>
        ))}
      </div>
      {err && <p className="error-text">{err}</p>}
      {!board && !err && <p className="muted center">Loading…</p>}
      {board && (
        <>
          <p className="ch-my-rank">
            {board.me?.rank
              ? `You are #${board.me.rank} in ${perfInfo(perf).name}`
              : board.me?.rating && chessProvisional(board.me.rating.rd)
                ? 'Your rating is still settling (?): play a few more rated games to get a place'
                : `Play a rated ${perfInfo(perf).name} game to join the board`}
          </p>
          {!board.top.length ? (
            <p className="muted center">Nobody has a settled rating here yet.</p>
          ) : (
            <ol className="ch-leaders">
              {board.top.map((row) => (
                <li key={row.userId} className={cx(row.userId === myId && 'me', row.rank <= 3 && `top${row.rank}`)}>
                  <span className="ch-rank">{row.rank <= 3 ? ['🥇', '🥈', '🥉'][row.rank - 1] : row.rank}</span>
                  <Avatar name={row.displayName} avatar={row.avatar} size="sm" />
                  <span className="grow ch-leader-name" data-no-translate>
                    <b>{row.displayName}</b>
                    <small>{`@${row.username} · ${row.games} games`}</small>
                  </span>
                  <b className="ch-leader-r">{Math.round(row.r)}</b>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </>
  );
}
