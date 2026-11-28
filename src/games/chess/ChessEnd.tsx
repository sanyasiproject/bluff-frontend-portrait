import { useEffect } from 'react';
import { cx } from '../../lib/cards';
import { confetti, useCountUp } from '../../lib/motion';
import { Backdrop } from '../../components/Overlays';
import type { Color } from './lib';
import type { ChessView } from './contract';
import { END_REASON, perfInfo } from './catalog';

// The game's end: result and reason, my rating change ("800 → 814, +14"), Analyse, Rematch and Continue

export function ChessEnd({ cv, me, nameOf, onAnalyse, onRematch, onDone }: { cv: ChessView; me: Color | null; nameOf: (c: Color) => string; onAnalyse: () => void; onRematch?: () => void; onDone: () => void }) {
  const r = cv.result;
  const winner = r?.winner ?? null;
  const aborted = r?.reason === 'abort';
  const title = aborted ? 'Game aborted' : winner === null ? '½–½ Draw' : me ? (winner === me ? '🏆 You won!' : 'You lost') : `${winner === 'w' ? 'White' : 'Black'} wins`;
  const score = aborted ? '' : winner === null ? '½ – ½' : winner === 'w' ? '1 – 0' : '0 – 1';
  const side = me ?? 'w';
  const before = cv.ratings?.[side]?.r;
  const diff = cv.ratingDiff?.[side];
  const after = before !== undefined && diff !== undefined ? Math.round(before) + diff : undefined;
  const shown = useCountUp(after ?? 0, 900, before !== undefined ? Math.round(before) : 0);
  useEffect(() => {
    if (me && winner === me) confetti(window.innerWidth / 2, window.innerHeight * 0.35, { count: 50 });
  }, []);
  const perf = perfInfo(cv.perf);
  return (
    <Backdrop center onClose={onDone}>
      <div className={cx('confirm-box ch-end', me && winner === me && 'won')}>
        <h3>{title}</h3>
        <p className="ch-end-reason">
          {score && <b>{score}</b>} {r ? (END_REASON[r.reason] ?? r.reason) : ''}
        </p>
        <p className="muted small">{`${nameOf('w')} vs ${nameOf('b')} · ${perf.icon} ${perf.name}${cv.rated ? ' · Rated' : ' · Casual'}`}</p>
        {cv.rated && before !== undefined && (
          <div className="ch-end-rating" aria-label="Rating change">
            {diff === undefined ? (
              <span className="muted">Updating rating…</span>
            ) : (
              <>
                <span>{`${Math.round(before)} → `}</span>
                <b>{shown}</b>
                <span className={cx('ch-rdiff big', diff >= 0 ? 'up' : 'down')}>{`${diff >= 0 ? '+' : ''}${diff}`}</span>
              </>
            )}
          </div>
        )}
        {cv.opening && <p className="muted small" data-no-translate>{`📖 ${cv.opening.eco} ${cv.opening.name}`}</p>}
        <div className="confirm-actions ch-end-actions">
          {!aborted && cv.moves.length > 1 && (
            <button className="btn primary" onClick={onAnalyse}>
              🔍 Analyse
            </button>
          )}
          {onRematch && (
            <button className="btn ghost" onClick={onRematch}>
              🔁 Rematch
            </button>
          )}
          <button className="btn ghost" onClick={onDone}>
            Continue
          </button>
        </div>
      </div>
    </Backdrop>
  );
}
