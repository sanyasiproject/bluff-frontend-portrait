import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useTimeouts } from '../../lib/useTimeouts';
import { cx } from '../../lib/cards';
import { sfx, unlockAudio } from '../../lib/sounds';
import { useOnChange } from '../../components/Table';
import type { UtttMark, UtttView } from '../../types';
import { useTurnEndsAt } from '../../components/TurnTimer';
import type { PluggedTableProps } from '../registry';
import { PartyChips, PartyEnd, partyColor, PartyStrip, PartyTopbar, usePartyTable, type PartyToast } from '../dots/party';
import { UtttBoard } from './Board';
import { UtttPodium } from './Podium';
import '../../styles/ludo.css';
import '../../styles/pgames.css';
import '../../styles/uttt.css';

export function UtttTable(props: PluggedTableProps) {
  const uv = props.view.plugged?.kind === 'uttt' ? props.view.plugged.uttt : null;
  if (!uv) return <main className="screen center-screen">Drawing the board…</main>;
  return <UtttInner {...props} uv={uv} />;
}

/** X or O, drawn small for chips and lines */
export function MarkIcon({ mark, color }: { mark: UtttMark | null | undefined; color: string }) {
  return (
    <b className="ut-icon" style={{ color } as CSSProperties} aria-label={mark ?? ''}>
      {mark === 'O' ? '◯' : '✕'}
    </b>
  );
}

function UtttInner({ view, actions, bubbles, auth, uv }: PluggedTableProps & { uv: UtttView }) {
  const later = useTimeouts();
  const t = usePartyTable(view);
  // X first, then O
  const order = [uv.x, uv.o];
  const colorOf = (id: string | null | undefined) => partyColor(order, id);
  const markOf = (id: string): UtttMark => (id === uv.x ? 'X' : 'O');
  const colors: Record<UtttMark, string> = { X: colorOf(uv.x), O: colorOf(uv.o) };
  const myMark: UtttMark | null = view.meId === uv.x ? 'X' : view.meId === uv.o ? 'O' : null;
  const turnEndsAt = useTurnEndsAt(view);
  const over = !!uv.winner || uv.draw;
  const myTurn = t.playing && !over && uv.turnId === view.meId;
  const [sent, setSent] = useState(false);
  const [toast, setToast] = useState<PartyToast | null>(null);
  const seq = useRef(0);
  const say = (text: string, tone: PartyToast['tone']) => setToast({ key: ++seq.current, text, tone });
  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 1700);
    return () => window.clearTimeout(id);
  }, [toast]);
  const won = (m: UtttMark) => uv.boards.filter((b) => b === m).length;

  useOnChange(myTurn, (m) => {
    setSent(false);
    if (m) {
      sfx.turn();
      if (navigator.userActivation?.hasBeenActive) navigator.vibrate?.(60);
    }
  });
  // each mark: chalk sound; a small board won gets a stamp and a line
  useOnChange(uv.last?.seq ?? null, () => {
    const l = uv.last;
    setSent(false);
    sfx.utttMark();
    if (!l?.won) return;
    later(() => sfx.utttBoard(), 120);
    say(`${l.mark === 'X' ? '✕' : '◯'} ${t.name(l.playerId)} took a board!`, l.playerId === view.meId ? 'good' : 'gold');
  });
  useEffect(() => {
    if (!sent) return;
    const id = window.setTimeout(() => setSent(false), 4000);
    return () => window.clearTimeout(id);
  }, [sent]);

  const can = myTurn && !t.busy && !sent;
  const place = (board: number, cell: number) => {
    unlockAudio();
    setSent(true);
    navigator.vibrate?.(12);
    void t.act(() => actions.gameMove({ kind: 'uttt', move: { type: 'place', board, cell } }));
  };

  const freeMove = uv.active.length > 1;
  const status = !t.playing
    ? ''
    : myTurn
      ? sent
        ? 'Marking…'
        : !uv.last
          ? 'Your move! Play anywhere'
          : freeMove
            ? 'Free move! Play in any glowing board'
            : 'Your move! Play in the glowing board'
      : `${t.name(uv.turnId)} ${uv.turnId === view.meId ? 'are' : 'is'} thinking…`;

  return (
    <main className="table ld-table pg-table ut-table">
      <PartyTopbar t={t} view={view} actions={actions} chip={<>#️⃣<span> Ultimate Tic-Tac-Toe</span></>} />

      <PartyChips
        t={t}
        view={view}
        bubbles={bubbles}
        order={order}
        colorOf={colorOf}
        turnId={uv.turnId}
        turnEndsAt={turnEndsAt}
        iconOf={(id) => <MarkIcon mark={markOf(id)} color={colorOf(id)} />}
        nameOf={(id) => markOf(id)}
        tag={(id) => {
          const n = won(markOf(id));
          return (
            <>
              <MarkIcon mark={markOf(id)} color={colorOf(id)} />
              <b key={n} className={cx('pg-num bump', n > 0 && n >= won(markOf(id) === 'X' ? 'O' : 'X') && 'lead')}>
                {n}
              </b>
            </>
          );
        }}
      />

      <PartyStrip toast={toast} status={status} mine={myTurn} live={can} />

      <div className="pg-stage ut-stage">
        <UtttBoard uv={uv} colors={colors} myMark={myMark} can={can} onPlace={place} />
      </div>

      <div className="pg-foot ut-foot">
        <p className="ut-hint">
          <span className="ut-hint-cell" aria-hidden>
            <i />
          </span>
          {myMark ? 'Hold a cell to see where it sends them · lift to play' : 'Each cell sends the next player to the matching board'}
        </p>
      </div>
      <p className="ld-sixes pg-rules-line">Win 3 small boards in a line · sent to a closed board = free move</p>

      <PartyEnd t={t} view={view} actions={actions} auth={auth} podium={<UtttPodium view={view} uv={uv} order={order} onDone={() => t.setPodiumDone(true)} />} />
    </main>
  );
}
