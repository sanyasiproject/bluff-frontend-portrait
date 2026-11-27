import type { DartsView, RoomView } from '../../types';
import { partyColor } from '../dots/party';
import { PartyPodium } from '../dots/PartyPodium';

// Darts game over: finishers by place, the rest by fewest points left; recap of the room's best throws

export function DartsPodium({ view, dv, order, onDone }: { view: RoomView; dv: DartsView; order: string[]; onDone: () => void }) {
  const all = [...view.players, ...view.leftPlayers];
  const name = (id: string) => (id === view.meId ? 'You' : (all.find((p) => p.id === id)?.name ?? 'Someone'));
  const ranking = [...order].sort((a, b) => (dv.places[a] ?? 99) - (dv.places[b] ?? 99) || (dv.left[a] ?? dv.start) - (dv.left[b] ?? dv.start));
  const sub = (id: string) => (dv.places[id] ? '🎯 Checked out' : `${dv.left[id] ?? dv.start} left`);
  const best = [...ranking].sort((a, b) => (dv.left[a] ?? dv.start) - (dv.left[b] ?? dv.start));
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
            <li>{`Started at ${dv.start}; land exactly on 0 to finish.`}</li>
            {view.winnerIds[0] && (
              <li>
                🏆 First out: <b data-no-translate>{name(view.winnerIds[0])}</b>
              </li>
            )}
          </ul>
          <p className="muted small">{best.map((id) => `${name(id)} ${dv.places[id] ? '✅' : (dv.left[id] ?? dv.start)}`).join(' · ')}</p>
        </>
      }
    />
  );
}
