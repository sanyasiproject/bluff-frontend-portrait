import { useMemo } from 'react';
import { useNow } from '../lib/useNow';
import type { RoomView } from '../types';

/** offline in a room: a pill in the lobby, a dimmed table with a held-seat card in a game */
export function ConnOverlay({ view }: { view: RoomView }) {
  if (view.phase === 'lobby') return <div className="conn-pill">Reconnecting…</div>;
  const seated = view.players.some((p) => p.id === view.meId);
  return (
    <div className="conn-overlay" role="status" aria-live="polite">
      <div className="conn-card">
        <span className="conn-spin" aria-hidden />
        <b>Reconnecting…</b>
        {seated && <span className="muted small">Your seat is held</span>}
      </div>
    </div>
  );
}

/** other players whose phone dropped mid-game: "seat held 0:45" until they're back or forfeit */
export function SeatHeld({ view }: { view: RoomView }) {
  // each view carries the ms left when it was sent; turned into this phone's clock once per view
  const ends = useMemo(() => {
    const at = Date.now();
    return view.players
      .filter((p) => p.id !== view.meId && !p.connected && typeof p.seatMsLeft === 'number')
      .map((p) => ({ id: p.id, name: p.name, endsAt: at + (p.seatMsLeft as number) }));
  }, [view]);
  const now = useNow(1000);
  if (view.phase !== 'playing' || !ends.length) return null;
  return (
    <div className="seat-held" role="status" aria-live="polite">
      {ends.map((p) => {
        const left = Math.max(0, Math.ceil((p.endsAt - now) / 1000));
        const text = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
        return (
          <span key={p.id} className={left <= 15 ? 'low' : undefined}>
            {`⏳ ${p.name} offline · seat held ${text}`}
          </span>
        );
      })}
    </div>
  );
}
