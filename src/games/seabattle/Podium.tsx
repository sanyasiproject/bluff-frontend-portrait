import type { RoomView, SeaView } from '../../types';
import { partyColor } from '../dots/party';
import { PartyPodium } from '../dots/PartyPodium';

// Sea Battle game over: the last fleet afloat first, then by ships left

export function SeaPodium({ view, sv, order, onDone }: { view: RoomView; sv: SeaView; order: string[]; onDone: () => void }) {
  const all = [...view.players, ...view.leftPlayers];
  const name = (id: string) => (id === view.meId ? 'You' : (all.find((p) => p.id === id)?.name ?? 'Someone'));
  const left = (id: string) => sv.seas[id]?.afloat.length ?? 0;
  const ranking = [...order].sort((a, b) => (sv.places[a] ?? 99) - (sv.places[b] ?? 99) || left(b) - left(a));
  const sub = (id: string) => (left(id) > 0 ? `🚢 ${left(id)} afloat` : '🌊 sunk');
  return (
    <PartyPodium
      view={view}
      ranking={ranking}
      colorOf={(id) => partyColor(order, id)}
      sub={sub}
      onDone={onDone}
      recap={
        <>
          <p className="label">⚓ Game recap</p>
          <ul>
            <li>{`${order.length} fleets · powers ${sv.powers ? 'on' : 'off'}`}</li>
            {view.winnerIds[0] && (
              <li>
                🏆 Last fleet afloat: <b data-no-translate>{name(view.winnerIds[0])}</b>
              </li>
            )}
          </ul>
        </>
      }
    />
  );
}
