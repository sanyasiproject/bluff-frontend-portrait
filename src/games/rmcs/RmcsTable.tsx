import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useBack } from '../../lib/back';
import { cx } from '../../lib/cards';
import { compactCoins } from '../../lib/coins';
import { confettiAt, reducedMotion, useCountUp } from '../../lib/motion';
import { sfx, unlockAudio } from '../../lib/sounds';
import { isSoundOn, setSoundOn, unlockSpeech } from '../../lib/speech';
import { RMCS_EMOJI, RMCS_NAMES, type PublicPlayer, type RmcsRole, type RmcsView } from '../../types';
import { GameOver } from '../../components/Overlays';
import { LevelUp } from '../../components/LevelUp';
import { QuickChat } from '../../components/QuickChat';
import { LiveVoiceButtons, LiveVoiceNotice } from '../../components/LiveVoice';
import { Seat, SeatSheet, useOnChange } from '../../components/Table';
import type { PluggedTableProps } from '../registry';
import { LudoMenus, type Panel } from '../ludo/Menus';
import { Chit, type Spot } from './Chit';
import { RmcsPodium } from './Podium';
import '../../styles/rmcs.css';

const BUBBLE_MS = 4000;
/** seats clockwise from me at the bottom */
const SPOTS: Spot[] = ['bottom', 'left', 'top', 'right'];

/** seconds left until a time, ticking */
function useSecondsLeft(endsAt: number | null): number | null {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!endsAt) return;
    const t = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(t);
  }, [endsAt]);
  return endsAt ? Math.max(0, Math.ceil((endsAt - now) / 1000)) : null;
}

/** a seat's running score, counting up when points land */
function Score({ value }: { value: number }) {
  const shown = useCountUp(value, 900);
  return (
    <span key={value} className="rm-seat-score bump">
      ⭐ {shown.toLocaleString('en-IN')}
    </span>
  );
}

export function RmcsTable(props: PluggedTableProps) {
  const rm = props.view.plugged?.kind === 'rmcs' ? props.view.plugged.rmcs : null;
  if (!rm) return <main className="screen center-screen">Setting up the table…</main>;
  return <RmcsInner {...props} rm={rm} />;
}

