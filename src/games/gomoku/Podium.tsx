import type { GomokuView, RoomView } from '../../types';
import { partyColor } from '../dots/party';
import { PartyPodium } from '../dots/PartyPodium';

// Five in a Row game over: the five-maker first, the rest by their longest line, then turn order

export function GomokuPodium({ view, gv, onDone }: { view: RoomView; gv: GomokuView; onDone: () => void }) {
  const order = gv.seats;
  const all = [...view.players, ...view.leftPlayers];
  const name = (id: string) => (id === view.meId ? 'You' : (all.find((p) => p.id === id)?.name ?? 'Someone'));
  const long = (id: string) => gv.best[id] ?? 0;
  const ranking = [...order].sort((a, b) => (gv.places[a] ?? 99) - (gv.places[b] ?? 99) || long(b) - long(a) || order.indexOf(a) - order.indexOf(b));
  const stones = gv.moves;
  return (
    <PartyPodium
      view={view}
      ranking={ranking}
      colorOf={(id) => partyColor(order, id)}
      sub={(id) => (gv.winner === id ? '⚫ Five in a row' : `⚫ Best line ${long(id)}`)}
      onDone={onDone}
      recap={
        <>
          <p className="label">⚫ Game recap</p>
          <ul>
            <li>{`${stones} stones on a ${gv.size}×${gv.size} board`}</li>
            {gv.winner ? (
              <li>
                🏆 Five in a row: <b data-no-translate>{name(gv.winner)}</b>
              </li>
            ) : (
              <li>🤝 The board filled up: a draw</li>
            )}
          </ul>
        </>
      }
    />
  );
}
