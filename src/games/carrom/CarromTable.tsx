import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { cx } from '../../lib/cards';
import { confettiAt } from '../../lib/motion';
import { sfx, unlockAudio } from '../../lib/sounds';
import { useOnChange } from '../../components/Table';
import { useTurnEndsAt } from '../../components/TurnTimer';
import type { PluggedTableProps } from '../registry';
import { PartyChips, PartyEnd, partyColor, partyOrder, PartyStrip, PartyTopbar, usePartyTable, type PartyToast } from '../dots/party';
import { AimLayer, useStrikerAim } from './Aim';
import { CarromBoard } from './Board';
import { Pieces, PieceShape, type PieceInfo, type PieceKind } from './Pieces';
import { CarromPodium } from './Podium';
import { strikerAt, toScreen } from './geometry';
import { useShotAnim, type Shot } from './useShotAnim';
import { CARROM, STRIKER, strikerSpot, type CarromCoin, type CarromSide } from './lib';
import { CARROM_FOUL_TEXT, type CarromView } from '../../types';
import '../../styles/ludo.css';
import '../../styles/pgames.css';
import '../../styles/carrom.css';

const COLOR_WORD: Record<string, string> = { w: 'White', b: 'Black' };
/** a coin's colour from its id ('W3', 'B7', 'Q') */
const colorOfCoin = (id: string): PieceKind => (id[0] === 'W' ? 'w' : id[0] === 'B' ? 'b' : 'q');

export function CarromTable(props: PluggedTableProps) {
  const cv = props.view.plugged?.kind === 'carrom' ? props.view.plugged.carrom : null;
  if (!cv) return <main className="screen center-screen">Setting up the board…</main>;
  return <CarromInner {...props} cv={cv} />;
}

/** a small coin for chips and trays */
export function MiniCoin({ c }: { c: PieceKind }) {
  return (
    <svg className="cr-mini" viewBox="-1.1 -1.1 2.2 2.2" aria-hidden>
      <PieceShape kind={c} r={1} />
    </svg>
  );
}

