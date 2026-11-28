import type { RoomView, UtttView } from '../../types';
import { partyColor } from '../dots/party';
import { PartyPodium } from '../dots/PartyPodium';

// Ultimate Tic-Tac-Toe game over: the winner first, else by small boards won

export function UtttPodium({ view, uv, order, onDone }: { view: RoomView; uv: UtttView; order: string[]; onDone: () => void }) {
  const all = [...view.players, ...view.leftPlayers];
  const name = (id: string) => (id === view.meId ? 'You' : (all.find((p) => p.id === id)?.name ?? 'Someone'));
  const markOf = (id: string) => (id === uv.x ? 'X' : 'O');
  const won = (id: string) => uv.boards.filter((b) => b === markOf(id)).length;
  const ranking = [...order].sort((a, b) => (a === uv.winner ? -1 : b === uv.winner ? 1 : won(b) - won(a)));
  return (
    <PartyPodium
      view={view}
      ranking={ranking}
      colorOf={(id) => partyColor(order, id)}
      sub={(id) => `${markOf(id) === 'O' ? '◯' : '✕'} ${won(id)} ${won(id) === 1 ? 'board' : 'boards'}`}
      onDone={onDone}
      recap={
        <>
          <p className="label">#️⃣ Game recap</p>
          <ul>
            <li>{`${uv.cells.filter(Boolean).length} marks · ${uv.boards.filter((b) => b === 'draw').length} tied boards`}</li>
            {uv.winner ? (
              <li>
                🏆 Three boards in a line: <b data-no-translate>{name(uv.winner)}</b>
              </li>
            ) : (
              <li>🤝 No big line: a draw</li>
            )}
          </ul>
        </>
      }
    />
  );
}
