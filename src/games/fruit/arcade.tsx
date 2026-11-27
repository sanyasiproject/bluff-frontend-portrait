import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { cx } from '../../lib/cards';
import { confetti } from '../../lib/motion';
import { PARTY_COLORS, type PublicPlayer, type RoomView } from '../../types';
import type { ChatBubble } from '../../useBluff';
import { Avatar } from '../../components/Avatar';
import { Backdrop } from '../../components/Overlays';
import { Seat } from '../../components/Table';
import '../../styles/arcade.css';

// Shared by the real-time arcade tables (Fruit Slice Duel, Spike Attack): the seat strip and the podium

const BUBBLE_MS = 4000;

/** a player's colour: their seat order in the room (left players keep theirs) */
export function partyColor(view: RoomView, id: string): string {
  const i = view.players.findIndex((p) => p.id === id);
  return PARTY_COLORS[(i < 0 ? 0 : i) % PARTY_COLORS.length];
}

/** everyone's seats in one row across the top, in their colour */
export function SeatStrip({
  view,
  bubbles,
  tagOf,
  extraOf,
  onTarget,
  seatEls,
}: {
  view: RoomView;
  bubbles: ChatBubble[];
  tagOf: (p: PublicPlayer) => ReactNode;
  extraOf?: (p: PublicPlayer) => string | false | undefined;
  onTarget: (id: string) => void;
  seatEls: React.MutableRefObject<Map<string, HTMLElement>>;
}) {
  const fresh = bubbles.filter((b) => Date.now() - b.at < BUBBLE_MS);
  const bubbleOf = (id: string) => [...fresh].reverse().find((b) => b.from === id) ?? null;
  return (
    <div className={cx('ar-seats', `n${Math.min(4, view.players.length)}`)}>
      {view.players.slice(0, 4).map((p) => (
        <div key={p.id} className="ar-seat-wrap" style={{ '--pc': partyColor(view, p.id) } as CSSProperties}>
          <Seat
            player={p}
            turn={false}
            passed={false}
            bubble={bubbleOf(p.id)}
            onClick={p.id === view.meId ? undefined : () => onTarget(p.id)}
            label={`Throw an emoji at ${p.name}`}
            extra={cx('ar-seat', p.id === view.meId && 'ar-me', extraOf?.(p))}
            tag={tagOf(p)}
            seatRef={(el) => {
              if (el) seatEls.current.set(p.id, el);
              else seatEls.current.delete(p.id);
            }}
          />
        </div>
      ))}
    </div>
  );
}

export interface PodiumRow {
  id: string;
  place: number;
  /** the big number under the name */
  main: string;
}

const MEDAL = ['🥇', '🥈', '🥉', '4th'];

/** game over, first the arcade moment: stands by place with fireworks, then a short recap */
export function ArcadePodium({ view, rows, recap, title, onDone }: { view: RoomView; rows: PodiumRow[]; recap: ReactNode; title: string; onDone: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const all = [...view.players, ...view.leftPlayers];
  const name = (id: string) => (id === view.meId ? 'You' : (all.find((p) => p.id === id)?.name ?? 'Someone'));
  const order = [...rows].sort((a, b) => a.place - b.place);
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
  return (
    <Backdrop center>
      <div className="reveal ar-podium" ref={box}>
        <h3 className="reveal-title">{title}</h3>
        <div className="ar-stands">
          {stand.map((s) => {
            const i = Math.min(3, s.place - 1);
            const p = view.players.find((x) => x.id === s.id);
            const who = all.find((x) => x.id === s.id);
            return (
              <div
                key={s.id}
                className={cx('ar-stand', `p${i + 1}`, winners.has(s.id) && 'won')}
                style={{ '--pc': partyColor(view, s.id), animationDelay: `${(2 - i) * 160}ms` } as CSSProperties}
              >
                <Avatar name={who?.name ?? '?'} avatar={p?.avatar ?? null} bot={p?.bot} />
                <b data-no-translate>{name(s.id)}</b>
                <small>{s.main}</small>
                <span className="ar-block">{MEDAL[i]}</span>
              </div>
            );
          })}
        </div>
        {order.length > 3 && (
          <p className="muted small">
            {MEDAL[Math.min(3, order[3].place - 1)]} · <span data-no-translate>{name(order[3].id)}</span> · {order[3].main}
          </p>
        )}
        <div className="ar-recap">{recap}</div>
        <button className="btn primary block shine" onClick={onDone}>
          See results
        </button>
      </div>
    </Backdrop>
  );
}

/** places from scores: highest first, equal scores share */
export function placesByScore(ids: string[], score: (id: string) => number): Record<string, number> {
  const out: Record<string, number> = {};
  const sorted = [...ids].sort((a, b) => score(b) - score(a));
  sorted.forEach((id, i) => (out[id] = i > 0 && score(id) === score(sorted[i - 1]) ? out[sorted[i - 1]] : i + 1));
  return out;
}
