import { useState } from 'react';
import { formatCoins } from '../../lib/coins';
import type { RoomView } from '../../types';
import type { Actions } from '../../useBluff';
import { Avatar } from '../../components/Avatar';
import { LevelBadge } from '../../components/LevelBadge';
import { Backdrop, PlayersSheet } from '../../components/Overlays';
import { GameMenu } from '../../components/Table';

export type Panel = 'menu' | 'people' | 'requests' | 'looks' | null;

// The game menu and its confirms (stop, leave, remove) and the watch requests, as on the other tables

export function LudoMenus({ view, actions, panel, setPanel, sound, onToggleSound }: { view: RoomView; actions: Actions; panel: Panel; setPanel: (p: Panel) => void; sound: boolean; onToggleSound: () => void }) {
  const [confirm, setConfirm] = useState<'stop' | 'leave' | null>(null);
  const [kick, setKick] = useState<{ id: string; name: string } | null>(null);
  const me = view.players.find((p) => p.id === view.meId);
  const isHost = view.hostId === view.meId;
  const hostOffline = ![...view.players, ...view.watchers].find((p) => p.id === view.hostId)?.connected;
  const playing = view.phase === 'playing';

  return (
    <>
      {panel === 'menu' && (
        <GameMenu
          view={view}
          sound={sound}
          onToggleSound={onToggleSound}
          onPeople={isHost ? () => setPanel('people') : undefined}
          onStop={(isHost || hostOffline) && playing ? () => (setPanel(null), setConfirm('stop')) : undefined}
          onLeave={!me ? () => (setPanel(null), void actions.leave()) : playing ? () => (setPanel(null), setConfirm('leave')) : undefined}
          onClose={() => setPanel(null)}
        />
      )}
      {confirm === 'stop' && playing && (
        <Backdrop center onClose={() => setConfirm(null)}>
          <div className="confirm-box">
            <h3>Stop this game for everyone?</h3>
            <p className="muted">Nobody wins or loses and no coins move. Everyone goes back to the lobby.</p>
            <div className="confirm-actions">
              <button className="btn ghost" onClick={() => setConfirm(null)}>
                Keep playing
              </button>
              <button className="btn danger" onClick={() => (setConfirm(null), void actions.toLobby())}>
                Stop game
              </button>
            </div>
          </div>
        </Backdrop>
      )}
      {confirm === 'leave' && playing && (
        <Backdrop center onClose={() => setConfirm(null)}>
          <div className="confirm-box">
            <h3>Leave this game?</h3>
            <p className="muted">
              Your gotis leave the board and it counts as a loss
              {view.config.stake > 0 ? `; you still pay your 🪙 ${formatCoins(view.config.stake)} stake` : ''}.
            </p>
            <div className="confirm-actions">
              <button className="btn ghost" onClick={() => setConfirm(null)}>
                Stay
              </button>
              <button className="btn danger" onClick={() => (setConfirm(null), void actions.leave())}>
                Leave game
              </button>
            </div>
          </div>
        </Backdrop>
      )}
      {kick && (
        <Backdrop center onClose={() => setKick(null)}>
          <div className="confirm-box">
            <h3>Remove {kick.name}?</h3>
            <p className="muted">
              {playing && view.players.some((p) => p.id === kick.id)
                ? "Their gotis leave the board and they won't pay or win coins. With only one player left the game stops."
                : 'They leave the room.'}
            </p>
            <div className="confirm-actions">
              <button className="btn ghost" onClick={() => setKick(null)}>
                Cancel
              </button>
              <button className="btn danger" onClick={() => (setKick(null), void actions.kick(kick.id))}>
                Remove
              </button>
            </div>
          </div>
        </Backdrop>
      )}
      {panel === 'requests' && (
        <Backdrop onClose={() => setPanel(null)}>
          <h3>👀 Want to watch</h3>
          <p className="muted small">They joined after the game started. Let them in to watch; they play from the next game.</p>
          {view.watchRequests.length === 0 && <p className="muted small">No one is waiting.</p>}
          <ul className="player-list">
            {view.watchRequests.map((r) => (
              <li key={r.id} className="player-row">
                <Avatar name={r.name} size="sm" />
                <span className="grow">
                  {r.name} {r.registered ? <LevelBadge level={r.level} /> : <span className="muted small">guest</span>}
                </span>
                <button className="btn small ghost" onClick={() => void actions.admit(r.id, false)}>
                  No
                </button>
                <button className="btn small primary" onClick={() => void actions.admit(r.id, true)}>
                  Let in
                </button>
              </li>
            ))}
          </ul>
          <button className="btn ghost block" onClick={() => setPanel(null)}>
            Close
          </button>
        </Backdrop>
      )}
      {panel === 'people' && (
        <PlayersSheet
          view={view}
          onRemove={(id, who) => {
            setPanel(null);
            setKick({ id, name: who });
          }}
          onClose={() => setPanel(null)}
        />
      )}
    </>
  );
}
