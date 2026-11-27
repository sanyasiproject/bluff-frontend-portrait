import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { cx } from '../../lib/cards';
import { confetti } from '../../lib/motion';
import type { RoomView } from '../../types';
import { Backdrop } from '../../components/Overlays';
import { initialOf } from './party';

// Game over for Darts, Dots and Boxes and Colour Wars: a podium of colour badges with fireworks, then the game's recap

const MEDAL = ['🥇', '🥈', '🥉', '4th'];

export function PartyPodium({ view, ranking, colorOf, sub, recap, onDone }: { view: RoomView; ranking: string[]; colorOf: (id: string) => string; sub: (id: string) => string; recap: ReactNode; onDone: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const all = [...view.players, ...view.leftPlayers];
  const name = (id: string) => (id === view.meId ? 'You' : (all.find((p) => p.id === id)?.name ?? 'Someone'));
  const winners = new Set(view.winnerIds);

  useEffect(() => {
    if (view.stopped) return;
    const r = box.current?.getBoundingClientRect();
    if (!r) return;
    const timers = [0, 350, 700, 1100].map((ms, i) => window.setTimeout(() => confetti(r.left + r.width * (0.2 + 0.3 * (i % 3)), r.top + 40 + (i % 2) * 30, { count: 34, spread: 1.1 }), ms));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, []);

  const top = ranking.slice(0, 3);
  const stand = [top[1], top[0], top[2]].filter(Boolean);
  return (
    <Backdrop center>
      <div className="reveal ld-podium pg-podium" ref={box}>
        <h3 className="reveal-title">🏁 Game over</h3>
        <div className="ld-stands">
          {stand.map((id) => {
            const i = ranking.indexOf(id);
            return (
              <div
                key={id}
                className={cx('ld-stand', `p${i + 1}`, winners.has(id) && 'won')}
                style={
                  {
                    animationDelay: `${(2 - i) * 160}ms`,
                    '--pc': colorOf(id),
                  } as CSSProperties
                }
              >
                <span className="pg-stand-badge" aria-hidden>
                  {initialOf(all.find((p) => p.id === id)?.name ?? '?')}
                </span>
                <b data-no-translate>{name(id)}</b>
                <small>{sub(id)}</small>
                <span className="ld-block pg-block">{MEDAL[i]}</span>
              </div>
            );
          })}
        </div>
        {ranking.length > 3 && (
          <p className="muted small">
            4th · <span data-no-translate>{name(ranking[3])}</span> · {sub(ranking[3])}
          </p>
        )}
        <div className="ld-recap">{recap}</div>
        <button className="btn primary block shine" onClick={onDone}>
          See results
        </button>
      </div>
    </Backdrop>
  );
}
