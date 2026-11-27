import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useBack } from '../../lib/back';
import { cx } from '../../lib/cards';
import { compactCoins } from '../../lib/coins';
import { confettiAt, reducedMotion } from '../../lib/motion';
import { sfx } from '../../lib/sounds';
import { isSoundOn, setSoundOn, unlockSpeech } from '../../lib/speech';
import { unlockAudio } from '../../lib/sounds';
import { LUDO_TOKENS, type LudoLastMove, type LudoView } from '../../types';
import { Backdrop, GameOver } from '../../components/Overlays';
import { LevelUp } from '../../components/LevelUp';
import { QuickChat } from '../../components/QuickChat';
import { LiveVoiceButtons, LiveVoiceNotice } from '../../components/LiveVoice';
import { Seat, SeatSheet, useOnChange } from '../../components/Table';
import { useTurnEndsAt } from '../../components/TurnTimer';
import type { PluggedTableProps } from '../registry';
import { Board } from './Board';
import { Dice, DICE_MS } from './Dice';
import { almostHome, cornerOf, spotOf, turnsFor } from './geometry';
import { LudoLookPicker } from './LookPicker';
import { LudoMenus, type Panel } from './Menus';
import { GotiLayer, moveMs } from './Pieces';
import { Podium } from './Podium';
import { useLudoLook } from './looks';
import '../../styles/ludo.css';

const BUBBLE_MS = 4000;
const MODE_NAME = { classic: 'Classic', quick: 'Quick', timed: 'Timed', master: 'Master' } as const;

/** a short line over the board: bonus roll, kill, three sixes */
interface Flash {
  key: number;
  text: string;
  kind: 'bonus' | 'kill' | 'home' | 'oops';
}

/** a "Kill!" burst where a goti was knocked off */
interface Burst {
  key: number;
  x: number;
  y: number;
}

function GameClock({ endsAt }: { endsAt: number }) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  const left = Math.max(0, Math.ceil((endsAt - now) / 1000));
  const text = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
  return (
    <span className={cx('rg-clock', left <= 30 && 'low')} role="timer" aria-label={`${text} of game time left`}>
      ⏱ {text}
    </span>
  );
}

export function LudoTable(props: PluggedTableProps) {
  const ld = props.view.plugged?.kind === 'ludo' ? props.view.plugged.ludo : null;
  if (!ld) return <main className="screen center-screen">Setting up the board…</main>;
  return <LudoInner {...props} ld={ld} />;
}

