import type { BombView, RoomView } from '../../types';
import { partyColor } from '../dots/party';
import { PartyPodium } from '../dots/PartyPodium';

// Bomb Pass game over: the last one standing first, then by who lasted longest

export function BombPodium({ view, bv, order, onDone }: { view: RoomView; bv: BombView; order: string[]; onDone: () => void }) {
  const all = [...view.players, ...view.leftPlayers];
  const name = (id: string) => (id === view.meId ? 'You' : (all.find((p) => p.id === id)?.name ?? 'Someone'));
  const ranking = [...order].sort((a, b) => (bv.places[a] ?? 99) - (bv.places[b] ?? 99) || (bv.hearts[b] ?? 0) - (bv.hearts[a] ?? 0));
  const sub = (id: string) => ((bv.hearts[id] ?? 0) > 0 ? `${'❤️'.repeat(bv.hearts[id])} left` : '💥 blown up');
  return (
    <PartyPodium
      view={view}
      ranking={ranking}
      colorOf={(id) => partyColor(order, id)}
      sub={sub}
      onDone={onDone}
      recap={
        <>
          <p className="label">💣 Game recap</p>
          <ul>
            <li>{`${bv.round} ${bv.round === 1 ? 'round' : 'rounds'} · ${bv.maxHearts} hearts each · ${bv.speed === 'fast' ? 'fast' : 'normal'} fuse`}</li>
            {view.winnerIds[0] && (
              <li>
                🏆 Last one standing: <b data-no-translate>{name(view.winnerIds[0])}</b>
              </li>
            )}
          </ul>
        </>
      }
    />
  );
}
