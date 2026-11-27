import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { cx } from '../../lib/cards';
import { confettiAt, reducedMotion } from '../../lib/motion';
import { sfx, unlockAudio } from '../../lib/sounds';
import { DARTS_PER_TURN, type DartThrow, type DartsView } from '../../types';
import { useOnChange } from '../../components/Table';
import { useTurnEndsAt } from '../../components/TurnTimer';
import type { PluggedTableProps } from '../registry';
import { PartyChips, PartyEnd, partyColor, partyOrder, PartyStrip, PartyTopbar, usePartyTable, type PartyToast } from '../dots/party';
import { useAim, Reticle } from './Aim';
import { DartBoard } from './Board';
import { Dart } from './Dart';
import { DartsPodium } from './Podium';
import { checkoutHint, dartLabel, dartTone, dartWord } from './words';
import '../../styles/ludo.css';
import '../../styles/pgames.css';
import '../../styles/darts.css';

/** the server holds a finished turn 1.6 s; once the turn moves on, the darts come out after this */
const PULL_MS = 500;

type Toast = PartyToast;
interface Pop {
  key: number;
  x: number;
  y: number;
  text: string;
  tone: string;
}

export function DartsTable(props: PluggedTableProps) {
  const dv = props.view.plugged?.kind === 'darts' ? props.view.plugged.darts : null;
  if (!dv) return <main className="screen center-screen">Setting up the board…</main>;
  return <DartsInner {...props} dv={dv} />;
}