function RmcsInner({ view, actions, bubbles, auth, rm }: PluggedTableProps & { rm: RmcsView }) {
  const [busy, setBusy] = useState(false);
  const [sound, setSound] = useState(isSoundOn);
  const [panel, setPanel] = useState<Panel>(null);
  useBack(() => setPanel('menu'));
  const [target, setTarget] = useState<string | null>(null);
  const [podiumDone, setPodiumDone] = useState(false);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  // the round I tapped my chit in, so it opens at once
  const [openedAt, setOpenedAt] = useState<number | null>(null);
  const [crown, setCrown] = useState(0);
  const seatEls = useRef(new Map<string, HTMLElement>());
  const startLevel = useRef<number | null>(null);

  const me = view.players.find((p) => p.id === view.meId);
  const watching = !me;
  const playing = view.phase === 'playing';
  const over = view.phase === 'over';
  const isHost = view.hostId === view.meId;
  const all = [...view.players, ...view.leftPlayers];
  const name = (id: string | null | undefined) => (id === view.meId ? 'You' : (all.find((p) => p.id === id)?.name ?? 'Someone'));
  const fresh = bubbles.filter((b) => Date.now() - b.at < BUBBLE_MS);
  const bubbleOf = (id: string) => [...fresh].reverse().find((b) => b.from === id) ?? null;
  const pot = view.config.stake * (view.players.length + view.leftPlayers.length);

  // seats: me at the bottom, the rest clockwise; watchers see the room's order
  const ids = view.players.map((p) => p.id);
  const start = Math.max(0, ids.indexOf(view.meId));
  const bySpot = new Map<Spot, PublicPlayer>();
  view.players.slice(0, 4).forEach((p, i) => bySpot.set(SPOTS[(i - start + 4) % 4], p));

  const last = rm.history[rm.history.length - 1] ?? null;
  const thisResult = (rm.phase === 'result' || over) && last !== null && last.round === rm.round ? last : null;
  const roleIn = (role: RmcsRole) => Object.keys(rm.shown).find((id) => rm.shown[id] === role) ?? null;
  const rajaId = roleIn('raja');
  const mantriId = roleIn('mantri');
  const chorId = thisResult ? (Object.keys(thisResult.roles).find((id) => thisResult.roles[id] === 'chor') ?? null) : null;
  const iOpened = rm.opened.includes(view.meId) || openedAt === rm.round;
  const iAmMantri = mantriId === view.meId && rm.phase === 'guess' && playing;
  const roleOf = (id: string): RmcsRole | null => rm.shown[id] ?? thisResult?.roles[id] ?? (id === view.meId && iOpened ? rm.myRole : null);
  const secs = useSecondsLeft(playing && rm.phase !== 'result' ? rm.endsAt : null);

  // a new game
  useEffect(() => {
    if (!playing) return;
    startLevel.current = me?.level ?? null;
    setPodiumDone(false);
  }, [view.phase]);

  // each round: the chits are dealt
  useOnChange(rm.round, () => {
    sfx.chitDeal();
    setOpenedAt(null);
  });
  // the Raja shows himself: fanfare and a crown burst
  useOnChange(rajaId, (id) => {
    if (!id || rm.phase !== 'open') return;
    sfx.rajaShown();
    setCrown((n) => n + 1);
  });
  // the Mantri's turn, then the verdict
  useOnChange(rm.phase, (phase) => {
    if (phase === 'guess' && iAmMantri) {
      sfx.turn();
      if (navigator.userActivation?.hasBeenActive) navigator.vibrate?.(100);
    }
    if (phase === 'result' && thisResult) {
      if (thisResult.correct) {
        sfx.chorCaught();
        navigator.vibrate?.([60, 60, 60]);
      } else sfx.chorEscaped();
    }
  });
  useOnChange(view.phase, (phase) => {
    if (phase !== 'over' || view.stopped) return;
    (view.loserIds.includes(view.meId) ? sfx.lose : sfx.win)();
    view.winnerIds.forEach((w) => confettiAt(seatEls.current.get(w), w === view.meId ? { count: 60, spread: 1.3 } : { count: 30, spread: 0.8 }));
  });
  const myLevel = view.coinResults?.find((r) => r.playerId === view.meId)?.level ?? null;
  useEffect(() => {
    if (!over || !podiumDone || myLevel === null || startLevel.current === null || myLevel <= startLevel.current) return;
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
  const openMine = () => {
    setOpenedAt(rm.round);
    sfx.chitOpen();
    void act(() => actions.gameMove({ kind: 'rmcs', move: { type: 'open' } }));
  };
  const guess = (id: string) => void act(() => actions.gameMove({ kind: 'rmcs', move: { type: 'guess', target: id } }));
  const toggleSound = () => {
    setSoundOn(!sound);
    setSound(!sound);
  };

  // the big line in the middle of the table
  const mantriName = name(mantriId);
  const headline = over
    ? '🏁 Game over'
    : rm.phase === 'open'
      ? rajaId
        ? `Raja is ${name(rajaId)} 👑`
        : `Round ${rm.round} of ${rm.rounds}`
      : rm.phase === 'guess'
        ? mantriId === view.meId
          ? 'Tap the Chor! 🔍'
          : `Mantri ${mantriName}, find the Chor!`
        : thisResult?.correct
          ? 'PAKDA GAYA! 🚨'
          : 'CHOR BHAAG GAYA! 💨';
  const hint = over
    ? ''
    : rm.phase === 'open'
      ? watching
        ? 'Everyone is opening their chit'
        : iOpened
          ? 'Waiting for the others to open'
          : 'Tap your chit to open it'
      : rm.phase === 'guess'
        ? iAmMantri
          ? 'One of the two glowing chits is the Chor'
          : `${mantriName} ${mantriId === view.meId ? 'are' : 'is'} thinking…`
        : thisResult
          ? thisResult.correct
            ? `${name(chorId)} ${chorId === view.meId ? 'were' : 'was'} the Chor · ${mantriName} caught ${chorId === view.meId ? 'you' : 'them'} 🦹`
            : `${mantriName} guessed wrong 😈 points swap`
          : '';
  const tone = rm.phase === 'result' && thisResult ? (thisResult.correct ? 'caught' : 'escaped') : rm.phase;

  const zone = (spot: Spot) => {
    const p = bySpot.get(spot);
    if (!p) return <div className={cx('rm-zone', `at-${spot}`)} />;
    const role = roleOf(p.id);
    const isMe = p.id === view.meId;
    const candidate = iAmMantri && p.id !== rajaId && p.id !== mantriId;
    const suspect = !isMe && !iAmMantri && rm.phase === 'guess' && playing && !!mantriId && p.id !== rajaId && p.id !== mantriId;
    const spotlit = rm.phase === 'guess' && p.id === mantriId;
    const seat = (
      <Seat
        player={p}
        turn={spotlit && playing}
        passed={false}
        bubble={bubbleOf(p.id)}
        onClick={isMe ? undefined : () => setTarget(p.id)}
        label={`Throw an emoji at ${p.name}`}
        extra={cx('rm-seat', spotlit && 'rm-spot', candidate && 'rm-cand')}
        tag={<Score value={rm.scores[p.id] ?? 0} />}
        seatRef={(el) => {
          if (el) seatEls.current.set(p.id, el);
          else seatEls.current.delete(p.id);
        }}
      />
    );
    const chit = (
      <Chit
        spot={spot}
        round={rm.round}
        role={role}
        opened={rm.opened.includes(p.id)}
        tapToOpen={isMe && playing && rm.phase === 'open' && !iOpened}
        candidate={candidate}
        suspect={suspect}
        spotlight={spotlit}
        run={!!thisResult && !thisResult.correct && p.id === chorId && !reducedMotion()}
        caught={!!thisResult && thisResult.correct && p.id === chorId}
        points={thisResult ? (thisResult.points[p.id] ?? 0) : null}
        big={isMe}
        onTap={isMe ? openMine : candidate ? () => guess(p.id) : undefined}
        label={candidate ? `${p.name} is the Chor` : isMe && !iOpened ? 'Open my chit' : undefined}
      />
    );
    return (
      <div className={cx('rm-zone', `at-${spot}`)}>
        {spot === 'bottom' ? chit : seat}
        {spot === 'bottom' ? seat : chit}
        {crown > 0 && p.id === rajaId && rm.phase === 'open' && (
          <span key={crown} className="rm-crown-burst" aria-hidden>
            {[0, 1, 2, 3, 4].map((i) => (
              <i key={i} style={{ '--i': i } as CSSProperties}>
                👑
              </i>
            ))}
          </span>
        )}
      </div>
    );
  };

  return (
    <main className={cx('table rm-table', `rm-${tone}`, rm.phase === 'guess' && playing && 'rm-guessing')}>
      <header className="topbar">
        <span className="code-chip">{view.code}</span>
        <span className="c7-chip rm-round-chip" aria-label={`Round ${rm.round} of ${rm.rounds}`}>
          👑<span>{` Round ${rm.round}/${rm.rounds}`}</span>
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
          <button className="icon-btn" aria-label="Game menu" onClick={() => setPanel('menu')}>
            ⋯
          </button>
        </div>
      </header>
      <LiveVoiceNotice />

      <div className="rm-stage">
        {zone('top')}
        {zone('left')}
        <div className="rm-mid">
          <p key={headline} className={cx('rm-headline', tone)} role="status">
            {headline}
          </p>
          {secs !== null && (
            <span className={cx('rm-clock', secs <= 5 && 'low')} role="timer" aria-label={`${secs} seconds left`}>
              ⏱ {secs}
            </span>
          )}
          {rm.phase === 'guess' && playing && (
            <span className="rm-mantri-glass" aria-hidden>
              🔍
            </span>
          )}
        </div>
        {zone('right')}
        {zone('bottom')}
        {tone === 'caught' && <span className="rm-siren" aria-hidden />}
      </div>

      <p className={cx('rm-hint', iAmMantri && 'live')}>{hint}</p>
      {!watching && rm.myRole && iOpened && rm.phase !== 'result' && playing && (
        <p className="rm-mine">
          You are the {RMCS_EMOJI[rm.myRole]} <b>{RMCS_NAMES[rm.myRole]}</b>
          {rm.myRole === 'chor' ? ': act innocent 🤫' : ''}
        </p>
      )}
      <ol className="rm-board" aria-label="Scores">
        {[...view.players]
          .sort((a, b) => (rm.scores[b.id] ?? 0) - (rm.scores[a.id] ?? 0))
          .map((p, i) => (
            <li key={p.id} className={cx(p.id === view.meId && 'me', i === 0 && (rm.scores[p.id] ?? 0) > 0 && 'top')}>
              <i>{i === 0 && (rm.scores[p.id] ?? 0) > 0 ? '👑' : i + 1}</i>
              <span data-no-translate>{p.id === view.meId ? 'You' : p.name}</span>
              <b>{(rm.scores[p.id] ?? 0).toLocaleString('en-IN')}</b>
            </li>
          ))}
      </ol>

      {over && !podiumDone && !view.stopped && <RmcsPodium view={view} rm={rm} onDone={() => setPodiumDone(true)} />}
      {over && (podiumDone || view.stopped) && (
        <GameOver view={view} onLobby={actions.toLobby} onRematch={isHost ? actions.rematch : undefined} startLevel={startLevel.current} />
      )}
      {levelUp !== null && <LevelUp level={levelUp} from={startLevel.current} onClose={() => setLevelUp(null)} />}
      {target && view.players.find((p) => p.id === target) && (
        <SeatSheet player={view.players.find((p) => p.id === target)!} auth={auth} onThrow={(i) => void actions.throwAt(target, i)} onClose={() => setTarget(null)} />
      )}
      <LudoMenus view={view} actions={actions} panel={panel} setPanel={setPanel} sound={sound} onToggleSound={toggleSound} />
    </main>
  );
}
