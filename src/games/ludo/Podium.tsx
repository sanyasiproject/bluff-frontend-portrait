import { useEffect, useRef } from 'react';
import { cx } from '../../lib/cards';
import { confetti } from '../../lib/motion';
import type { LudoView, RoomView } from '../../types';
import { Backdrop } from '../../components/Overlays';
import { Goti } from './Goti';

// Game over, first the Ludo moment: the finish-order podium with fireworks and the kill recap, then the usual results

const MEDAL = ['🥇', '🥈', '🥉', '4th'];

export function Podium({ view, ld, gotiStyle, onDone }: { view: RoomView; ld: LudoView; gotiStyle: string; onDone: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const name = (id: string) => (id === view.meId ? 'You' : ([...view.players, ...view.leftPlayers].find((p) => p.id === id)?.name ?? 'Someone'));
  // finishers by place; Timed mode and the unfinished by points, then gotis home
  const order = [...ld.seats].sort((a, b) => (a.place ?? 99) - (b.place ?? 99) || b.score - a.score || b.home - a.home);
  const winners = new Set(view.winnerIds);

  // fireworks: a few bursts across the top of the box
  useEffect(() => {
    if (view.stopped) return;
    const r = box.current?.getBoundingClientRect();
    if (!r) return;
    const timers = [0, 350, 700, 1100].map((ms, i) =>
      window.setTimeout(() => confetti(r.left + r.width * (0.2 + 0.3 * (i % 3)), r.top + 40 + (i % 2) * 30, { count: 34, spread: 1.1 }), ms),
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, []);

  // who knocked whom, most first
  const pairs = new Map<string, number>();
  for (const k of ld.kills) pairs.set(`${k.by}|${k.victim}`, (pairs.get(`${k.by}|${k.victim}`) ?? 0) + 1);
  const recap = [...pairs.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const top = order.slice(0, 3);
  // podium order on screen: 2nd, 1st, 3rd
  const stand = [top[1], top[0], top[2]].filter(Boolean);

  return (
    <Backdrop center>
      <div className="reveal ld-podium" ref={box}>
        <h3 className="reveal-title">{ld.mode === 'timed' && ld.endsAt && Date.now() >= ld.endsAt ? "⏱ Time's up" : '🏁 Game over'}</h3>
        <div className="ld-stands">
          {stand.map((s) => {
            const i = order.indexOf(s);
            return (
              <div key={s.playerId} className={cx('ld-stand', `p${i + 1}`, winners.has(s.playerId) && 'won')} style={{ animationDelay: `${(2 - i) * 160}ms` }}>
                <span className="ld-stand-goti">
                  <Goti color={s.color} style={gotiStyle} id={`pod-${s.color}`} />
                </span>
                <b data-no-translate>{name(s.playerId)}</b>
                <small>{ld.mode === 'timed' ? `${s.score} pts` : `🏠 ${s.home}/4`}</small>
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
          <p className="label">💥 Kill recap</p>
          {recap.length === 0 ? (
            <p className="muted small">No goti was knocked off. A peaceful game!</p>
          ) : (
            <ul>
              {recap.map(([pair, n]) => {
                const [by, victim] = pair.split('|');
                return (
                  <li key={pair}>
                    <b data-no-translate>{name(by)}</b> knocked off <b data-no-translate>{name(victim)}</b>
                    {n > 1 && <span className="ld-times"> ×{n}</span>}
                  </li>
                );
              })}
            </ul>
          )}
          <p className="muted small">{order.map((s) => `${name(s.playerId)} 💥${s.kills}`).join(' · ')}</p>
        </div>
        <button className="btn primary block shine" onClick={onDone}>
          See results
        </button>
      </div>
    </Backdrop>
  );
}
