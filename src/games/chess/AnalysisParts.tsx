import { useState } from 'react';
import { useTimeouts } from '../../lib/useTimeouts';
import type { Color } from './lib';
import type { Review } from './engine/protocol';

// Analysis pieces: the per-side summary and the PGN copy/share button

const COUNTED = ['inaccuracy', 'mistake', 'blunder'] as const;
export const JUDGE_TONE: Record<string, string> = { inaccuracy: '#f6c453', mistake: '#ff922b', blunder: '#fa5252', best: '#51cf66', good: '#94d82d' };

export function ReviewSummary({ review, names }: { review: Review; names: Record<Color, string> }) {
  return (
    <div className="ch-summary">
      {(['w', 'b'] as Color[]).map((c) => (
        <div key={c} className="ch-sum-side">
          <p className="ch-sum-name">
            <i className={`ch-dot ${c}`} aria-hidden /> <b data-no-translate>{names[c]}</b>
          </p>
          <p className="ch-acc">
            <b>{`${Math.round(review.accuracy[c])}%`}</b>
            <small>accuracy</small>
          </p>
          <p className="ch-sum-row">
            <span>{`${review.acpl[c]} avg loss`}</span>
          </p>
          <p className="ch-sum-row">
            {COUNTED.map((j) => (
              <span key={j} className="ch-sum-count" style={{ color: JUDGE_TONE[j] }}>
                <b>{review.counts[c][j]}</b> <small>{j === 'inaccuracy' ? 'inaccuracies' : `${j}s`}</small>
              </span>
            ))}
          </p>
        </div>
      ))}
    </div>
  );
}

/** shares the PGN where the phone can, else copies it */
export function PgnButton({ pgn }: { pgn: string }) {
  const later = useTimeouts();
  const [done, setDone] = useState<string | null>(null);
  const go = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Chess game', text: pgn });
        return;
      }
      await navigator.clipboard.writeText(pgn);
      setDone('PGN copied');
    } catch {
      try {
        await navigator.clipboard.writeText(pgn);
        setDone('PGN copied');
      } catch {
        setDone('Could not copy');
      }
    }
    later(() => setDone(null), 1800);
  };
  return (
    <button className="btn small ghost ch-pgn" onClick={() => void go()}>
      {done ?? '📋 PGN'}
    </button>
  );
}
