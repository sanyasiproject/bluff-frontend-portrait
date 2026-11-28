import type { CSSProperties } from 'react';
import { cx } from '../../lib/cards';
import type { SpikeDir, SpikeWarning } from '../../types';
import { across, G, GRID } from './geometry';

// The warned side's launcher (a glowing strip along the whole edge, spikes peeking out, a big countdown)
// and the strike itself: a wall of spikes shooting across every line until it slams into a crate

/** the gutter strip along the whole `dir` edge */
function strip(dir: SpikeDir): CSSProperties {
  if (dir === 'left') return { left: 0, top: `${G}%`, width: `${G}%`, height: `${GRID}%` };
  if (dir === 'right') return { right: 0, top: `${G}%`, width: `${G}%`, height: `${GRID}%` };
  if (dir === 'top') return { top: 0, left: `${G}%`, height: `${G}%`, width: `${GRID}%` };
  return { bottom: 0, left: `${G}%`, height: `${G}%`, width: `${GRID}%` };
}

export function Launcher({ w, now, size }: { w: SpikeWarning; now: number; size: number }) {
  const left = Math.max(0, w.strikeAt - now);
  const n = Math.ceil(left / 1000);
  const hot = left < 1000;
  return (
    <div className="sp-warning" aria-hidden>
      <span className={cx('sp-launch', `from-${w.dir}`, hot && 'hot')} style={strip(w.dir)}>
        {Array.from({ length: size }, (_, i) => (
          <i key={i} />
        ))}
      </span>
      <span className={cx('sp-bigcount', `from-${w.dir}`, hot && 'hot')}>
        <b key={n}>{n}</b>
      </span>
    </div>
  );
}

/** blade outlines along one line, `u` units long, tips at the far end (the crate's face) */
function blades(dir: SpikeDir, u: number): string[] {
  const pt = (a: number, b: number) => {
    const s = (v: number) => v.toFixed(3);
    if (dir === 'left') return `${s(a)},${s(b)}`;
    if (dir === 'right') return `${s(u - a)},${s(b)}`;
    if (dir === 'top') return `${s(b)},${s(a)}`;
    return `${s(b)},${s(u - a)}`;
  };
  const out: string[] = [];
  for (let k = 0; k < Math.ceil(u); k++) {
    const tip = u - k;
    const base = Math.max(0, tip - 1);
    out.push(`${pt(base, 0.1)} ${pt(tip, 0.5)} ${pt(base, 0.9)}`);
  }
  // the steel bar the blades ride on
  out.push(`${pt(0, 0.44)} ${pt(u - 0.2, 0.44)} ${pt(u - 0.2, 0.56)} ${pt(0, 0.56)}`);
  return out;
}

export function SpikeWall({ id, dir, reach, size }: { id: number; dir: SpikeDir; reach: number[]; size: number }) {
  const cell = GRID / size;
  const gid = `spw-${id}`;
  return (
    <div className={cx('sp-wall', `from-${dir}`)} aria-hidden>
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2={across(dir) ? '0' : '1'} y2={across(dir) ? '1' : '0'}>
            <stop offset="0" stopColor="#eceff1" />
            <stop offset="0.5" stopColor="#ffffff" />
            <stop offset="1" stopColor="#78909c" />
          </linearGradient>
        </defs>
      </svg>
      {reach.map((len, line) => {
        const full = len >= size;
        const pct = full ? 100 : G + len * cell;
        const u = pct / cell;
        const at = `${G + line * cell}%`;
        const style: CSSProperties = across(dir) ? { top: at, height: `${cell}%`, [dir]: 0, width: `${pct}%` } : { left: at, width: `${cell}%`, [dir]: 0, height: `${pct}%` };
        return (
          <span key={line} className="sp-wline" style={style}>
            <span className="sp-wclip">
              <svg className="sp-blades" viewBox={across(dir) ? `0 0 ${u} 1` : `0 0 1 ${u}`} preserveAspectRatio="none">
                {blades(dir, u).map((pts, i) => (
                  <polygon key={i} points={pts} fill={`url(#${gid})`} stroke="#37474f" strokeWidth={0.03} />
                ))}
              </svg>
            </span>
            {!full && <i className="sp-spark" />}
          </span>
        );
      })}
    </div>
  );
}
