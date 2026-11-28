import { useEffect, useRef, type CSSProperties } from 'react';
import { cx } from '../../lib/cards';
import { confettiAt } from '../../lib/motion';
import { sfx } from '../../lib/sounds';
import type { WordHuntView } from '../../types';

// Word Grid Hunt round end: everyone's words in columns, unique ones starred, the best word, missed long words

export function WordReveal({ wv, order, colorOf, name, meId, secsLeft, onNext }: {
  wv: WordHuntView;
  order: string[];
  colorOf: (id: string) => string;
  name: (id: string) => string;
  meId: string;
  secsLeft: number;
  /** the last round: a button on to the final scores */
  onNext?: () => void;
}) {
  const r = wv.reveal;
  const best = useRef<HTMLDivElement>(null);
  useEffect(() => {
    sfx.wordReveal();
    if (r?.best) window.setTimeout(() => confettiAt(best.current, { count: r.best?.playerId === meId ? 50 : 26, spread: 1 }), 350);
  }, [r?.round]);
  if (!r) return null;
  const last = wv.round >= wv.rounds;
  return (
    <div className="wh-reveal" role="dialog" aria-label={`Round ${r.round} words`}>
      <p className="wh-reveal-title">{`Round ${r.round} of ${wv.rounds}`}</p>
      {r.best && (
        <div ref={best} className="wh-best" style={{ '--pc': colorOf(r.best.playerId) } as CSSProperties}>
          <small>⭐ Best word</small>
          <b data-no-translate>{r.best.word.toUpperCase()}</b>
          <span>
            <span data-no-translate>{name(r.best.playerId)}</span>
            {` · +${r.best.points}`}
          </span>
        </div>
      )}
      <div className={cx('wh-cols', `n${order.length}`)}>
        {order.map((id) => (
          <div key={id} className={cx('wh-col', id === meId && 'mine')} style={{ '--pc': colorOf(id) } as CSSProperties}>
            <p className="wh-col-head">
              <span data-no-translate>{name(id)}</span>
              <b>{`+${r.points[id] ?? 0}`}</b>
            </p>
            <ul>
              {(r.words[id] ?? []).map((w) => (
                <li key={w.word} className={cx(w.unique && 'unique')} data-no-translate>
                  {w.unique && <i aria-label="only you">★</i>}
                  {w.word}
                  <small>{`+${w.points}`}</small>
                </li>
              ))}
              {(r.words[id] ?? []).length === 0 && <li className="none">No words</li>}
            </ul>
          </div>
        ))}
      </div>
      {r.missed.length > 0 && (
        <p className="wh-missed">
          <span>🔎 Missed: </span>
          <b data-no-translate>{r.missed.slice(0, 5).join(' · ')}</b>
        </p>
      )}
      {onNext ? (
        <button className="btn primary wh-next-btn" onClick={onNext}>
          See final scores
        </button>
      ) : (
        <p className="wh-next">{last ? 'Final scores next…' : `Next round in ${secsLeft}s`}</p>
      )}
    </div>
  );
}
