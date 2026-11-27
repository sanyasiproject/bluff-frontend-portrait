import { useMemo, useState, type CSSProperties } from 'react';
import '../styles/hub.css';
import { GameArt } from '../art/GameArt';
import { Icon } from '../art/icons';
import { cx } from '../lib/cards';
import { loadLastPlayed } from '../lib/gamePick';
import { GAME_CATALOG, GAME_CATEGORIES, gameInfo, type GameCategory, type GameKind } from '../types';

/** "2–4 players" / "2–8 players" */
export const playersText = (min: number, max: number) => (min === max ? `${min} players` : `${min}–${max} players`);

/** the banner's game: the first new one, else the last played on this phone, else the first */
export function featuredKind(): GameKind {
  return GAME_CATALOG.find((g) => g.isNew)?.kind ?? loadLastPlayed()[0] ?? GAME_CATALOG[0].kind;
}

/** Home: one big card for the featured game with a gold Play button */
export function FeaturedGame({ kind, onPlay }: { kind: GameKind; onPlay: () => void }) {
  const g = gameInfo(kind);
  return (
    <section className="nt-feature" aria-label={`Featured: ${g.name}`} style={{ '--from': g.colors[0], '--to': g.colors[1] } as CSSProperties}>
      <div className="nt-feature-art">
        <GameArt kind={kind} />
        {g.isNew && <span className="nt-badge new nt-feature-badge">New</span>}
      </div>
      <div className="nt-feature-body">
        <p className="nt-feature-kicker">{g.isNew ? 'New game' : 'Jump back in'}</p>
        <h2 className="nt-title nt-feature-name">{g.name}</h2>
        <p className="nt-feature-tag">{g.tagline}</p>
        <div className="nt-feature-row">
          <span className="nt-feature-players">
            <Icon name="friends" size={16} />
            {playersText(g.minPlayers, g.maxPlayers)}
          </span>
          <button type="button" className="nt-btn big nt-feature-play" onClick={onPlay}>
            <Icon name="play" size={22} />
            {`Play ${g.name}`}
          </button>
        </div>
      </div>
    </section>
  );
}

/** Home: every game as a tile; tapping one picks it for the next room */
export function GameHub({ picked, onPick }: { picked: GameKind | null; onPick: (kind: GameKind) => void }) {
  const [cat, setCat] = useState<GameCategory | 'all'>('all');
  // read once per visit to Home
  const recent = useMemo(loadLastPlayed, []);
  const games = GAME_CATALOG.filter((g) => cat === 'all' || g.category === cat);

  return (
    <section className="game-hub" aria-label="Games">
      <div className="hub-head">
        <h2 className="section-title nt-title">All games</h2>
        <span className="muted small">{`${GAME_CATALOG.length} to play`}</span>
      </div>

      <div className="hub-chips" role="tablist" aria-label="Game type">
        {[{ id: 'all' as const, name: 'All', emoji: '✨' }, ...GAME_CATEGORIES].map((c) => (
          <button key={c.id} type="button" role="tab" aria-selected={cat === c.id} className={cx('nt-chip hub-chip', cat === c.id && 'on')} onClick={() => setCat(c.id)}>
            {c.emoji} {c.name}
          </button>
        ))}
      </div>

      {recent.length > 0 && (
        <div className="hub-recent" role="group" aria-label="Last played">
          <span className="hub-recent-label">Last played</span>
          {recent.slice(0, 3).map((k) => {
            const g = gameInfo(k);
            return (
              <button key={k} type="button" className={cx('nt-chip hub-recent-pill', picked === k && 'on')} onClick={() => onPick(k)}>
                {g.emoji} {g.name}
              </button>
            );
          })}
        </div>
      )}

      <div className="hub-grid">
        {games.map((g, i) => (
          <button
            key={g.kind}
            type="button"
            className={cx('hub-tile', picked === g.kind && 'on')}
            aria-pressed={picked === g.kind}
            style={{ '--from': g.colors[0], '--to': g.colors[1], '--i': Math.min(i, 8) } as CSSProperties}
            onClick={() => onPick(g.kind)}
          >
            {/* art on top; badges sit on the art so they never cover the text */}
            <span className="hub-art">
              <GameArt kind={g.kind} />
              {g.isNew && <span className="nt-badge new hub-new">New</span>}
              {recent[0] === g.kind && !g.isNew && <span className="hub-last">Last played</span>}
              {picked === g.kind && <span className="hub-tick" aria-hidden>✓</span>}
            </span>
            <span className="hub-body">
              <b className="hub-name">{g.name}</b>
              <span className="hub-tag">{g.tagline}</span>
              <span className="hub-meta">
                <Icon name="friends" size={14} />
                {playersText(g.minPlayers, g.maxPlayers)}
              </span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
