import type { RoomView, WordHuntView } from '../../types';
import { partyColor } from '../dots/party';
import { PartyPodium } from '../dots/PartyPodium';

// Word Grid Hunt game over: by total points after every round; ties share a place

export function WordHuntPodium({ view, wv, order, onDone }: { view: RoomView; wv: WordHuntView; order: string[]; onDone: () => void }) {
  const all = [...view.players, ...view.leftPlayers];
  const name = (id: string) => (id === view.meId ? 'You' : (all.find((p) => p.id === id)?.name ?? 'Someone'));
  const pts = (id: string) => wv.scores[id] ?? 0;
  const ranking = [...order].sort((a, b) => (wv.places[a] ?? 99) - (wv.places[b] ?? 99) || pts(b) - pts(a));
  const best = wv.reveal?.best;
  return (
    <PartyPodium
      view={view}
      ranking={ranking}
      colorOf={(id) => partyColor(order, id)}
      sub={(id) => `🔤 ${pts(id)} points`}
      onDone={onDone}
      recap={
        <>
          <p className="label">🔤 Game recap</p>
          <ul>
            <li>{`${wv.rounds} rounds on a ${wv.size}×${wv.size} grid`}</li>
            {best && (
              <li>
                ⭐ Last best word: <b data-no-translate>{`${best.word.toUpperCase()} · ${name(best.playerId)}`}</b>
              </li>
            )}
          </ul>
        </>
      }
    />
  );
}