function LudoInner({ view, actions, bubbles, auth, ld }: PluggedTableProps & { ld: LudoView }) {
  const [busy, setBusy] = useState(false);
  const [sound, setSound] = useState(isSoundOn);
  const [panel, setPanel] = useState<Panel>(null);
  useBack(() => setPanel('menu'));
  const [target, setTarget] = useState<string | null>(null);
  const [flash, setFlash] = useState<Flash | null>(null);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [podiumDone, setPodiumDone] = useState(false);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const shake = useRef<HTMLDivElement>(null);
  const seatEls = useRef(new Map<string, HTMLElement>());
  const startLevel = useRef<number | null>(null);
  const flashSeq = useRef(0);

  const me = view.players.find((p) => p.id === view.meId);
  const watching = !me;
  const playing = view.phase === 'playing';
  const isHost = view.hostId === view.meId;
  const look = useLudoLook(me?.level ?? 1);
  const mySeat = ld.seats.find((s) => s.playerId === view.meId);
  const k = turnsFor(mySeat?.color ?? ld.seats[0]?.color);
  const myTurn = playing && ld.turnId === view.meId;
  const turnEndsAt = useTurnEndsAt(view);
  const name = (id: string | null | undefined) => (id === view.meId ? 'You' : ([...view.players, ...view.leftPlayers].find((p) => p.id === id)?.name ?? 'Someone'));
  const pot = view.config.stake * (view.players.length + view.leftPlayers.length);
  const fresh = bubbles.filter((b) => Date.now() - b.at < BUBBLE_MS);
  const bubbleOf = (id: string) => [...fresh].reverse().find((b) => b.from === id) ?? null;
  const moveFor = ld.movesFor ?? ld.turnId;
  const moveColor = myTurn && ld.rolled ? (ld.seats.find((s) => s.playerId === moveFor)?.color ?? null) : null;
  const turnSeat = ld.seats.find((s) => s.playerId === ld.turnId);
  const teamOf = (id: string): 'a' | 'b' | null => (ld.teams?.[0].includes(id) ? 'a' : ld.teams?.[1].includes(id) ? 'b' : null);
  const partnerId = ld.teams?.find((t) => t.includes(view.meId))?.find((id) => id !== view.meId) ?? null;

  const say = (text: string, kind: Flash['kind']) => setFlash({ key: ++flashSeq.current, text, kind });
  useEffect(() => {
    if (!flash) return;
    const t = window.setTimeout(() => setFlash(null), 1800);
    return () => window.clearTimeout(t);
  }, [flash]);

  // a new game
  useEffect(() => {
    if (!playing) return;
    startLevel.current = me?.level ?? null;
    setPodiumDone(false);
  }, [view.phase]);

  // each roll: the rattle; three sixes lose the turn
  const prevSixes = useRef(ld.sixes);
  useOnChange(ld.rollSeq, () => {
    sfx.ludoRoll();
    if (ld.dice === 6 && prevSixes.current === 2) window.setTimeout(() => (say(`Three 6s! ${name(turnSeat?.playerId ?? null)} lose${turnSeat?.playerId === view.meId ? '' : 's'} the turn`, 'oops'), sfx.ludoOops()), DICE_MS);
  });
  useEffect(() => {
    prevSixes.current = ld.sixes;
  });

  // each move lands: kill burst and shake, home chime, bonus roll
  useOnChange(ld.last?.seq ?? null, () => {
    const last = ld.last;
    if (last) window.setTimeout(() => landed(last), moveMs(last));
  });
  const landed = (last: LudoLastMove) => {
    if (last.captured.length > 0) {
      sfx.ludoKill();
      const [x, y] = spotOf(last.color, last.to, last.token, k);
      setBursts((all) => [...all, { key: last.seq, x, y }]);
      window.setTimeout(() => setBursts((all) => all.filter((b) => b.key !== last.seq)), 1200);
      if (!reducedMotion())
        shake.current?.animate(
          [{ transform: 'translate(0,0)' }, { transform: 'translate(-6px,3px)' }, { transform: 'translate(5px,-4px)' }, { transform: 'translate(-3px,2px)' }, { transform: 'translate(0,0)' }],
          { duration: 360 },
        );
      say(`💥 Kill! ${name(last.playerId)} knocked off ${last.captured.map((c) => name(c.playerId)).join(' & ')}`, 'kill');
      navigator.vibrate?.(80);
    } else if (last.home) {
      sfx.ludoHome();
      say('🏠 Home! Bonus roll', 'home');
    } else if (last.bonus) {
      sfx.ludoBonus();
      say('🎲 Six! Bonus roll', 'bonus');
    }
  };

  // my turn to roll
  useOnChange(myTurn && !ld.rolled ? ld.rollSeq : null, (seq) => {
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
  const roll = () => act(() => actions.gameMove({ kind: 'ludo', move: { type: 'roll' } }));
  const move = (token: number) => act(() => actions.gameMove({ kind: 'ludo', move: { type: 'move', token } }));
  const toggleSound = () => {
    setSoundOn(!sound);
    setSound(!sound);
  };

  const canRoll = myTurn && !ld.rolled && !busy;
  const corners: (typeof ld.seats[number] | undefined)[] = [0, 1, 2, 3].map((c) => ld.seats.find((s) => cornerOf(s.color, k) === c));
  const seatChip = (corner: number) => {
    const s = corners[corner];
    const p = s ? view.players.find((x) => x.id === s.playerId) : undefined;
    if (!s || !p) return <div className="ld-seat-empty" />;
    const close = s.tokens.some(almostHome) || s.home >= LUDO_TOKENS - 1;
    return (
      <Seat
        player={p}
        turn={p.id === ld.turnId && playing}
        passed={false}
        team={teamOf(p.id)}
        partner={p.id === partnerId}
        bubble={bubbleOf(p.id)}
        onClick={p.id === view.meId ? undefined : () => setTarget(p.id)}
        label={`Throw an emoji at ${p.name}`}
        extra={cx('ld-seat', `ld-${s.color}`, close && playing && 'ld-almost')}
        turnEndsAt={p.id === ld.turnId ? turnEndsAt : null}
        turnSec={view.config.turnSec}
        tag={
          <span className="ld-chip-stats">
            <span title="Kills">💥{s.kills}</span>
            <span title="Gotis home">🏠{s.home}/4</span>
            {ld.mode === 'timed' && <span className="ld-score">{s.score} pts</span>}
            {ld.mode === 'master' && <span aria-label={s.unlocked ? 'Home lane open' : 'Home lane locked until a kill'}>{s.unlocked ? '🔓' : '🔒'}</span>}
          </span>
        }
        seatRef={(el) => {
          if (el) seatEls.current.set(p.id, el);
          else seatEls.current.delete(p.id);
        }}
      />
    );
  };

  const status = !playing
    ? ''
    : myTurn
      ? ld.rolled
        ? ld.movable.length > 1
          ? 'Tap a glowing goti'
          : 'Moving…'
        : 'Tap the dice to roll'
      : `${name(ld.turnId)} ${ld.rolled ? 'is moving' : 'is rolling'}…`;
  const forPartner = playing && ld.movesFor && ld.movesFor !== ld.turnId ? `🤝 ${name(ld.turnId)} ${ld.turnId === view.meId ? 'move' : 'moves'} for ${name(ld.movesFor)}` : null;

  return (
    <main className={cx('table ld-table', `board-${look.board}`)}>
      <header className="topbar">
        <span className="code-chip">{view.code}</span>
        <span className="c7-chip ld-game-chip">
          🎲<span> Ludo · {MODE_NAME[ld.mode]}</span>
        </span>
        {view.config.stake > 0 && <span className="pot-chip">🪙 {compactCoins(pot)}</span>}
        {ld.endsAt && playing && <GameClock endsAt={ld.endsAt} />}
        <span className="grow" />
        <div className="topbar-actions">
          {isHost && view.watchRequests.length > 0 && (
            <button className="icon-btn req-btn" aria-label={`${view.watchRequests.length} people want to watch`} onClick={() => setPanel('requests')}>
              👀<span className="req-dot">{view.watchRequests.length}</span>
            </button>
          )}
          <LiveVoiceButtons view={view} onToast={actions.toast} />
          <QuickChat onSend={actions.chat} view={view} />
          <button className="icon-btn" aria-label="Board and goti looks" onClick={() => setPanel('looks')}>
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
        <div className="ld-banner-slot">
          {flash ? (
            <p key={flash.key} className={cx('ld-flash', flash.kind)} role="status">
              {flash.text}
            </p>
          ) : forPartner ? (
            <p className="ld-flash partner">{forPartner}</p>
          ) : (
            <p className="ld-turn-line">{status}</p>
          )}
        </div>
        {seatChip(1)}
      </div>

      <div className="ld-stage">
        <div ref={shake} className="ld-board-wrap">
          <Board turns={k} colors={ld.seats.map((s) => s.color)} />
          <GotiLayer ld={ld} k={k} gotiStyle={look.goti} moveColor={moveColor} legal={moveColor ? ld.movable : []} onPick={(t) => void move(t)} />
          {bursts.map((b) => (
            <span key={b.key} className="ld-burst" style={{ '--x': b.x, '--y': b.y } as CSSProperties} aria-hidden>
              <i>💥</i>
              <b>Kill!</b>
            </span>
          ))}
        </div>
      </div>

      <div className="ld-row ld-row-bottom">
        {seatChip(3)}
        <button
          type="button"
          className={cx('ld-roll', canRoll && 'live', turnSeat && `ld-${turnSeat.color}`)}
          disabled={!canRoll}
          aria-label={canRoll ? 'Roll the dice' : 'Dice'}
          onClick={() => void roll()}
        >
          <Dice value={ld.dice} seq={ld.rollSeq} skin={look.dice} live={canRoll} />
          <span className="ld-roll-label">{canRoll ? 'Tap to roll' : watching ? '👀 Watching' : myTurn ? status : ld.turnId ? name(ld.turnId) : '🏁'}</span>
        </button>
        {seatChip(2)}
      </div>

      {playing && ld.sixes > 0 && ld.turnId && <p className="ld-sixes">{`🎲 ${'6 '.repeat(ld.sixes).trim()} · three 6s lose the turn`}</p>}

      {view.phase === 'over' && !podiumDone && !view.stopped && <Podium view={view} ld={ld} gotiStyle={look.goti} onDone={() => setPodiumDone(true)} />}
      {view.phase === 'over' && (podiumDone || view.stopped) && (
        <GameOver view={view} onLobby={actions.toLobby} onRematch={isHost ? actions.rematch : undefined} startLevel={startLevel.current} />
      )}
      {levelUp !== null && <LevelUp level={levelUp} from={startLevel.current} onClose={() => setLevelUp(null)} />}
      {target && view.players.find((p) => p.id === target) && (
        <SeatSheet player={view.players.find((p) => p.id === target)!} auth={auth} onThrow={(i) => void actions.throwAt(target, i)} onClose={() => setTarget(null)} />
      )}
      {panel === 'looks' && (
        <Backdrop onClose={() => setPanel(null)}>
          <LudoLookPicker level={me?.level ?? 1} compact />
          <button className="btn ghost block" onClick={() => setPanel(null)}>
            Done
          </button>
        </Backdrop>
      )}
      <LudoMenus view={view} actions={actions} panel={panel} setPanel={setPanel} sound={sound} onToggleSound={toggleSound} />
    </main>
  );
}
