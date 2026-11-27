import type { CSSProperties } from 'react';
import { cx } from '../../lib/cards';
import type { SpikeDir, SpikeWarning } from '../../types';

// The arena: a grid of boxes with a gutter round it where the spikes wait; warnings, strikes and the players on top

/** gutter and grid, in % of the arena's side */
const G = 9;
const GRID = 100 - 2 * G;

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
}
export interface StrikeFx { id: number; dir: SpikeDir; line: number }

const across = (d: SpikeDir) => d === 'left' || d === 'right';

/** the box a warning or strike covers, in % of the arena */
function band(dir: SpikeDir, line: number, size: number, withGutter = false): CSSProperties {
  const cell = GRID / size;
  const start = withGutter ? 0 : G;
  const len = withGutter ? 100 : GRID;
  return across(dir)
    ? { left: `${start}%`, width: `${len}%`, top: `${G + line * cell}%`, height: `${cell}%` }
    : { top: `${start}%`, height: `${len}%`, left: `${G + line * cell}%`, width: `${cell}%` };
}

/** the glowing launcher in the gutter where the spike comes from */
function edge(dir: SpikeDir, line: number, size: number): CSSProperties {
  const cell = GRID / size;
  const along = `${G + line * cell}%`;
  if (dir === 'left') return { left: 0, top: along, width: `${G}%`, height: `${cell}%` };
  if (dir === 'right') return { right: 0, top: along, width: `${G}%`, height: `${cell}%` };
  if (dir === 'top') return { top: 0, left: along, height: `${G}%`, width: `${cell}%` };
  return { bottom: 0, left: along, height: `${G}%`, width: `${cell}%` };
}

/** a train of blades pointing the way the spike travels, one per box */
function blades(dir: SpikeDir, size: number): string[] {
  return Array.from({ length: size }, (_, i) => {
    if (dir === 'left') return `${i},0.12 ${i + 0.98},0.5 ${i},0.88`;
    if (dir === 'right') return `${i + 1},0.12 ${i + 0.02},0.5 ${i + 1},0.88`;
    if (dir === 'top') return `0.12,${i} 0.5,${i + 0.98} 0.88,${i}`;
    return `0.12,${i + 1} 0.5,${i + 0.02} 0.88,${i + 1}`;
  });
}

const ARROW: Record<SpikeDir, string> = { left: '▶', right: '◀', top: '▼', bottom: '▲' };

export function Arena({
  size,
  now,
  warnings,
  strikes,
  tokens,
}: {
  size: number;
  now: number;
  warnings: SpikeWarning[];
  strikes: StrikeFx[];
  tokens: Token[];
}) {
  const live = warnings.filter((w) => w.strikeAt > now);
  // how hot each box is: 0 safe .. 1 about to be hit
  const heat = new Map<number, number>();
  for (const w of live) {
    const u = Math.min(1, Math.max(0.15, 1 - (w.strikeAt - now) / Math.max(1, w.strikeAt - w.warnAt)));
    for (let i = 0; i < size; i++) {
      const cell = across(w.dir) ? w.line * size + i : i * size + w.line;
      heat.set(cell, Math.max(heat.get(cell) ?? 0, u));
    }
  }
  return (
    <div className="sp-arena" style={{ '--n': size } as CSSProperties}>
      <div className="sp-floor" />
      <div className="sp-grid">
        {Array.from({ length: size * size }, (_, i) => {
          const h = heat.get(i);
          return <span key={i} className={cx('sp-cell', (i + Math.floor(i / size)) % 2 && 'alt', h !== undefined && 'warn')} style={h !== undefined ? ({ '--heat': h } as CSSProperties) : undefined} />;
        })}
      </div>

      {live.map((w) => {
        const left = Math.max(0, w.strikeAt - now);
        const n = Math.ceil(left / 1000);
        return (
          <div key={w.id} className="sp-warning" aria-hidden>
            <span className={cx('sp-edge', `from-${w.dir}`, left < 1000 && 'hot')} style={edge(w.dir, w.line, size)}>
              <i>{ARROW[w.dir]}</i>
            </span>
            <span className={cx('sp-count', across(w.dir) ? 'row' : 'col', left < 1000 && 'hot')} style={band(w.dir, w.line, size)}>
              <b key={n} className={cx(n <= 1 && 'last')}>
                {n}
              </b>
            </span>
          </div>
        );
      })}

      {tokens.map((t) => {
        const cell = GRID / size;
        return (
          <div
            key={t.id}
            className={cx('sp-token', t.me && 'me', t.ghost && 'ghost', t.safe && 'safe', t.moving && !t.ghost && 'run')}
            style={{ '--pc': t.color, '--face': t.face, left: `${G}%`, top: `${G}%`, width: `${cell}%`, height: `${cell}%`, transform: `translate(${(t.x - 0.5) * 100}%, ${(t.y - 0.5) * 100}%)` } as CSSProperties}
          >
            <span className="sp-body">
              <span className="sp-eyes">
                <i />
                <i />
              </span>
              {t.ghost ? <b className="sp-ini">👻</b> : <span className="sp-mouth" />}
            </span>
            {!t.ghost && (
              <span className="sp-lives" aria-hidden>
                {'❤'.repeat(Math.max(0, t.lives))}
              </span>
            )}
            <span className="sp-tag" data-no-translate>
              {t.me ? 'You' : t.name}
            </span>
            {t.hits > 0 && (
              <span key={t.hits} className="sp-ouch">
                💔
              </span>
            )}
          </div>
        );
      })}

      {strikes.map((s) => (
        <div key={s.id} className={cx('sp-strike', `from-${s.dir}`)} style={band(s.dir, s.line, size, true)} aria-hidden>
          <svg className="sp-blades" viewBox={across(s.dir) ? `0 0 ${size} 1` : `0 0 1 ${size}`} preserveAspectRatio="none" style={across(s.dir) ? { left: `${G}%`, width: `${GRID}%`, top: 0, height: '100%' } : { top: `${G}%`, height: `${GRID}%`, left: 0, width: '100%' }}>
            <defs>
              <linearGradient id={`spg-${s.id}`} x1="0" y1="0" x2={across(s.dir) ? '0' : '1'} y2={across(s.dir) ? '1' : '0'}>
                <stop offset="0" stopColor="#eceff1" />
                <stop offset="0.5" stopColor="#ffffff" />
                <stop offset="1" stopColor="#78909c" />
              </linearGradient>
            </defs>
            {blades(s.dir, size).map((pts, i) => (
              <polygon key={i} points={pts} fill={`url(#spg-${s.id})`} stroke="#37474f" strokeWidth={0.03} />
            ))}
          </svg>
          <span className="sp-slash" />
          <span className="sp-wipe" />
        </div>
      ))}
    </div>
  );
}