function CarromInner({ view, actions, bubbles, auth, cv }: PluggedTableProps & { cv: CarromView }) {
  const t = usePartyTable(view);
  const order = partyOrder(view, Object.keys(cv.sides));
  const colorOf = (id: string | null | undefined) => partyColor(order, id);
  const roomEndsAt = useTurnEndsAt(view);
  // the shot clock from the game's own deadline (server time turned into mine)
  const turnEndsAt = useMemo(() => (cv.deadline ? Date.now() + (cv.deadline - cv.now) : roomEndsAt), [cv.deadline, cv.now, roomEndsAt]);
  const myTurn = t.playing && cv.turnId === view.meId;
  // watchers see the board from the first player's side
  const mySide: CarromSide = cv.sides[view.meId] ?? cv.sides[order[0]] ?? 0;
  const [toast, setToast] = useState<PartyToast | null>(null);
  const [sent, setSent] = useState<number | null>(null);
  const seq = useRef(0);
  const wrap = useRef<HTMLDivElement>(null);
  const say = (text: string, tone: PartyToast['tone']) => setToast({ key: ++seq.current, text, tone });
  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 1900);
    return () => window.clearTimeout(id);
  }, [toast]);

  const anim = useShotAnim(mySide);
  const coins = anim.playing ? anim.playing.before : cv.coins;
  const screenCoins = useMemo(() => cv.coins.map((c) => toScreen(mySide, c.x, c.y)), [cv.coins, mySide]);
  const canShoot = myTurn && !t.busy && sent === null && !anim.playing && !t.watching;

  const { aim, place, handlers } = useStrikerAim(wrap, canShoot, cv.coins, mySide, (x, du, df, power) => {
    unlockAudio();
    const shot: Shot = { seq: (cv.last?.seq ?? 0) + 1, side: mySide, x, dx: du, dy: df, power, before: cv.coins };
    setSent(shot.seq);
    // play my own shot at once; the server's copy of it is then skipped
    anim.play(shot);
    void t.act(() => actions.gameMove({ kind: 'carrom', move: { type: 'shot', x, dx: du, dy: df, power } }));
  });
  // my turn starts: the striker comes to the middle (or the nearest free spot)
  useOnChange(myTurn ? `${cv.turnId}:${cv.last?.seq ?? 0}` : null, (k) => {
    if (!k) return;
    place(0.5);
    if (!cv.last || cv.last.playerId !== view.meId) {
      sfx.turn();
      if (navigator.userActivation?.hasBeenActive) navigator.vibrate?.(60);
    }
  });
  // a refused or lost shot frees the striker again
  useEffect(() => {
    if (sent === null) return;
    const id = window.setTimeout(() => setSent(null), 15000);
    return () => window.clearTimeout(id);
  }, [sent]);

  // each shot: play it (my own is already playing), then its result lines once it stops rolling
  const results = useRef(new Map<number, NonNullable<CarromView['last']>>());
  anim.onEnd.current = (n) => {
    const last = results.current.get(n);
    results.current.delete(n);
    if (!last) return;
    if (last.foul) {
      sfx.carromFoul();
      say(`❌ ${CARROM_FOUL_TEXT[last.foul]}`, 'bad');
      if (last.playerId === view.meId) navigator.vibrate?.(80);
    } else if (last.queen === 'pocketed') say(`👑 Queen! ${last.playerId === view.meId ? 'Now cover her' : 'Cover pending'}`, 'gold');
    else if (last.queen === 'covered') say('👑 Queen covered!', 'gold');
    else if (last.queen === 'returned') say('👑 The queen goes back to the centre', 'bad');
    else if (last.points > 0 && cv.mode === 'freestyle') say(`+${last.points}`, 'good');
    else if (last.again) say(`${t.name(last.playerId)} ${last.playerId === view.meId ? 'shoot' : 'shoots'} again!`, 'good');
  };
  useOnChange(cv.last?.seq ?? null, () => {
    const last = cv.last;
    if (!last) return;
    results.current.set(last.seq, last);
    if (!anim.play(last)) anim.onEnd.current(last.seq);
    setSent(null);
  });

  // pieces drawn now: the shot's start while it plays, else the server's board and the striker on the turn's baseline
  const pieces: PieceInfo[] = useMemo(() => {
    const list: PieceInfo[] = coins.map((c: CarromCoin) => ({ id: c.id, kind: c.c, r: CARROM.coinR, ...toScreen(mySide, c.x, c.y) }));
    const turnSide = cv.turnId ? cv.sides[cv.turnId] : undefined;
    const sp = anim.playing
      ? toScreen(mySide, ...strikerSpot(anim.playing.side, anim.playing.x))
      : myTurn
        ? strikerAt(aim.x)
        : turnSide !== undefined
          ? toScreen(mySide, ...strikerSpot(turnSide, 0.5))
          : null;
    if (sp) list.push({ id: STRIKER, kind: 's', r: CARROM.strikerR, ...sp });
    return list;
  }, [coins, anim.playing, myTurn, aim.x, cv.turnId, mySide]);

  // a board won: who took it and the points
  useOnChange(cv.results.length, (n) => {
    const r = cv.results[n - 1];
    if (!r) return;
    say(`🏆 Board ${r.board}: ${r.winners.map(t.name).join(' & ')} +${r.points}`, 'gold');
    confettiAt(wrap.current, { count: 50, spread: 1.2 });
  });

  const teamOf = (id: string) => (cv.teams ? (cv.teams[0].includes(id) ? 0 : cv.teams[1].includes(id) ? 1 : undefined) : undefined);
  const mates = (id: string) => (cv.teams?.find((tm) => tm.includes(id)) ?? [id]);
  const myPocket = mates(view.meId).flatMap((id) => (cv.pocketed[id] ?? []).map(colorOfCoin));
  const coverMe = cv.queen.state === 'pending' && cv.queen.by !== null && mates(view.meId).includes(cv.queen.by) && t.playing;

  const status = !t.playing
    ? ''
    : anim.playing
      ? ''
      : myTurn
        ? coverMe
          ? '👑 Cover the queen! Pocket your own coin'
          : aim.mode === 'pull'
            ? `Power ${Math.round(aim.power * 100)}% · let go to shoot`
            : aim.blocked
              ? 'The striker is on a coin: slide it off'
              : 'Your shot! Slide ↔ then pull back ↓'
        : `${t.name(cv.turnId)} ${cv.turnId === view.meId ? 'are' : 'is'} aiming…`;

  return (
    <main className={cx('table ld-table pg-table cr-table', `cr-${cv.mode}`)}>
      <PartyTopbar t={t} view={view} actions={actions} chip={<>🎯<span>{` Carrom · ${cv.mode === 'classic' ? 'Classic' : 'Freestyle'}`}</span></>} />

      <PartyChips
        t={t}
        view={view}
        bubbles={bubbles}
        order={order}
        colorOf={colorOf}
        turnId={cv.turnId}
        turnEndsAt={turnEndsAt}
        extra={(id) => cx('cr-seat', teamOf(id) !== undefined && `cr-team-${teamOf(id)}`)}
        // Classic: my tags name my coin colour, not the seat colour
        iconOf={(id) => (cv.colors?.[id] ? <MiniCoin c={cv.colors[id]} /> : undefined)}
        nameOf={(id) => (cv.colors?.[id] ? COLOR_WORD[cv.colors[id]] : undefined)}
        tag={(id) => (
          <>
            <b key={cv.scores[id] ?? 0} className="pg-num bump">
              {cv.scores[id] ?? 0}
            </b>
            {/* their colour and how many coins they pocketed this board */}
            <span className="cr-pk">
              <MiniCoin c={cv.colors?.[id] ?? 'w'} />×{(cv.pocketed[id] ?? []).length}
            </span>
            {teamOf(id) !== undefined && <i className="cr-team-tag">{teamOf(id) === 0 ? 'A' : 'B'}</i>}
          </>
        )}
      />

      <PartyStrip toast={toast} status={status} mine={myTurn} live={canShoot && aim.mode === 'idle'} />

      <div className="pg-stage cr-stage">
        <div ref={wrap} className={cx('cr-wrap', canShoot && 'live', coverMe && 'cover')} {...handlers}>
          <CarromBoard />
          <Pieces key={anim.playing ? `p${anim.playing.seq}` : `s${cv.last?.seq ?? 0}`} pieces={pieces} bind={anim.bind} />
          {canShoot && <AimLayer aim={aim} coins={screenCoins} live={canShoot} />}
          {coverMe && !anim.playing && <span className="cr-cover">👑 Cover the queen!</span>}
        </div>
      </div>

      <div className="pg-foot cr-foot">
        <div className="cr-tray" style={{ '--pc': colorOf(view.meId) } as CSSProperties}>
          <span className="cr-tray-label">{t.watching ? '🎯' : cv.teams ? 'Your team pocketed' : 'You pocketed'}</span>
          <span className="cr-tray-coins">
            {myPocket.length === 0 ? <em>—</em> : myPocket.map((c, i) => <MiniCoin key={i} c={c} />)}
          </span>
          {cv.colors?.[view.meId] && <span className="cr-tray-own">{`You: ${COLOR_WORD[cv.colors[view.meId]]}`}</span>}
        </div>
      </div>
      <p className="ld-sixes pg-rules-line">
        {cv.mode === 'classic' ? 'Pocket your colour · cover the queen · striker in = foul' : 'White 20 · Black 10 · Queen 50 · foul −10'}
        {` · Board ${cv.board}${cv.length === 'full' ? ` of ${cv.boards}` : ''}`}
      </p>

      <PartyEnd t={t} view={view} actions={actions} auth={auth} podium={<CarromPodium view={view} cv={cv} order={order} onDone={() => t.setPodiumDone(true)} />} />
    </main>
  );
}
