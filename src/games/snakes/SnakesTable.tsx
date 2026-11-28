import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useTimeouts } from '../../lib/useTimeouts';
import { useBack } from '../../lib/back';
import { cx } from '../../lib/cards';
import { compactCoins } from '../../lib/coins';
import { confettiAt, reducedMotion } from '../../lib/motion';
import { sfx, unlockAudio } from '../../lib/sounds';
import { isSoundOn, setSoundOn, unlockSpeech } from '../../lib/speech';
import { SNAKES_BITE_BACK, SNAKES_GOAL, type SnakesLastMove, type SnakesView } from '../../types';
import { Backdrop, GameOver } from '../../components/Overlays';
import { LevelUp } from '../../components/LevelUp';
import { QuickChat } from '../../components/QuickChat';
import { LiveVoiceButtons, LiveVoiceNotice } from '../../components/LiveVoice';
import { Seat, SeatSheet, useOnChange } from '../../components/Table';
import { useTurnEndsAt } from '../../components/TurnTimer';
import type { PluggedTableProps } from '../registry';
import { DICE_MS } from '../ludo/Dice';
import { DiceDock } from '../ludo/DiceDock';
import { Goti } from '../ludo/Goti';
import { ColorTag, colorName, YouAreBanner } from '../../components/PlayerColor';
import { LudoLookPicker } from '../ludo/LookPicker';
import { LudoMenus, type Panel } from '../ludo/Menus';
import { lookOf, useLudoLook } from '../ludo/looks';
import { Board } from './Board';
import { centerOf, moveMs } from './geometry';
import { SnakesPodium } from './Podium';
import { TokenLayer } from './Tokens';
import '../../styles/ludo.css';
import '../../styles/snakes.css';

const BUBBLE_MS = 4000;
/** seat corners clockwise from mine at the bottom left (0 TL, 1 TR, 2 BR, 3 BL) */
const CORNERS: Record<number, number[]> = { 1: [3], 2: [3, 1], 3: [3, 0, 1], 4: [3, 0, 1, 2] };

interface Flash {
  key: number;
  text: string;
  kind: 'bonus' | 'kill' | 'home' | 'oops' | 'ladder' | 'snake';
}
/** a burst over the board: a bite, a ladder or a snake */
interface Burst {
  key: number;
  x: number;
  y: number;
  icon: string;
  text: string;
  kind: 'bite' | 'ladder' | 'snake';
}

export function SnakesTable(props: PluggedTableProps) {
  const sv = props.view.plugged?.kind === 'snakes' ? props.view.plugged.snakes : null;
  if (!sv) return <main className="screen center-screen">Setting up the board…</main>;
  return <SnakesInner {...props} sv={sv} />;
}

