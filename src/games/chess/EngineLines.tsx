import { cx } from '../../lib/cards';
import { evalText, type EngineLine } from './engine/protocol';

// The engine's top lines: eval, depth and the moves in SAN (watchers live; analysis for the shown move)

export function EngineLines({ lines, done, max = 3, title = '🧠 Engine', moveNo }: { lines: EngineLine[]; done: boolean; max?: number; title?: string; moveNo?: { n: number; black: boolean } }) {
  const depth = lines[0]?.depth;
  return (
    <div className="ch-lines" aria-live="polite">
      <p className="ch-lines-head">
        <b>{title}</b>
        <span className={cx('ch-depth', !done && 'thinking')}>{lines.length ? `depth ${depth}${done ? '' : '…'}` : 'thinking…'}</span>
      </p>
      {lines.slice(0, max).map((l, i) => (
        <p key={i} className="ch-line">
          <b className={cx('ch-eval', (l.mate ?? l.cp ?? 0) >= 0 ? 'w' : 'b')}>{evalText(l)}</b>
          <span className="ch-pv" data-no-translate>
            {l.sans.slice(0, 8).map((s, j) => {
              const ply = moveNo ? (moveNo.black ? 1 : 0) + j : j;
              const num = moveNo && (ply % 2 === 0 || j === 0) ? `${moveNo.n + Math.floor(ply / 2)}.${ply % 2 ? '..' : ''} ` : '';
              return <span key={j}>{`${num}${s} `}</span>;
            })}
          </span>
        </p>
      ))}
      {!lines.length && Array.from({ length: Math.min(max, 3) }, (_, i) => <p key={i} className="ch-line ghost" />)}
    </div>
  );
}
