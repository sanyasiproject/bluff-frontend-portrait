import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useTimeouts } from '../../lib/useTimeouts';
import { cx } from '../../lib/cards';
import { sfx } from '../../lib/sounds';
import { COLORWAR_FIRST, type ColorWarView } from '../../types';
import { useOnChange } from '../../components/Table';
import { useTurnEndsAt } from '../../components/TurnTimer';
import type { PluggedTableProps } from '../registry';
import { PartyChips, PartyEnd, partyColor, partyOrder, PartyStrip, PartyTopbar, usePartyTable, type PartyToast } from '../dots/party';
import { PartyPodium } from '../dots/PartyPodium';
import { CwBoard } from './Board';
import { useBursts } from './useBursts';
import '../../styles/ludo.css';
import '../../styles/pgames.css';
import '../../styles/colorwar.css';

type Toast = PartyToast;

export function ColorWarTable(props: PluggedTableProps) {
  const cv = props.view.plugged?.kind === 'colorwar' ? props.view.plugged.colorwar : null;
  if (!cv) return <main className="screen center-screen">Setting up the board…</main>;
  return <ColorWarInner {...props} cv={cv} />;
}

function ColorWarInner({ view, actions, bubbles, auth, cv }: PluggedTableProps & { cv: ColorWarView }) {
  const later = useTimeouts();
  const t = usePartyTable(view);
  const order = partyOrder(view);
  const colorOf = (id: string | null | undefined) => partyColor(order, id);
  const turnEndsAt = useTurnEndsAt(view);
  const myTurn = t.playing && cv.turnId === view.meId;
  const frame = useBursts(cv);
  const cells = frame?.cells ?? cv.cells;
  const [sent, setSent] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const seq = useRef(0);
  // a big combo number that bursts out of the board's middle, never catching taps
  const [chain, setChain] = useState<{ key: number; n: number } | null>(null);
  useEffect(() => {
    if (!chain) return;
    const id = window.setTimeout(() => setChain(null), 1400);
    return () => window.clearTimeout(id);
  }, [chain]);
  const say = (text: string, tone: Toast['tone']) => setToast({ key: ++seq.current, text, tone });
  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 1700);
    return () => window.clearTimeout(id);
  }, [toast]);

  const count = (id: string) => cv.cells.filter((c) => c.owner === id).length;
  const firstMove = cv.firstMove.includes(view.meId);

  // a move landed; a big chain gets a cheer
  useOnChange(cv.last?.seq ?? null, () => {
    setSent(false);
    const last = cv.last;
    if (!last) return;
    const bursts = last.waves.reduce((s, w) => s + w.length, 0);
    if (bursts >= 3) later(() => say(`CHAIN ×${bursts}!`, bursts >= 6 ? 'gold' : 'good'), 400);
    if (last.playerId === view.meId && bursts > 0) navigator.vibrate?.(Math.min(200, 30 * bursts));
    setChain(bursts >= 3 ? { key: last.seq, n: bursts } : null);
  });
  // someone has no cells left: they're out
  const prevAlive = useRef(cv.alive);
  useEffect(() => {
    const gone = prevAlive.current.filter((id) => !cv.alive.includes(id));
    prevAlive.current = cv.alive;
    if (!gone.length || !t.playing) return;
    const id = window.setTimeout(
      () => {
        sfx.cwOut();
        say(`💀 ${gone.map((g) => t.name(g)).join(' & ')} ${gone.length > 1 || gone[0] === view.meId ? 'are' : 'is'} out!`, 'bad');
      },
      frame ? 900 : 100,
    );
    return () => window.clearTimeout(id);
  }, [cv.alive.join(',')]);
  useOnChange(myTurn ? `${cv.turnId}:${cv.last?.seq ?? 0}` : null, (k) => {
    if (!k) return;
    sfx.turn();
    if (navigator.userActivation?.hasBeenActive) navigator.vibrate?.(100);
  });
  useEffect(() => {
    if (!sent) return;
    const id = window.setTimeout(() => setSent(false), 4000);
    return () => window.clearTimeout(id);
  }, [sent]);

  const canTap = myTurn && !t.busy && !sent && !frame;
  const valid = (i: number) => canTap && (firstMove ? cv.cells[i].owner === null : cv.cells[i].owner === view.meId);
  const tap = (cell: number) => {
    if (!valid(cell)) return;
    setSent(true);
    navigator.vibrate?.(12);
    void t.act(() => actions.gameMove({ kind: 'colorwar', move: { type: 'tap', cell } }));
  };

  const total = cv.size * cv.size;
  const status = !t.playing
    ? ''
    : myTurn
      ? sent || frame
        ? 'Boom…'
        : firstMove
          ? `Your turn! Tap any empty cell (${COLORWAR_FIRST} dots)`
          : 'Your turn! Tap your cell to add a dot'
      : `${t.name(cv.turnId)} ${cv.turnId === view.meId ? 'are' : 'is'} thinking…`;
  const ranking = [...order].sort((a, b) => (cv.places[a] ?? (cv.alive.includes(a) ? 0 : 99)) - (cv.places[b] ?? (cv.alive.includes(b) ? 0 : 99)) || count(b) - count(a));

  return (
    <main className="table ld-table pg-table cw-table">
      <PartyTopbar
        t={t}
        view={view}
        actions={actions}
        chip={
          <>
            🎨<span> Colour Wars</span>
          </>
        }
      />

      <PartyChips
        t={t}
        view={view}
        bubbles={bubbles}
        order={order}
        colorOf={colorOf}
        turnId={cv.turnId}
        turnEndsAt={turnEndsAt}
        extra={(id) => !cv.alive.includes(id) && 'cw-out'}
        tag={(id) => {
          const n = count(id);
          return (
            <>
              <span className="pg-swatch" />
              {!cv.alive.includes(id) ? (
                <b className="pg-num cw-dead">💀</b>
              ) : cv.firstMove.includes(id) ? (
                <b className="pg-num cw-new">new</b>
              ) : (
                <b key={n} className="pg-num bump">
                  {n}
                </b>
              )}
            </>
          );
        }}
      />

      <PartyStrip toast={toast} status={status} mine={myTurn} live={canTap} />

      <div className="pg-stage cw-stage">
        <div className={cx('ld-board-wrap cw-wrap', canTap && 'live')} style={{ '--me': colorOf(view.meId) } as CSSProperties}>
          <CwBoard size={cv.size} cells={cells} frame={frame} colorOf={colorOf} mover={colorOf(cv.last?.playerId)} valid={valid} onTap={tap} />
          {chain && (
            <span key={chain.key} className={cx('cw-chain', chain.n >= 6 && 'mega')} aria-hidden>
              CHAIN <b>×{chain.n}</b>
            </span>
          )}
        </div>
      </div>

      <div className="pg-foot cw-territory" aria-label="Board share">
        <div className="cw-terr-bar">
          {order.map((id) => (
            <i key={id} style={{ '--pc': colorOf(id), flexGrow: count(id) } as CSSProperties} />
          ))}
          <i className="free" style={{ flexGrow: total - cv.cells.filter((c) => c.owner).length }} />
        </div>
        <div className="cw-terr-keys">
          {order.map((id) => (
            <span key={id} className={cx('cw-key', !cv.alive.includes(id) && 'out', id === cv.turnId && t.playing && 'turn')} style={{ '--pc': colorOf(id) } as CSSProperties}>
              <i />
              <span data-no-translate>{t.name(id)}</span>
              <b>{cv.alive.includes(id) ? `${Math.round((count(id) * 100) / total)}%` : 'out'}</b>
            </span>
          ))}
        </div>
      </div>
      <p className="ld-sixes pg-rules-line">{`${cv.size}×${cv.size} · 4 dots burst into the cells around · take them all`}</p>

      <PartyEnd
        t={t}
        view={view}
        actions={actions}
        auth={auth}
        podium={
          <PartyPodium
            view={view}
            ranking={ranking}
            colorOf={colorOf}
            sub={(id) => (cv.alive.includes(id) ? `▦ ${count(id)} ${count(id) === 1 ? 'cell' : 'cells'}` : '💀 out')}
            onDone={() => t.setPodiumDone(true)}
            recap={
              <>
                <p className="label">🎨 Game recap</p>
                <ul>
                  <li>{`${cv.size}×${cv.size} board; the last colour standing wins.`}</li>
                </ul>
                <p className="muted small">{ranking.map((id) => `${t.name(id)} ${cv.alive.includes(id) ? `▦${count(id)}` : '💀'}`).join(' · ')}</p>
              </>
            }
          />
        }
      />
    </main>
  );
}
