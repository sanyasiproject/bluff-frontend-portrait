import { useEffect, useRef } from 'react';
import { cx } from '../../lib/cards';
import { confetti } from '../../lib/motion';
import { RMCS_EMOJI, type RmcsView, type RoomView } from '../../types';
import { Backdrop } from '../../components/Overlays';

// Game over: the score podium (ties share a place) with fireworks, and every round's chits

const MEDAL = ['🥇', '🥈', '🥉', '4th'];

export function RmcsPodium({ view, rm, onDone }: { view: RoomView; rm: RmcsView; onDone: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const all = [...view.players, ...view.leftPlayers];
  const name = (id: string) => (id === view.meId ? 'You' : (all.find((p) => p.id === id)?.name ?? 'Someone'));
  const ids = Object.keys(rm.scores);
  const order = [...ids].sort((a, b) => (rm.scores[b] ?? 0) - (rm.scores[a] ?? 0));
  // equal totals share a place
  const placeOf = (id: string) => 1 + order.filter((o) => (rm.scores[o] ?? 0) > (rm.scores[id] ?? 0)).length;

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
  // podium order on screen: 2nd, 1st, 3rd
  const stand = [top[1], top[0], top[2]].filter(Boolean);
  const cols = order;

  return (
    <Backdrop center>
      <div className="reveal rm-podium" ref={box}>
        <h3 className="reveal-title">🏁 Game over</h3>
        <div className="rm-stands">
          {stand.map((id) => {
            const place = placeOf(id);
            return (
              <div key={id} className={cx('rm-stand', `p${Math.min(place, 3)}`, place === 1 && 'won')} style={{ animationDelay: `${(3 - place) * 160}ms` }}>
                <span className="rm-stand-face" aria-hidden>
                  {place === 1 ? '👑' : place === 2 ? '🧐' : '👮'}
                </span>
                <b data-no-translate>{name(id)}</b>
                <small>{(rm.scores[id] ?? 0).toLocaleString('en-IN')}</small>
                <span className="rm-block">{MEDAL[place - 1]}</span>
              </div>
            );
          })}
        </div>
        {order.length > 3 && (
          <p className="muted small">
            {MEDAL[placeOf(order[3]) - 1]} · <span data-no-translate>{name(order[3])}</span> {(rm.scores[order[3]] ?? 0).toLocaleString('en-IN')}
          </p>
        )}
        <div className="rm-history">
          <p className="label">📜 Every round</p>
          <table>
            <thead>
              <tr>
                <th>#</th>
                {cols.map((id) => (
                  <th key={id} data-no-translate>
                    {name(id)}
                  </th>
                ))}
                <th aria-label="Mantri's guess">🧐</th>
              </tr>
            </thead>
            <tbody>
              {rm.history.map((h) => (
                <tr key={h.round}>
                  <td>{h.round}</td>
                  {cols.map((id) => (
                    <td key={id}>
                      <span aria-hidden>{h.roles[id] ? RMCS_EMOJI[h.roles[id]] : ''}</span> {h.points[id] ?? 0}
                    </td>
                  ))}
                  <td>{h.correct ? '✅' : '❌'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button className="btn primary block shine" onClick={onDone}>
          See results
        </button>
      </div>
    </Backdrop>
  );
}