function SnakesInner({ view, actions, bubbles, auth, sv }: PluggedTableProps & { sv: SnakesView }) {
  const later = useTimeouts();
  const [busy, setBusy] = useState(false);
  const [sound, setSound] = useState(isSoundOn);
  const [panel, setPanel] = useState<Panel>(null);
  useBack(() => setPanel('menu'));
  const [target, setTarget] = useState<string | null>(null);
  const [flash, setFlash] = useState<Flash | null>(null);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [moving, setMoving] = useState(false);
  const [podiumDone, setPodiumDone] = useState(false);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const shake = useRef<HTMLDivElement>(null);
  const seatEls = useRef(new Map<string, HTMLElement>());
  const startLevel = useRef<number | null>(null);
  const flashSeq = useRef(0);
  const burstSeq = useRef(0);

  const me = view.players.find((p) => p.id === view.meId);
  const watching = !me;
  const playing = view.phase === 'playing';
  const isHost = view.hostId === view.meId;
  const look = useLudoLook(me?.level ?? 1);
  const lookFor = (id: string | null | undefined) => (id === view.meId && !me?.ludoLook ? look : lookOf(view, id));
  const myTurn = playing && sv.turnId === view.meId;
  const turnEndsAt = useTurnEndsAt(view);
  const name = (id: string | null | undefined) => (id === view.meId ? 'You' : ([...view.players, ...view.leftPlayers].find((p) => p.id === id)?.name ?? 'Someone'));
  const pot = view.config.stake * (view.players.length + view.leftPlayers.length);
  const fresh = bubbles.filter((b) => Date.now() - b.at < BUBBLE_MS);
  const bubbleOf = (id: string) => [...fresh].reverse().find((b) => b.from === id) ?? null;
  const gotiOf = (id: string) => lookFor(id).goti;
  const diceBy = useRef<string | null>(null);
  if (sv.turnId) diceBy.current = sv.turnId;
  const diceSkin = lookFor(diceBy.current ?? view.meId).dice;

  const say = (text: string, kind: Flash['kind']) => setFlash({ key: ++flashSeq.current, text, kind });
  useEffect(() => {
    if (!flash) return;
    const t = window.setTimeout(() => setFlash(null), 2000);
    return () => window.clearTimeout(t);
  }, [flash]);
  const burst = (square: number, icon: string, text: string, kind: Burst['kind']) => {
    const [cx, cy] = centerOf(square);
    // keep the word on the board near the edges
    const x = Math.max(1.4, Math.min(8.6, cx));
    const y = Math.max(1.1, cy);
    const key = ++burstSeq.current;
    setBursts((all) => [...all, { key, x, y, icon, text, kind }]);
    later(() => setBursts((all) => all.filter((b) => b.key !== key)), 1300);
  };

  useEffect(() => {
    if (!playing) return;
    startLevel.current = me?.level ?? null;
    setPodiumDone(false);
  }, [view.phase]);

  // each roll: the rattle; three sixes lose the turn; a roll that can't start or move says so
  useOnChange(sv.rollSeq, () => {
    sfx.ludoRoll();
    const roller = prevTurn.current;
    if (sv.sixes >= 3) later(() => (say(`Three 6s! ${name(roller)} lose${roller === view.meId ? '' : 's'} the turn`, 'oops'), sfx.ludoOops()), DICE_MS);
    else if (sv.rules.six && sv.dice !== 6 && (sv.last?.seq ?? null) === lastSeq.current) {
      const seat = sv.seats.find((s) => s.playerId === roller);
      if (seat && seat.pos === 0) later(() => say(`${name(seat.playerId)} need${seat.playerId === view.meId ? '' : 's'} a 6 to start`, 'oops'), DICE_MS);
    }
  });
  const prevTurn = useRef(sv.turnId);
  const lastSeq = useRef(sv.last?.seq ?? null);
  useEffect(() => {
    prevTurn.current = sv.turnId;
    lastSeq.current = sv.last?.seq ?? null;
  });

  // each move: wait for the dice and the walk, then the ladder, snake, bite and finish effects
  useOnChange(sv.last?.seq ?? null, () => {
    const last = sv.last;
    if (!last) return;
    const walkEnd = DICE_MS + moveMs(last) - (last.via ? (last.via.kind === 'snake' ? 1100 : 900) : 0);
    const end = DICE_MS + moveMs(last);
    setMoving(true);
    const timers = [window.setTimeout(() => setMoving(false), end + (last.bitten.length ? 500 : 0))];
    if (last.bounced) timers.push(window.setTimeout(() => say('💯 Too far! Bounced back off 100', 'oops'), DICE_MS + 400));
    if (last.via) timers.push(window.setTimeout(() => viaFx(last), walkEnd));
    timers.push(window.setTimeout(() => landed(last), end));
  });
  const viaFx = (last: SnakesLastMove) => {
    const via = last.via!;
    if (via.kind === 'ladder') {
      burst(via.from, '🪜', 'Ladder!', 'ladder');
      say(`🪜 Ladder! ${name(last.playerId)} climb${last.playerId === view.meId ? '' : 's'} ${via.from} → ${via.to}`, 'ladder');
    } else {
      burst(via.from, '🐍', 'Snake!', 'snake');
      say(`🐍 Snake! ${name(last.playerId)} slide${last.playerId === view.meId ? '' : 's'} ${via.from} → ${via.to}`, 'snake');
      if (last.playerId === view.meId) navigator.vibrate?.(60);
    }
  };
  const landed = (last: SnakesLastMove) => {
    if (last.bitten.length > 0) {
      sfx.snakeBite();
      for (const b of last.bitten) burst(b.from, '🐍', 'Bite!', 'bite');
      if (!reducedMotion())
        shake.current?.animate(
          [{ transform: 'translate(0,0)' }, { transform: 'translate(-5px,3px)' }, { transform: 'translate(4px,-3px)' }, { transform: 'translate(0,0)' }],
          { duration: 320 },
        );
      say(`🐍 Bite! ${name(last.playerId)} sent ${last.bitten.map((b) => name(b.playerId)).join(' & ')} back ${SNAKES_BITE_BACK}`, 'kill');
      if (last.bitten.some((b) => b.playerId === view.meId)) navigator.vibrate?.(80);
    } else if (last.to === SNAKES_GOAL) {
      sfx.ludoHome();
      const place = sv.seats.find((s) => s.playerId === last.playerId)?.place;
      say(`🏆 ${name(last.playerId)} reached 100!${place ? ` ${['1st', '2nd', '3rd', '4th'][place - 1]} place` : ''}`, 'home');
      confettiAt(seatEls.current.get(last.playerId), { count: 40, spread: 1 });
    } else if (last.bonus) {
      sfx.ludoBonus();
      say('🎲 Six! Roll again', 'bonus');
    }
  };

  // my turn to roll
  useOnChange(myTurn ? sv.rollSeq : null, (seq) => {
    if (seq === null) return;
    sfx.turn();
    if (navigator.userActivation?.hasBeenActive) navigator.vibrate?.(100);
  });

  useOnChange(view.phase, (phase) => {
    if (phase !== 'over' || view.stopped) return;
    (view.loserIds.includes(view.meId) ? sfx.lose : sfx.win)();
    view.winnerIds.forEach((w) => confettiAt(seatEls.current.get(w), w === view.meId ? { count: 60, spread: 1.3 } : { count: 30, spread: 0.8 }));
  });
  const myLevel = view.coinResults?.find((r) => r.playerId === view.meId)?.level ?? null;
  useEffect(() => {
    if (view.phase !== 'over' || !podiumDone || myLevel === null || startLevel.current === null || myLevel <= startLevel.current) return;
    setLevelUp(myLevel);
    startLevel.current = myLevel;
  }, [view.phase, podiumDone, myLevel]);

  const act = async (fn: () => Promise<unknown>) => {
    if (busy) return;
    unlockAudio();
    unlockSpeech();
    setBusy(true);
    await fn();
    setBusy(false);
  };
  const roll = () => act(() => actions.gameMove({ kind: 'snakes', move: { type: 'roll' } }));
  const toggleSound = () => {
    setSoundOn(!sound);
    setSound(!sound);
  };
  const canRoll = myTurn && !busy && !moving;

  // seats at the board corners, mine at the bottom left, the rest clockwise
  const meIdx = Math.max(0, sv.seats.findIndex((s) => s.playerId === view.meId));
  const n = sv.seats.length;
  const corners: (SnakesView['seats'][number] | undefined)[] = [undefined, undefined, undefined, undefined];
  sv.seats.forEach((s, j) => (corners[(CORNERS[n] ?? CORNERS[4])[(j - meIdx + n) % n]] = s));
  const seatChip = (corner: number) => {
    const s = corners[corner];
    const p = s ? view.players.find((x) => x.id === s.playerId) : undefined;
    if (!s || !p) return <div className="ld-seat-empty" />;
    return (
      <Seat
        player={p}
        turn={p.id === sv.turnId && playing}
        passed={false}
        bubble={bubbleOf(p.id)}
        onClick={p.id === view.meId ? undefined : () => setTarget(p.id)}
        label={`Throw an emoji at ${p.name}`}
        style={{ '--pc': `var(--ld-${s.color})` } as CSSProperties}
        extra={cx('ld-seat', 'sn-seat', 'pc-seat', `ld-${s.color}`, s.pos >= 90 && s.place === null && playing && 'ld-almost')}
        turnEndsAt={p.id === sv.turnId ? turnEndsAt : null}
        turnSec={view.config.turnSec}
        tag={
          <span className="ld-chip-stats sn-chip-stats">
            <span className={cx('sn-pos', s.pos === 0 && 'at-start')} title="Square">
              {s.pos === 0 ? '🚩 start' : `📍${s.pos}`}
            </span>
            <span title="Ladders">🪜{s.ladders}</span>
            <span title="Snakes">🐍{s.snakes}</span>
            <ColorTag color={`var(--ld-${s.color})`} name={colorName(s.color)} icon={<Goti color={s.color} style={gotiOf(p.id)} id={`chip-${p.id}`} />} mine={p.id === view.meId} showName />
          </span>
        }
        seatRef={(el) => {
          if (el) seatEls.current.set(p.id, el);
          else seatEls.current.delete(p.id);
        }}
      />
    );
  };

  // the dice keeps one spot under the board; its ring and name show whose turn it is
  const diceSeat = sv.seats.find((s) => s.playerId === diceBy.current) ?? null;
  const mySeat = sv.seats.find((s) => s.playerId === view.meId);

  const status = !playing ? '' : myTurn ? (moving ? 'Moving…' : 'Tap the dice to roll') : `${name(sv.turnId)} is rolling…`;
  const banner = flash ? (
    <p key={flash.key} className={cx('ld-flash', flash.kind)} role="status">
      {flash.text}
    </p>
  ) : (
    <p className="ld-turn-line">{status}</p>
  );
  const rulesLine = [sv.rules.exact ? 'Exact 100' : 'Any roll wins', sv.rules.six ? '6 to start' : null, sv.rules.bite ? 'Bite on' : null].filter(Boolean).join(' · ');

  return (
    <main className="table ld-table sn-table">
      <header className="topbar">
        <span className="code-chip">{view.code}</span>
        <span className="c7-chip ld-game-chip">
          🐍<span> Saanp Seedhi</span>
        </span>
        {view.config.stake > 0 && <span className="pot-chip">🪙 {compactCoins(pot)}</span>}
        <span className="grow" />
        <div className="topbar-actions">
          {isHost && view.watchRequests.length > 0 && (
            <button className="icon-btn req-btn" aria-label={`${view.watchRequests.length} people want to watch`} onClick={() => setPanel('requests')}>
              👀<span className="req-dot">{view.watchRequests.length}</span>
            </button>
          )}
          <LiveVoiceButtons view={view} onToast={actions.toast} />
          <QuickChat onSend={actions.chat} view={view} />
          <button className="icon-btn" aria-label="Goti and dice looks" onClick={() => setPanel('looks')}>
            🎨
          </button>
          <button className="icon-btn" aria-label="Game menu" onClick={() => setPanel('menu')}>
            ⋯
          </button>
        </div>
      </header>
      <LiveVoiceNotice />

      <div className="ld-row ld-row-top">
        {seatChip(0)}
        <div className="ld-mid">{banner}</div>
        {seatChip(1)}
      </div>

      <div className="ld-stage sn-stage">
        <div ref={shake} className="ld-board-wrap sn-board-wrap">
          <Board />
          <TokenLayer sv={sv} styleOf={gotiOf} turnId={playing ? sv.turnId : null} meId={view.meId} tagOf={(id) => (id === view.meId ? 'You' : (view.players.find((p) => p.id === id)?.name ?? '?'))} />
          {bursts.map((b) => (
            <span key={b.key} className={cx('sn-burst', b.kind)} style={{ '--x': b.x, '--y': b.y } as CSSProperties} aria-hidden>
              <i>{b.icon}</i>
              <b>{b.text}</b>
            </span>
          ))}
        </div>
      </div>

      <div className="ld-row ld-row-bottom">
        {seatChip(3)}
        <div className="ld-mid ld-dock-slot">
          <DiceDock
            value={sv.dice}
            seq={sv.rollSeq}
            skin={diceSkin}
            canRoll={canRoll}
            color={diceSeat?.color ?? null}
            gotiStyle={diceSeat ? gotiOf(diceSeat.playerId) : 'classic'}
            who={playing && diceSeat ? name(diceSeat.playerId) : null}
            mine={playing && diceSeat?.playerId === view.meId}
            watching={watching}
            hint={!playing ? undefined : myTurn ? (moving ? 'Moving…' : undefined) : 'Rolling…'}
            onRoll={() => void roll()}
          />
        </div>
        {seatChip(2)}
      </div>

      {mySeat && <YouAreBanner color={`var(--ld-${mySeat.color})`} name={colorName(mySeat.color)} icon={<Goti color={mySeat.color} style={gotiOf(mySeat.playerId)} id="you-are" />} playing={playing} />}
      <p className="ld-sixes sn-rules-line">
        {playing && sv.rules.bonus && sv.sixes > 0 && sv.sixes < 3 && sv.turnId ? `🎲 ${'6 '.repeat(sv.sixes).trim()} · three 6s lose the turn` : rulesLine}
      </p>

      {view.phase === 'over' && !podiumDone && !view.stopped && <SnakesPodium view={view} sv={sv} styleOf={gotiOf} onDone={() => setPodiumDone(true)} />}
      {view.phase === 'over' && (podiumDone || view.stopped) && (
        <GameOver view={view} onLobby={actions.toLobby} onRematch={isHost ? actions.rematch : undefined} startLevel={startLevel.current} />
      )}
      {levelUp !== null && <LevelUp level={levelUp} from={startLevel.current} onClose={() => setLevelUp(null)} />}
      {target && view.players.find((p) => p.id === target) && (
        <SeatSheet player={view.players.find((p) => p.id === target)!} auth={auth} onThrow={(i) => void actions.throwAt(target, i)} onClose={() => setTarget(null)} />
      )}
      {panel === 'looks' && (
        <Backdrop onClose={() => setPanel(null)}>
          <LudoLookPicker level={me?.level ?? 1} compact host={isHost} />
          <button className="btn ghost block" onClick={() => setPanel(null)}>
            Done
          </button>
        </Backdrop>
      )}
      <LudoMenus view={view} actions={actions} panel={panel} setPanel={setPanel} sound={sound} onToggleSound={toggleSound} />
    </main>
  );
}