function DartsInner({ view, actions, bubbles, auth, dv }: PluggedTableProps & { dv: DartsView }) {
  const t = usePartyTable(view);
  const order = partyOrder(view, Object.keys(dv.left));
  const colorOf = (id: string | null | undefined) => partyColor(order, id);
  const turnEndsAt = useTurnEndsAt(view);
  const myTurn = t.playing && dv.turnId === view.meId;
  // darts on the board: this turn's, and the last turn's for a moment after it ends
  const [stuck, setStuck] = useState<DartThrow[]>(() => dv.thrown);
  const [freshSeq, setFreshSeq] = useState<number | null>(null);
  const [pulling, setPulling] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [pop, setPop] = useState<Pop | null>(null);
  const [sent, setSent] = useState(false);
  // a red BUST stamp over the board for a moment (the turn is over, so it blocks nothing)
  const [stamp, setStamp] = useState<number | null>(null);
  useEffect(() => {
    if (stamp === null) return;
    const id = window.setTimeout(() => setStamp(null), 1500);
    return () => window.clearTimeout(id);
  }, [stamp]);
  const seq = useRef(0);
  const pullTimer = useRef(0);
  const wrap = useRef<HTMLDivElement>(null);
  const reticle = useRef<HTMLDivElement>(null);
  const shake = useRef<HTMLDivElement>(null);

  const say = (text: string, tone: Toast['tone']) => setToast({ key: ++seq.current, text, tone });
  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 1700);
    return () => window.clearTimeout(id);
  }, [toast]);
  useEffect(() => {
    if (!pop) return;
    const id = window.setTimeout(() => setPop(null), 1300);
    return () => window.clearTimeout(id);
  }, [pop]);

  // each dart: fly in, thud, the score pops up; then busts, 180s and checkouts
  useOnChange(dv.last?.seq ?? null, () => {
    const last = dv.last;
    if (!last) return;
    setSent(false);
    setPulling(false);
    // the thrower's turn goes on: keep their darts up
    if (last.playerId === dv.turnId) window.clearTimeout(pullTimer.current);
    const turn = last.dart === 1 ? [last] : [...stuck.filter((d) => d.playerId === last.playerId && d.seq !== last.seq), last];
    setStuck(turn);
    setFreshSeq(last.seq);
    window.setTimeout(
      () => {
        if (last.ring === 'miss') sfx.dartMiss();
        else sfx.dartThud();
        setPop({
          key: last.seq,
          x: last.x,
          y: last.y,
          text: dartLabel(last),
          tone: dartTone(last.ring),
        });
        if (last.playerId === view.meId && (last.ring === 'bull' || last.ring === 'treble')) navigator.vibrate?.(30);
        if (last.bust) {
          sfx.dartBust();
          say('BUST! Score goes back', 'bad');
          setStamp(last.seq);
          if (!reducedMotion()) shake.current?.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(0)' }], { duration: 300 });
          if (last.playerId === view.meId) navigator.vibrate?.(80);
        } else if (dv.left[last.playerId] === 0) {
          sfx.dartCheckout();
          say(`🎯 Checkout! ${t.name(last.playerId)} ${last.playerId === view.meId ? 'finish' : 'finishes'}`, 'gold');
          confettiAt(t.seatEls.current.get(last.playerId), {
            count: 60,
            spread: 1.3,
          });
          confettiAt(wrap.current, { count: 50, spread: 1.2 });
        } else if (last.dart === DARTS_PER_TURN && turn.length === DARTS_PER_TURN && turn.reduce((s, d) => s + d.score, 0) === 180) {
          sfx.dart180();
          say('ONE HUNDRED AND EIGHTY! 🔥', 'gold');
          navigator.vibrate?.([60, 40, 60, 40, 120]);
          confettiAt(wrap.current, { count: 80, spread: 1.5 });
        } else if (last.ring === 'bull') {
          sfx.dartBull();
          say('BULLSEYE! 50', 'gold');
        } else if (last.ring === 'treble' && last.number === 20) say('Treble 20! 🔥', 'good');
      },
      reducedMotion() ? 0 : 330,
    );
  });
  // a turn over: the darts come out after a moment
  useOnChange(dv.turnId, () => {
    window.clearTimeout(pullTimer.current);
    pullTimer.current = window.setTimeout(() => setPulling(true), PULL_MS);
  });
  useEffect(() => () => window.clearTimeout(pullTimer.current), []);
  useEffect(() => {
    if (!pulling) return;
    const id = window.setTimeout(() => (setStuck((s) => s.filter((d) => d.playerId === dv.turnId && dv.thrown.some((x) => x.seq === d.seq))), setPulling(false)), 350);
    return () => window.clearTimeout(id);
  }, [pulling]);
  // my turn
  useOnChange(myTurn ? dv.turnId : null, (id) => {
    if (!id) return;
    sfx.turn();
    if (navigator.userActivation?.hasBeenActive) navigator.vibrate?.(100);
  });

  // a turn is over (3 darts, a bust or a checkout) while the server still holds it with the thrower
  const turnOver = dv.thrown.length >= DARTS_PER_TURN || (!!dv.last?.bust && dv.last.playerId === dv.turnId) || (!!dv.turnId && dv.left[dv.turnId] === 0);
  const canThrow = myTurn && !t.busy && !sent && !turnOver;
  const { holding, handlers } = useAim(wrap, reticle, canThrow, (x, y) => {
    unlockAudio();
    sfx.dartWhoosh();
    setSent(true);
    void t.act(() => actions.gameMove({ kind: 'darts', move: { type: 'throw', x, y } }));
  });
  // a lost or refused throw frees the board again
  useEffect(() => {
    if (!sent) return;
    const id = window.setTimeout(() => setSent(false), 4000);
    return () => window.clearTimeout(id);
  }, [sent]);

  // the chalkboard: the thrower's darts this turn (or the turn that just ended)
  const showId = stuck[0]?.playerId ?? dv.turnId;
  const shown = stuck.filter((d) => d.playerId === showId);
  const bust = shown.some((d) => d.bust);
  const total = shown.reduce((s, d) => s + d.score, 0);
  const need = showId ? (dv.left[showId] ?? dv.start) : 0;
  const hint = showId && !bust && showId === dv.turnId ? checkoutHint(need, DARTS_PER_TURN - dv.thrown.length) : null;
  const chalk = (
    <div className={cx('dt-chalk', bust && 'bust')} style={{ '--pc': colorOf(showId) } as CSSProperties}>
      <ul className="dt-chalk-scores">
        {order.map((id) => {
          const place = dv.places[id];
          const left = dv.left[id] ?? dv.start;
          return (
            <li key={id} className={cx(id === dv.turnId && t.playing && 'now')} style={{ '--pc': colorOf(id) } as CSSProperties}>
              <span data-no-translate>{t.name(id)}</span>
              <b key={left}>{place ? `✓ ${['1st', '2nd', '3rd', '4th'][place - 1]}` : left}</b>
            </li>
          );
        })}
      </ul>
      <div className="dt-chalk-turn">
        <p className="dt-chalk-name" data-no-translate>
          {showId ? t.plainName(showId) : '🏁'}
        </p>
        <p className="dt-chalk-darts">
          {Array.from({ length: DARTS_PER_TURN }, (_, i) => (
            <span key={i} className={cx(shown[i] && 'hit')}>
              {shown[i] ? dartWord(shown[i]) : '·'}
            </span>
          ))}
        </p>
        <p className="dt-chalk-total">{bust ? 'BUST' : `= ${total}`}</p>
        {hint && <p className="dt-chalk-need">{hint}</p>}
      </div>
    </div>
  );

  const status = !t.playing
    ? ''
    : myTurn
      ? turnOver
        ? 'Turn over'
        : holding
          ? 'Steady… let go to throw'
          : sent
            ? 'Throwing…'
            : `Your turn! Hold to aim · dart ${dv.thrown.length + 1} of ${DARTS_PER_TURN}`
      : `${t.name(dv.turnId)} ${dv.turnId === view.meId ? 'are' : 'is'} throwing…`;

  return (
    <main className="table ld-table pg-table dt-table">
      <PartyTopbar
        t={t}
        view={view}
        actions={actions}
        chip={
          <>
            🎯<span>{` Darts ${dv.start}`}</span>
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
        extra={() => 'dt-seat'}
        tag={(id) => {
          const left = dv.left[id] ?? dv.start;
          const place = dv.places[id];
          return (
            <>
              <span className="pg-swatch" />
              {place ? (
                <b className="pg-num dt-done">✓ {['1st', '2nd', '3rd', '4th'][place - 1]}</b>
              ) : (
                <b key={left} className="pg-num dt-left bump">
                  {left}
                </b>
              )}
            </>
          );
        }}
      />

      <PartyStrip toast={toast} status={status} mine={myTurn} live={canThrow && !holding} />

      <div className="pg-stage dt-stage">
        <div className="dt-cabinet" aria-hidden />
        <div ref={shake} className="dt-shake">
          <div ref={wrap} className={cx('ld-board-wrap dt-wall', canThrow && 'live', holding && 'holding')} {...handlers}>
            <DartBoard />
            {stuck.map((d) => (
              <Dart key={d.seq} x={d.x} y={d.y} color={colorOf(d.playerId)} fresh={d.seq === freshSeq} out={pulling} />
            ))}
            {pop && (
              <span
                key={pop.key}
                className={cx('dt-pop', pop.tone)}
                style={{
                  left: `${50 + (Math.max(-0.75, Math.min(0.75, pop.x)) / 1.32) * 50}%`,
                  top: `${50 - (Math.max(-0.7, Math.min(0.9, pop.y)) / 1.32) * 50}%`,
                }}
                aria-hidden
              >
                {pop.tone === 'bull' && <i className="dt-burst" />}
                {pop.text}
              </span>
            )}
            {stamp !== null && (
              <span key={stamp} className="dt-stamp" aria-hidden>
                BUST
              </span>
            )}
            <Reticle elRef={reticle} show={holding} />
          </div>
        </div>
      </div>

      <div className="pg-foot">{chalk}</div>
      <p className="ld-sixes pg-rules-line">{`Start ${dv.start} · land exactly on 0 · going below 0 is a bust`}</p>

      <PartyEnd t={t} view={view} actions={actions} auth={auth} podium={<DartsPodium view={view} dv={dv} order={order} onDone={() => t.setPodiumDone(true)} />} />
    </main>
  );
}
