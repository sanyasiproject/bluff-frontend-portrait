import type { CSSProperties } from 'react';
import { cx } from '../../lib/cards';
import type { SpikeDir, SpikeWarning } from '../../types';
import { across, cellHit, cellShadow, G, GRID, type Box } from './geometry';
import { Launcher, SpikeWall } from './Walls';

// The arena: a stone temple floor with thick walls round it where the spikes hide; crates, warnings, strikes and players on top


export interface Token {
  id: string;
  /** centre in arena units (0..size), y down */
  x: number;
  y: number;
  /** running: a little bob */
  moving: boolean;
  /** -1 facing left, 1 right */
  face: number;
  color: string;
  initial: string;
  /** shown on the tag under the character */
  name: string;
  lives: number;
  me: boolean;
  ghost: boolean;
  /** blinking after a hit */
  safe: boolean;
  /** bumps each time they're hit, for the broken-heart pop */
  hits: number;
  /** I'm standing where a warned wall reaches: seconds left, else null */
  danger: number | null;
}
export interface StrikeFx { id: number; dir: SpikeDir }

export function Arena({
  size,
  now,
  boxes,
  reach,
  warnings,
  strikes,
  tokens,
}: {
  size: number;
  now: number;
  boxes: Box[];
  reach: Record<SpikeDir, number[]>;
  warnings: SpikeWarning[];
  strikes: StrikeFx[];
  tokens: Token[];
}) {
  const live = warnings.filter((w) => w.strikeAt > now);
  const isBox = new Set(boxes.map(([c, r]) => `${c},${r}`));
  // how hot each square is (0 safe .. 1 about to be hit), and which squares hide in a crate's shadow
  const heat = new Map<number, number>();
  const shade = new Set<number>();
  for (const w of live) {
    const u = Math.min(1, Math.max(0.15, 1 - (w.strikeAt - now) / Math.max(1, w.strikeAt - w.warnAt)));
    for (let r = 0; r < size; r++)
      for (let c = 0; c < size; c++) {
        if (isBox.has(`${c},${r}`)) continue;
        const i = r * size + c;
        if (cellHit(c, r, w.dir, reach[w.dir], size)) heat.set(i, Math.max(heat.get(i) ?? 0, u));
        else if (cellShadow(c, r, w.dir, reach[w.dir], size)) shade.add(i);
      }
  }
  // crates a strike just slammed into, for the thud
  const thud = new Map<string, number>();
  for (const s of strikes)
    reach[s.dir].forEach((len, line) => {
      if (len >= size) return;
      const c = across(s.dir) ? (s.dir === 'left' ? len : size - 1 - len) : line;
      const r = across(s.dir) ? line : s.dir === 'top' ? len : size - 1 - len;
      thud.set(`${c},${r}`, s.id);
    });

  return (
    <div className={cx('sp-arena', live.length > 0 && 'alarm')} style={{ '--n': size } as CSSProperties}>
      <div className="sp-floor">
        <span className="sp-slots" aria-hidden />
      </div>
      <div className="sp-grid">
        {Array.from({ length: size * size }, (_, i) => {
          const h = heat.get(i);
          return (
            <span
              key={i}
              className={cx('sp-cell', (i + Math.floor(i / size)) % 2 && 'alt', h !== undefined && 'warn', h === undefined && shade.has(i) && 'shade')}
              style={h !== undefined ? ({ '--heat': h } as CSSProperties) : undefined}
            />
          );
        })}
      </div>
      {/* crates: placed in arena units like the players and the walls, so what you see is what blocks */}
      <div className="sp-crates" aria-hidden>
        {boxes.map(([c, r]) => {
          const hit = thud.get(`${c},${r}`);
          const cell = GRID / size;
          return (
            <span key={`${c},${r}`} className="sp-crate-slot" style={{ left: `${G + c * cell}%`, top: `${G + r * cell}%`, width: `${cell}%`, height: `${cell}%` }}>
              <span key={hit ?? 'still'} className={cx('sp-crate', hit !== undefined && 'thud')}>
                <i />
              </span>
            </span>
          );
        })}
      </div>

      {live.map((w) => (
        <Launcher key={w.id} w={w} now={now} size={size} />
      ))}

      {tokens.map((t) => {
        const cell = GRID / size;
        return (
          <div
            key={t.id}
            className={cx('sp-token', t.me && 'me', t.ghost && 'ghost', t.safe && 'safe', t.moving && !t.ghost && 'run')}
            style={{ '--pc': t.color, '--face': t.face, left: `${G}%`, top: `${G}%`, width: `${cell}%`, height: `${cell}%`, transform: `translate(${(t.x - 0.5) * 100}%, ${(t.y - 0.5) * 100}%)` } as CSSProperties}
          >
            <span className="sp-shadow" aria-hidden />
            <span className="sp-body">
              <span className="sp-eyes">
                <i />
                <i />
              </span>
              {t.ghost ? <b className="sp-ini">👻</b> : <span className="sp-mouth" />}
            </span>
            {t.danger !== null && (
              <span key={t.danger} className="sp-danger" aria-hidden>
                {t.danger}
              </span>
            )}
            {t.hits > 0 && (
              <span key={t.hits} className="sp-ouch">
                💔
              </span>
            )}
          </div>
        );
      })}

      {strikes.map((s) => (
        <SpikeWall key={s.id} id={s.id} dir={s.dir} reach={reach[s.dir]} size={size} />
      ))}

      {/* hearts and name tags ride their own layer above the spike walls, so a wall never hides who is who */}
      {tokens.map((t) => {
        const cell = GRID / size;
        return (
          <div
            key={t.id}
            className={cx('sp-token', 'sp-label', t.me && 'me', t.ghost && 'ghost')}
            style={{ '--pc': t.color, left: `${G}%`, top: `${G}%`, width: `${cell}%`, height: `${cell}%`, transform: `translate(${(t.x - 0.5) * 100}%, ${(t.y - 0.5) * 100}%)` } as CSSProperties}
            aria-hidden={t.ghost || undefined}
          >
            {!t.ghost && (
              <span className="sp-lives" aria-hidden>
                {'❤'.repeat(Math.max(0, t.lives))}
              </span>
            )}
            <span className="sp-tag" data-no-translate>
              {t.me ? 'You' : t.name}
            </span>
          </div>
        );
      })}
    </div>
  );
}
