import type { CSSProperties } from 'react';
import { cx } from '../../lib/cards';
import type { SpikeDir, SpikeWarning } from '../../types';
import { across, G, GRID } from './geometry';

// The warned side's launcher (the stone wall rumbles, dust falls from its slot, spike tips peek out, a big countdown)
// and the strike itself: steel spikes slam out of the wall across every line, stop at a crate with a thud, then retract

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
        <span className="sp-dust">
          {Array.from({ length: size * 2 }, (_, i) => (
            <b key={i} style={{ '--p': `${((i + 0.5) / (size * 2)) * 100}%`, '--dl': `${(i * 137) % 600}ms` } as CSSProperties} />
          ))}
        </span>
      </span>
      <span className={cx('sp-bigcount', `from-${w.dir}`, hot && 'hot')}>
        <b key={n}>{n}</b>
      </span>
    </div>
  );
}

/** spike facets along one line, `u` units long, tips at the far end (the crate's face): a lit and a shaded side per spike, then the rod */
function blades(dir: SpikeDir, u: number): { pts: string; lit: boolean }[] {
  const pt = (a: number, b: number) => {
    const s = (v: number) => v.toFixed(3);
    if (dir === 'left') return `${s(a)},${s(b)}`;
    if (dir === 'right') return `${s(u - a)},${s(b)}`;
    if (dir === 'top') return `${s(b)},${s(a)}`;
    return `${s(b)},${s(u - a)}`;
  };
  const out: { pts: string; lit: boolean }[] = [];
  // the steel rod the spikes ride on
  out.push({ pts: `${pt(0, 0.46)} ${pt(u - 0.3, 0.46)} ${pt(u - 0.3, 0.54)} ${pt(0, 0.54)}`, lit: false });
  // slender spikes, two per square
  for (let k = 0; k < Math.ceil(u * 2); k++) {
    const tip = u - k * 0.5;
    const base = Math.max(0, tip - 0.48);
    out.push({ pts: `${pt(base, 0.32)} ${pt(tip, 0.5)} ${pt(base, 0.5)}`, lit: true });
    out.push({ pts: `${pt(base, 0.5)} ${pt(tip, 0.5)} ${pt(base, 0.68)}`, lit: false });
  }
  return out;
}

export function SpikeWall({ id, dir, reach, size }: { id: number; dir: SpikeDir; reach: number[]; size: number }) {
  const cell = GRID / size;
  const gid = `spw-${id}`;
  return (
    <div className={cx('sp-wall', `from-${dir}`)} aria-hidden>
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <linearGradient id={`${gid}-lit`} x1="0" y1="0" x2={across(dir) ? '0' : '1'} y2={across(dir) ? '1' : '0'}>
            <stop offset="0" stopColor="#b0bec5" />
            <stop offset="0.6" stopColor="#ffffff" />
            <stop offset="1" stopColor="#e3e9ec" />
          </linearGradient>
          <linearGradient id={`${gid}-dark`} x1="0" y1="0" x2={across(dir) ? '0' : '1'} y2={across(dir) ? '1' : '0'}>
            <stop offset="0" stopColor="#90a4ae" />
            <stop offset="0.5" stopColor="#546e7a" />
            <stop offset="1" stopColor="#263238" />
          </linearGradient>
        </defs>
      </svg>
      {reach.map((len, line) => {
        const full = len >= size;
        // a line with no crate stops at the inner face of the far wall
        const pct = G + Math.min(len, size) * cell;
        const u = pct / cell;
        const at = `${G + line * cell}%`;
        const style: CSSProperties = across(dir) ? { top: at, height: `${cell}%`, [dir]: 0, width: `${pct}%` } : { left: at, width: `${cell}%`, [dir]: 0, height: `${pct}%` };
        return (
          <span key={line} className="sp-wline" style={style}>
            <span className="sp-wclip">
              <svg className="sp-blades" viewBox={across(dir) ? `0 0 ${u} 1` : `0 0 1 ${u}`} preserveAspectRatio="none">
                {blades(dir, u).map((b, i) => (
                  <polygon key={i} points={b.pts} fill={`url(#${gid}-${b.lit ? 'lit' : 'dark'})`} stroke="#263238" strokeWidth={0.025} strokeLinejoin="round" />
                ))}
              </svg>
            </span>
            {!full && <i className="sp-spark" />}
            {!full && <i className="sp-puff" />}
          </span>
        );
      })}
    </div>
  );
}
