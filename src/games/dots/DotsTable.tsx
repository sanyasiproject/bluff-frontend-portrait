import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { cx } from '../../lib/cards';
import { confettiAt } from '../../lib/motion';
import { sfx } from '../../lib/sounds';
import type { DotsView } from '../../types';
import { useOnChange } from '../../components/Table';
import { useTurnEndsAt } from '../../components/TurnTimer';
import type { PluggedTableProps } from '../registry';
import { Grid, PlayerIcon } from './Grid';
import { PartyChips, PartyEnd, partyColor, partyOrder, PartyStrip, PartyTopbar, usePartyTable, type PartyToast } from './party';
import { PartyPodium } from './PartyPodium';
import '../../styles/ludo.css';
import '../../styles/pgames.css';
import '../../styles/dots.css';

type Toast = PartyToast;

export function DotsTable(props: PluggedTableProps) {
  const dv = props.view.plugged?.kind === 'dots' ? props.view.plugged.dots : null;
  if (!dv) return <main className="screen center-screen">Setting up the board…</main>;
  return <DotsInner {...props} dv={dv} />;
}

function DotsInner({ view, actions, bubbles, auth, dv }: PluggedTableProps & { dv: DotsView }) {
  const t = usePartyTable(view);
  const order = partyOrder(view, Object.keys(dv.scores));
  const colorOf = (id: string | null | undefined) => partyColor(order, id);
  const iconOf = (id: string) => Math.max(0, order.indexOf(id));
  const turnEndsAt = useTurnEndsAt(view);
  const myTurn = t.playing && dv.turnId === view.meId;
  const [sent, setSent] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const seq = useRef(0);
  const say = (text: string, tone: Toast['tone']) => setToast({ key: ++seq.current, text, tone });
  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 1500);
    return () => window.clearTimeout(id);
  }, [toast]);

  const total = dv.size * dv.size;
  const closed = Object.keys(dv.boxes).length;

  // each line: a pen scratch; closed boxes pop; the closer goes again
  useOnChange(dv.last?.seq ?? null, () => {
    setSent(false);
    const last = dv.last;
    if (!last) return;
    sfx.dotsLine();
    if (last.closed.length === 0) return;
    window.setTimeout(() => sfx.dotsBox(last.closed.length), 180);
    const who = last.playerId === view.meId;
    if (closed === total) return;
    if (last.closed.length > 1) say(`Double box! ${who ? 'Go again!' : `${t.name(last.playerId)} goes again`}`, 'gold');
    else say(who ? 'Box! Go again!' : `${t.name(last.playerId)} goes again`, 'good');
    if (who) {
      navigator.vibrate?.(40);
      confettiAt(t.seatEls.current.get(view.meId), { count: 18, spread: 0.6 });
    }
  });
  useOnChange(myTurn ? `${dv.turnId}:${dv.last?.seq ?? 0}` : null, (k) => {
    if (!k || (dv.last && dv.last.playerId === view.meId)) return;
    sfx.turn();
    if (navigator.userActivation?.hasBeenActive) navigator.vibrate?.(100);
  });
  useEffect(() => {
    if (!sent) return;
    const id = window.setTimeout(() => setSent(false), 4000);
    return () => window.clearTimeout(id);
  }, [sent]);

  const canDraw = myTurn && !t.busy && !sent;
  const draw = (line: number) => {
    setSent(true);
    navigator.vibrate?.(12);
    void t.act(() => actions.gameMove({ kind: 'dots', move: { type: 'line', line } }));
  };

  const lead = Math.max(0, ...Object.values(dv.scores));
  const goAgain = myTurn && dv.last?.playerId === view.meId && dv.last.closed.length > 0;
  const status = !t.playing
    ? ''
    : myTurn
      ? sent
        ? 'Drawing…'
        : goAgain
          ? 'Go again! Draw one more line'
          : 'Your turn! Tap a gap to draw'
      : `${t.name(dv.turnId)} ${dv.turnId === view.meId ? 'are' : 'is'} drawing…`;
  const ranking = [...order].sort((a, b) => (dv.scores[b] ?? 0) - (dv.scores[a] ?? 0));
  const all = [...view.players, ...view.leftPlayers];

  return (
    <main className="table ld-table pg-table db-table">
      <PartyTopbar
        t={t}
        view={view}
        actions={actions}
        chip={
          <>
            ⬛<span>{` Dots ${dv.size}×${dv.size}`}</span>
          </>
        }
      />

      <PartyChips
        t={t}
        view={view}
        bubbles={bubbles}
        order={order}
        colorOf={colorOf}
        turnId={dv.turnId}
        turnEndsAt={turnEndsAt}
        iconOf={(id) => <PlayerIcon i={iconOf(id)} color={colorOf(id)} />}
        tag={(id) => {
          const n = dv.scores[id] ?? 0;
          return (
            <>
              <PlayerIcon i={iconOf(id)} color={colorOf(id)} />
              <b key={n} className={cx('pg-num bump', n > 0 && n === lead && 'lead')}>
                {n}
              </b>
            </>
          );
        }}
      />

      <PartyStrip toast={toast} status={status} mine={myTurn} live={canDraw} />

      <div className="pg-stage db-stage">
        <div className="ld-board-wrap db-wrap" style={{ '--me': colorOf(view.meId) } as CSSProperties}>
          <Grid dv={dv} colorOf={colorOf} iconOf={iconOf} canDraw={canDraw} onDraw={draw} />
        </div>
      </div>

      <div className="pg-foot db-scores" aria-label={`${closed} of ${total} boxes closed`}>
        {order.map((id) => {
          const n = dv.scores[id] ?? 0;
          return (
            <div key={id} className={cx('db-score', id === dv.turnId && t.playing && 'turn')} style={{ '--pc': colorOf(id) } as CSSProperties}>
              <PlayerIcon i={iconOf(id)} color={colorOf(id)} />
              <span className="db-score-name" data-no-translate>
                {t.name(id)}
              </span>
              <span className="db-score-track">
                <i key={n} style={{ transform: `scaleX(${total ? n / total : 0})` }} />
              </span>
              <b>{n}</b>
            </div>
          );
        })}
        <small className="db-left">{`${total - closed} of ${total} boxes left`}</small>
      </div>
      <p className="ld-sixes pg-rules-line">Close a box: score it and go again · most boxes wins</p>

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
            sub={(id) => `⬛ ${dv.scores[id] ?? 0} boxes`}
            onDone={() => t.setPodiumDone(true)}
            recap={
              <>
                <p className="label">⬛ Game recap</p>
                <ul>
                  <li>{`${total} boxes on a ${dv.size}×${dv.size} board.`}</li>
                </ul>
                <p className="muted small">{ranking.map((id) => `${id === view.meId ? 'You' : (all.find((p) => p.id === id)?.name ?? '?')} ⬛${dv.scores[id] ?? 0}`).join(' · ')}</p>
              </>
            }
          />
        }
      />
    </main>
  );
}
