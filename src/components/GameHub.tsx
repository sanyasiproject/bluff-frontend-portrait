import { useMemo, useState, type CSSProperties } from 'react';
import '../styles/hub.css';
import { cx } from '../lib/cards';
import { loadLastPlayed } from '../lib/gamePick';
import { GAME_CATALOG, GAME_CATEGORIES, gameInfo, type GameCategory, type GameKind } from '../types';

/** "2–4 players" / "2–8 players" */
export const playersText = (min: number, max: number) => (min === max ? `${min} players` : `${min}–${max} players`);

/** Home: every game as a tile; tapping one picks it for the next room */
export function GameHub({ picked, onPick }: { picked: GameKind | null; onPick: (kind: GameKind) => void }) {
  const [cat, setCat] = useState<GameCategory | 'all'>('all');
  // read once per visit to Home
  const recent = useMemo(loadLastPlayed, []);
  const games = GAME_CATALOG.filter((g) => cat === 'all' || g.category === cat);

  return (
    <section className="panel game-hub" aria-label="Games">
      <div className="hub-head">
        <h2 className="section-title">Games</h2>
        <span className="muted small">{`${GAME_CATALOG.length} to play`}</span>
      </div>

      {recent.length > 0 && (
        <div className="hub-recent" role="group" aria-label="Last played">
          <span className="hub-recent-label">⏪ Last played</span>
          {recent.slice(0, 3).map((k) => {
            const g = gameInfo(k);
            return (
              <button key={k} type="button" className={cx('hub-recent-pill', picked === k && 'on')} onClick={() => onPick(k)}>
                {g.emoji} {g.name}
              </button>
            );
          })}
        </div>
      )}

      <div className="hub-chips" role="tablist" aria-label="Game type">
        {[{ id: 'all' as const, name: 'All', emoji: '✨' }, ...GAME_CATEGORIES].map((c) => (
          <button key={c.id} type="button" role="tab" aria-selected={cat === c.id} className={cx('hub-chip', cat === c.id && 'on')} onClick={() => setCat(c.id)}>
            {c.emoji} {c.name}
          </button>
        ))}
      </div>

      <div className={cx('hub-grid', games.length > 6 && 'scrolls')}>
        {games.map((g, i) => (
          <button
            key={g.kind}
            type="button"
            className={cx('hub-tile', picked === g.kind && 'on')}
            aria-pressed={picked === g.kind}
            style={{ '--from': g.colors[0], '--to': g.colors[1], '--i': i } as CSSProperties}
            onClick={() => onPick(g.kind)}
          >
            {g.isNew && <span className="hub-new">NEW</span>}
            {recent[0] === g.kind && !g.isNew && <span className="hub-last">⏪</span>}
            <span className="hub-emoji" aria-hidden>
              {g.emoji}
            </span>
            <b className="hub-name">{g.name}</b>
            <span className="hub-tag">{g.tagline}</span>
            <span className="hub-meta">{`👥 ${playersText(g.minPlayers, g.maxPlayers)}`}</span>
            {picked === g.kind && <span className="hub-tick" aria-hidden>✓</span>}
          </button>
        ))}
      </div>
    </section>
  );
}
