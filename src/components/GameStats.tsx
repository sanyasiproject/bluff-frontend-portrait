import type { CSSProperties } from 'react';
import '../styles/games-info.css';
import { percent } from '../lib/progress';
import { GAME_CATALOG, type GameInfo, type GameKind, type LifetimeStats } from '../types';

/** games played before per-game counting began, from the older totals; null when there is none */
function olderPlayed(s: LifetimeStats, kind: GameKind): number | null {
  const c7 = s.crazy7Games ?? 0;
  const rang = s.rangGames ?? 0;
  const ludo = s.perGame?.ludo?.played ?? 0;
  if (kind === 'crazy7') return c7;
  if (kind === 'rang') return rang;
  if (kind === 'bluff') return Math.max(0, s.gamesPlayed - c7 - rang - ludo);
  return null;
}

/** one game's numbers: played from the older totals when larger, wins only once counted per game */
function numbers(s: LifetimeStats, g: GameInfo) {
  const tally = s.perGame?.[g.kind];
  const played = Math.max(tally?.played ?? 0, olderPlayed(s, g.kind) ?? 0);
  const wins = tally ? tally.wins : null;
  const rate = tally ? percent(tally.wins, tally.played) : null;
  return { played, wins, rate, tally };
}

/** Profile: a card per game in the catalog */
export function GameStats({ stats }: { stats: LifetimeStats }) {
  return (
    <section className="panel stack-tight game-stats">
      <h3 className="section-title">🎮 Games</h3>
      <div className="game-stat-grid">
        {GAME_CATALOG.map((g, i) => {
          const n = numbers(stats, g);
          const extra: [string, string, number][] =
            g.kind === 'ludo' ? [['💥', 'kills', n.tally?.kills ?? 0], ['🏠', 'home', n.tally?.home ?? 0], ['🎯', 'sixes', n.tally?.sixes ?? 0]] : [];
          return (
            <div key={g.kind} className="game-stat-card" style={{ '--from': g.colors[0], '--to': g.colors[1], '--i': i } as CSSProperties}>
              <p className="game-stat-head">
                <span aria-hidden>{g.emoji}</span>
                <b>{g.name}</b>
              </p>
              <div className="game-stat-nums">
                <span>
                  <b>{n.played}</b>
                  <small>played</small>
                </span>
                <span>
                  <b>{n.wins ?? '—'}</b>
                  <small>wins</small>
                </span>
                <span>
                  <b>{n.rate === null ? '—' : `${n.rate}%`}</b>
                  <small>win rate</small>
                </span>
              </div>
              {extra.length > 0 && (
                <p className="game-stat-extra">
                  {extra.map(([emoji, label, value]) => (
                    <span key={label}>
                      {emoji} <b>{value}</b> {label}
                    </span>
                  ))}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
