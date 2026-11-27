import type { CSSProperties } from 'react';
import '../styles/games-info.css';
import { GameArt } from '../art/GameArt';
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

/** Fruit duel: the server keeps 1000 − best reaction ms (highest kept), shown back as seconds */
const bestReaction = (reflex?: number) => (reflex && reflex > 0 ? `${((1000 - reflex) / 1000).toFixed(2)}s` : '—');

/** Profile: a card per game in the catalog */
export function GameStats({ stats }: { stats: LifetimeStats }) {
  return (
    <section className="panel stack-tight game-stats">
      <h3 className="section-title">🎮 Games</h3>
      <div className="game-stat-grid">
        {GAME_CATALOG.map((g, i) => {
          const n = numbers(stats, g);
          const extra: [string, string, number | string][] =
            g.kind === 'ludo'
              ? [['💥', 'kills', n.tally?.kills ?? 0], ['🏠', 'home', n.tally?.home ?? 0], ['🎯', 'sixes', n.tally?.sixes ?? 0]]
              : g.kind === 'snakes'
                ? [['🪜', 'ladders', n.tally?.ladders ?? 0], ['🐍', 'snakes', n.tally?.snakes ?? 0], ['😬', 'bites', n.tally?.bites ?? 0]]
                : g.kind === 'rmcs'
                  ? [['🧐', 'caught', n.tally?.caught ?? 0], ['😈', 'escaped', n.tally?.escaped ?? 0], ['👑', 'raja', n.tally?.raja ?? 0]]
                  : g.kind === 'darts'
                    ? [['🔥', '180s', n.tally?.t180 ?? 0], ['🐂', 'bulls', n.tally?.bulls ?? 0], ['🎯', 'checkouts', n.tally?.checkouts ?? 0]]
                    : g.kind === 'dots'
                      ? [['⬛', 'boxes', n.tally?.boxes ?? 0]]
                      : g.kind === 'colorwar'
                        ? [['🎨', 'captures', n.tally?.captures ?? 0], ['💥', 'bursts', n.tally?.bursts ?? 0]]
                        : g.kind === 'fruit'
                          ? [['🍉', 'won', n.tally?.won ?? 0], ['🧲', 'magnets', n.tally?.magnets ?? 0], ['⚡', 'best', bestReaction(n.tally?.bestReflex)]]
                          : g.kind === 'spikes'
                            ? [['🏃', 'dodges', n.tally?.dodges ?? 0], ['💔', 'hits', n.tally?.hits ?? 0]]
                            : [];
          return (
            <div key={g.kind} className="game-stat-card" style={{ '--from': g.colors[0], '--to': g.colors[1], '--i': i } as CSSProperties}>
              {/* the game's art as a thumbnail, its name on it */}
              <div className="game-stat-art">
                <GameArt kind={g.kind} />
              </div>
              <p className="game-stat-head">
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
