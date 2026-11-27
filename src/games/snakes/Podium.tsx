import { useEffect, useRef } from 'react';
import { cx } from '../../lib/cards';
import { confetti } from '../../lib/motion';
import type { RoomView, SnakesView } from '../../types';
import { Backdrop } from '../../components/Overlays';
import { Goti } from '../ludo/Goti';

// Game over, first the Saanp Seedhi moment: the finish-order podium with fireworks and each player's ladders, snakes and bites

const MEDAL = ['🥇', '🥈', '🥉', '4th'];

export function SnakesPodium({ view, sv, styleOf, onDone }: { view: RoomView; sv: SnakesView; styleOf: (playerId: string) => string; onDone: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const name = (id: string) => (id === view.meId ? 'You' : ([...view.players, ...view.leftPlayers].find((p) => p.id === id)?.name ?? 'Someone'));
  // finishers by place, the rest by how far they got
  const order = [...sv.seats].sort((a, b) => (a.place ?? 99) - (b.place ?? 99) || b.pos - a.pos);
  const winners = new Set(view.winnerIds);

  useEffect(() => {
    if (view.stopped) return;
    const r = box.current?.getBoundingClientRect();
    if (!r) return;
    const timers = [0, 350, 700, 1100].map((ms, i) =>
      window.setTimeout(() => confetti(r.left + r.width * (0.2 + 0.3 * (i % 3)), r.top + 40 + (i % 2) * 30, { count: 34, spread: 1.1 }), ms),
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, []);

  const top = order.slice(0, 3);
  const stand = [top[1], top[0], top[2]].filter(Boolean);
  const most = (key: 'ladders' | 'snakes' | 'bites') => [...sv.seats].sort((a, b) => b[key] - a[key])[0];
  const climber = most('ladders');
  const bitten = most('snakes');
  const biter = most('bites');

  return (
    <Backdrop center>
      <div className="reveal ld-podium sn-podium" ref={box}>
        <h3 className="reveal-title">🏁 Game over</h3>
        <div className="ld-stands">
          {stand.map((s) => {
            const i = order.indexOf(s);
            return (
              <div key={s.playerId} className={cx('ld-stand', `p${i + 1}`, winners.has(s.playerId) && 'won')} style={{ animationDelay: `${(2 - i) * 160}ms` }}>
                <span className={`ld-stand-goti goti-${styleOf(s.playerId)}`}>
                  <Goti color={s.color} style={styleOf(s.playerId)} id={`snpod-${s.playerId}`} />
                </span>
                <b data-no-translate>{name(s.playerId)}</b>
                <small>{s.place ? '💯 100' : `📍 ${s.pos}`}</small>
                <span className={`ld-block ld-${s.color}`}>{MEDAL[i]}</span>
              </div>
            );
          })}
        </div>
        {order.length > 3 && (
          <p className="muted small">
            4th · <span data-no-translate>{name(order[3].playerId)}</span>
          </p>
        )}
        <div className="ld-recap">
          <p className="label">🐍 Game recap</p>
          <ul>
            {climber && climber.ladders > 0 && (
              <li>
                🪜 Top climber: <b data-no-translate>{name(climber.playerId)}</b> ×{climber.ladders}
              </li>
            )}
            {bitten && bitten.snakes > 0 && (
              <li>
                🐍 Snake food: <b data-no-translate>{name(bitten.playerId)}</b> ×{bitten.snakes}
              </li>
            )}
            {biter && biter.bites > 0 && (
              <li>
                😬 Biggest biter: <b data-no-translate>{name(biter.playerId)}</b> ×{biter.bites}
              </li>
            )}
          </ul>
          <p className="muted small">{order.map((s) => `${name(s.playerId)} 🪜${s.ladders} 🐍${s.snakes}`).join(' · ')}</p>
        </div>
        <button className="btn primary block shine" onClick={onDone}>
          See results
        </button>
      </div>
    </Backdrop>
  );
}
