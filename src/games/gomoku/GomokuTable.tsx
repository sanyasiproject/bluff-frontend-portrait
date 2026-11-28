import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { cx } from '../../lib/cards';
import { sfx, unlockAudio } from '../../lib/sounds';
import { useOnChange } from '../../components/Table';
import { gomokuCentre, type GomokuView } from '../../types';
import { useTurnEndsAt } from '../../components/TurnTimer';
import type { PluggedTableProps } from '../registry';
import { PartyChips, PartyEnd, partyColor, PartyStrip, PartyTopbar, usePartyTable, type PartyToast } from '../dots/party';
import { StoneBoard } from './Board';
import { GomokuPodium } from './Podium';
import '../../styles/ludo.css';
import '../../styles/pgames.css';
import '../../styles/gomoku.css';

const CONFIRM_KEY = 'gomoku.confirm';
/** tap twice to place: on by default */
function loadConfirm(): boolean {
  try {
    return localStorage.getItem(CONFIRM_KEY) !== 'off';
  } catch {
    return true;
  }
}
function saveConfirm(on: boolean) {
  try {
    localStorage.setItem(CONFIRM_KEY, on ? 'on' : 'off');
  } catch {
    // storage blocked
  }
}

export function GomokuTable(props: PluggedTableProps) {
  const gv = props.view.plugged?.kind === 'gomoku' ? props.view.plugged.gomoku : null;
  if (!gv) return <main className="screen center-screen">Setting up the board…</main>;
  return <GomokuInner {...props} gv={gv} />;
}

function GomokuInner({ view, actions, bubbles, auth, gv }: PluggedTableProps & { gv: GomokuView }) {
  const t = usePartyTable(view);
  const order = gv.seats;
  const colorOf = (id: string | null | undefined) => partyColor(order, id);
  const colors = order.map((id) => colorOf(id));
  const mySeat = order.indexOf(view.meId);
  const turnEndsAt = useTurnEndsAt(view);
  const myTurn = t.playing && gv.turnId === view.meId && !gv.winner && !gv.draw;
  const [ghost, setGhost] = useState<number | null>(null);
  const [confirm, setConfirm] = useState(loadConfirm);
  const [sent, setSent] = useState(false);
  const [toast, setToast] = useState<PartyToast | null>(null);
  const seq = useRef(0);
  const say = (text: string, tone: PartyToast['tone']) => setToast({ key: ++seq.current, text, tone });
  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 1700);
    return () => window.clearTimeout(id);
  }, [toast]);

  const centre = gomokuCentre(gv.size);
  const empty = gv.moves === 0;
  useOnChange(myTurn, (m) => {
    setSent(false);
    setGhost(null);
    if (m) {
      sfx.turn();
      if (navigator.userActivation?.hasBeenActive) navigator.vibrate?.(60);
    }
  });
  // each stone: a knock; five or a full board gets a line
  useOnChange(gv.last?.seq ?? null, () => {
    const l = gv.last;
    if (!l) return;
    setSent(false);
    setGhost(null);
    sfx.gomokuStone();
    if (gv.winner) {
      window.setTimeout(() => sfx.gomokuFive(), 250);
      say(`🏆 ${t.name(gv.winner)} made five!`, 'gold');
    } else if (gv.draw) say('🤝 The board is full: a draw', 'gold');
  });
  useEffect(() => {
    if (!sent) return;
    const id = window.setTimeout(() => setSent(false), 4000);
    return () => window.clearTimeout(id);
  }, [sent]);

  const can = myTurn && !t.busy && !sent;
  // the first stone's point shows at once
  const shown = ghost ?? (empty ? centre : null);
  const place = (at: number) => {
    unlockAudio();
    setSent(true);
    setGhost(at);
    navigator.vibrate?.(12);
    void t.act(() => actions.gameMove({ kind: 'gomoku', move: { type: 'place', at } }));
  };
  const onTap = (at: number) => {
    if (!can || gv.cells[at] >= 0) return;
    if (empty && at !== centre) {
      setGhost(centre);
      return say('The first stone goes in the centre', 'bad');
    }
    if (!confirm || shown === at) return place(at);
    setGhost(at);
    sfx.gomokuGhost();
  };
  const toggleConfirm = () => {
    saveConfirm(!confirm);
    setConfirm(!confirm);
  };

  const status = !t.playing
    ? ''
    : myTurn
      ? sent
        ? 'Placing…'
        : empty
          ? 'Your turn! The first stone goes in the centre'
          : ghost !== null && confirm
            ? 'Tap again or press Place'
            : 'Your turn! Tap a point'
      : `${t.name(gv.turnId)} ${gv.turnId === view.meId ? 'are' : 'is'} thinking…`;
  const zoomable = gv.size > 15 || window.innerWidth < 420;

  return (
    <main className={cx('table ld-table pg-table gk-table', `s${gv.size}`)}>
      <PartyTopbar t={t} view={view} actions={actions} chip={<>⚫<span>{` Five in a Row ${gv.size}×${gv.size}`}</span></>} />

      <PartyChips
        t={t}
        view={view}
        bubbles={bubbles}
        order={order}
        colorOf={colorOf}
        turnId={gv.turnId}
        turnEndsAt={turnEndsAt}
        iconOf={(id) => <i className="gk-chip-stone" style={{ '--pc': colorOf(id) } as CSSProperties} />}
        tag={(id) => (
          <>
            <i className="gk-chip-stone" style={{ '--pc': colorOf(id) } as CSSProperties} />
            <b key={gv.best[id] ?? 0} className={cx('pg-num bump', (gv.best[id] ?? 0) >= 4 && 'lead')}>
              {gv.best[id] ?? 0}
            </b>
          </>
        )}
      />

      <PartyStrip toast={toast} status={status} mine={myTurn} live={can} />

      <div className="pg-stage gk-stage" style={{ '--me': mySeat >= 0 ? colors[mySeat] : '#fff' } as CSSProperties}>
        <StoneBoard
          size={gv.size}
          board={gv.cells}
          colors={colors}
          last={gv.last?.at ?? null}
          ghost={myTurn ? shown : null}
          ghostSeat={Math.max(0, mySeat)}
          line={gv.line}
          can={can}
          onTap={onTap}
          zoomable={zoomable}
        />
      </div>

      <div className="pg-foot gk-foot">
        {!t.watching && t.playing && (
          <>
            <button className={cx('gk-confirm', confirm && 'on')} onClick={toggleConfirm} aria-pressed={confirm}>
              {confirm ? '✌️ Tap twice: on' : '👆 One tap: on'}
            </button>
            <button className="btn primary gk-place" disabled={!can || shown === null || !confirm} onClick={() => shown !== null && place(shown)}>
              Place
            </button>
          </>
        )}
      </div>
      <p className="ld-sixes pg-rules-line">{`5 in a line wins · row, column or diagonal${zoomable ? ' · pinch or double-tap to zoom' : ''}`}</p>

      <PartyEnd t={t} view={view} actions={actions} auth={auth} podium={<GomokuPodium view={view} gv={gv} onDone={() => t.setPodiumDone(true)} />} />
    </main>
  );
}
