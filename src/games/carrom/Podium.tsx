import type { RoomView } from '../../types';
import { partyColor } from '../dots/party';
import { PartyPodium } from '../dots/PartyPodium';
import type { CarromView } from '../../types';

// Carrom game over: players by place (or score), with the match's boards and points

export function CarromPodium({ view, cv, order, onDone }: { view: RoomView; cv: CarromView; order: string[]; onDone: () => void }) {
  const all = [...view.players, ...view.leftPlayers];
  const name = (id: string) => (id === view.meId ? 'You' : (all.find((p) => p.id === id)?.name ?? 'Someone'));
  const ranking = [...order].sort((a, b) => (cv.places[a] ?? 99) - (cv.places[b] ?? 99) || (cv.scores[b] ?? 0) - (cv.scores[a] ?? 0));
  const sub = (id: string) => `${cv.scores[id] ?? 0} pts · ${(cv.pocketed[id] ?? []).length} 🪙`;
  return (
    <PartyPodium
      view={view}
      ranking={ranking}
      colorOf={(id) => partyColor(order, id)}
      sub={sub}
      onDone={onDone}
      recap={
        <>
          <p className="label">🎯 Game recap</p>
          <ul>
            <li>{`${cv.mode === 'classic' ? 'Classic' : 'Freestyle'} · ${cv.results.length || cv.board} ${(cv.results.length || cv.board) === 1 ? 'board' : 'boards'} played`}</li>
            {cv.results.map((r) => (
              <li key={r.board} data-no-translate>{`Board ${r.board}: ${r.winners.map(name).join(' & ')} +${r.points}`}</li>
            ))}
            {view.winnerIds[0] && (
              <li>
                🏆 Winner: <b data-no-translate>{view.winnerIds.map(name).join(' & ')}</b>
              </li>
            )}
          </ul>
          <p className="muted small">{ranking.map((id) => `${name(id)} ${cv.scores[id] ?? 0}`).join(' · ')}</p>
        </>
      }
    />
  );
}
