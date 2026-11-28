import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { useBack } from '../../lib/back';
import { cx } from '../../lib/cards';
import { compactCoins } from '../../lib/coins';
import { confettiAt } from '../../lib/motion';
import { sfx, unlockAudio } from '../../lib/sounds';
import { isSoundOn, setSoundOn, unlockSpeech } from '../../lib/speech';
import { FRUIT_ITEM_POINTS, FRUIT_MAGNET_ROUNDS, FRUIT_MIN_REACTION_MS, type FruitView } from '../../types';
import { GameOver } from '../../components/Overlays';
import { LevelUp } from '../../components/LevelUp';
import { QuickChat } from '../../components/QuickChat';
import { LiveVoiceButtons, LiveVoiceNotice } from '../../components/LiveVoice';
import { SeatSheet, useOnChange } from '../../components/Table';
import type { PluggedTableProps } from '../registry';
import { LudoMenus, type Panel } from '../ludo/Menus';
import { ArcadePodium, partyColor, placesByScore, SeatStrip } from './arcade';
import { useServerClock } from './clock';
import { CONTACT_MS, Duel, type DuelPlayer, type DuelResult } from './Duel';
import { FruitRecap, useDuelLog } from './log';
import '../../styles/fruit.css';
import '../../styles/fruit-talwar.css';

/** a result stays on the plate this long, then "Get ready…" */
const RESULT_MS = 1300;

export function FruitTable(props: PluggedTableProps) {
  const fr = props.view.plugged?.kind === 'fruit' ? props.view.plugged.fruit : null;
  if (!fr) return <main className="screen center-screen">Setting up the table…</main>;
  return <FruitInner {...props} fr={fr} />;
}

const secs = (ms: number) => `${(ms / 1000).toFixed(2)}s`;

function FruitInner({ view, actions, bubbles, auth, fr }: PluggedTableProps & { fr: FruitView }) {
  const [sound, setSound] = useState(isSoundOn);
  const [panel, setPanel] = useState<Panel>(null);
  useBack(() => setPanel('menu'));
  const [target, setTarget] = useState<string | null>(null);
  const [podiumDone, setPodiumDone] = useState(false);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const [swing, setSwing] = useState<{ key: number; slow: boolean; hit?: boolean; magnet?: boolean } | null>(null);
  const [early, setEarly] = useState(0);
  const [note, setNote] = useState<{ key: number; text: string; cls: string } | null>(null);
  const [mine, setMine] = useState<{ round: number; ms: number } | null>(null);
  const [showResult, setShowResult] = useState<number | null>(null);
  const seatEls = useRef(new Map<string, HTMLElement>());
  const startLevel = useRef<number | null>(null);
  // when the item up now was painted on this screen, and the item I've already struck
  const painted = useRef<{ round: number; at: number } | null>(null);
  const struck = useRef(0);
  const clock = useServerClock();
  const [now, setNow] = useState(() => clock.now());

  const me = view.players.find((p) => p.id === view.meId);
  const watching = !me;
  const playing = view.phase === 'playing';
  const over = view.phase === 'over';
  const isHost = view.hostId === view.meId;
  const pot = view.config.stake * (view.players.length + view.leftPlayers.length);
  const myColor = partyColor(view, view.meId);
  const all = [...view.players, ...view.leftPlayers];
  const name = (id: string | null) => (id === view.meId ? 'You' : (all.find((p) => p.id === id)?.name ?? 'Someone'));
  const log = useDuelLog(fr);
  const mySlow = fr.slow[view.meId] ?? 0;

  useEffect(() => clock.atLeast(fr.now), [fr.now]);
  // the countdown runs on the server's clock
  useEffect(() => {
    if (fr.phase !== 'countdown') return;
    const t = window.setInterval(() => setNow(clock.now()), 100);
    return () => window.clearInterval(t);
  }, [fr.phase]);
  const count = !playing || fr.phase === 'over' ? null : fr.phase === 'countdown' ? Math.max(1, Math.ceil((fr.startsAt - now) / 1000)) : !fr.item && fr.round <= 1 && !fr.result && now - fr.startsAt < 800 ? 0 : null;
  useOnChange(count, (n) => {
    if (n !== null) sfx.arcadeBeep(n === 0);
  });

  // the item is painted: the reaction clock on this phone starts from that frame
  useLayoutEffect(() => {
    const item = fr.item;
    if (!item) return;
    const id = requestAnimationFrame((t) => (painted.current = { round: item.round, at: t }));
    return () => cancelAnimationFrame(id);
  }, [fr.item?.round]);

  // a result: cut or zap sounds, my slowed pop; it shows for a moment
  useOnChange(fr.result?.round ?? null, (round) => {
    const r = fr.result;
    if (round === null || !r) return;
    setShowResult(round);
    window.setTimeout(() => setShowResult((x) => (x === round ? null : x)), RESULT_MS);
    if (r.kind === 'magnet') {
      if (r.slowed.length) sfx.magnetZap();
      if (r.slowed.includes(view.meId)) {
        navigator.vibrate?.([60, 40, 60]);
        setNote({ key: round, text: `🧲 Slowed ${FRUIT_MAGNET_ROUNDS} items`, cls: 'slow' });
      }
    } else if (r.winner) {
      sfx.fruitSlice();
      if (r.winner === view.meId) setNote({ key: round, text: `+${FRUIT_ITEM_POINTS[r.kind]} ⚡ ${secs(r.reactions[view.meId] ?? 0)}`, cls: 'pts' });
    }
  });

  const canStrike = !watching && playing && fr.phase === 'play';
  const strike = () => {
    if (!canStrike) return;
    unlockAudio();
    const t = performance.now();
    const item = fr.item;
    const p = painted.current;
    if (!item || !p || p.round !== item.round) {
      // nothing up yet: a little wobble, nothing sent
      sfx.tooEarly();
      setEarly((n) => n + 1);
      setNote({ key: Date.now(), text: 'Too early!', cls: 'early' });
      return;
    }
    if (struck.current === item.round) return;
    struck.current = item.round;
    const reaction = Math.round(t - p.at);
    if (reaction < FRUIT_MIN_REACTION_MS) {
      // faster than a person can react: a guess, so this item is lost
      sfx.tooEarly();
      setEarly((n) => n + 1);
      setNote({ key: Date.now(), text: 'Too early!', cls: 'early' });
      return;
    }
    sfx.swordSwing(mySlow > 0);
    navigator.vibrate?.(25);
    const hit = item.kind !== 'magnet' && mySlow <= 0;
    // the blade bites the fruit just after the wind-up: shing
    if (hit) window.setTimeout(() => sfx.swordShing(), CONTACT_MS);
    setSwing({ key: item.round, slow: mySlow > 0, hit, magnet: item.kind === 'magnet' });
    setMine({ round: item.round, ms: reaction });
    void actions.gameMoveQuiet({ kind: 'fruit', move: { type: 'strike', round: item.round, reaction } });
  };
  const strikeRef = useRef(strike);
  strikeRef.current = strike;
  // a computer: Space strikes too
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key !== ' ' || e.repeat || (e.target as HTMLElement)?.closest?.('input, textarea, button, [contenteditable]')) return;
      e.preventDefault();
      strikeRef.current();
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);
  useEffect(() => {
    if (!note) return;
    const t = window.setTimeout(() => setNote(null), 1300);
    return () => window.clearTimeout(t);
  }, [note]);

  // a new game
  useEffect(() => {
    if (!playing) return;
    startLevel.current = me?.level ?? null;
    setPodiumDone(false);
    struck.current = 0;
  }, [view.phase]);
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

  const toggleSound = () => {
    setSoundOn(!sound);
    setSound(!sound);
  };
  const wake = () => {
    unlockAudio();
    unlockSpeech();
  };

  const score = (id: string) => fr.scores[id] ?? 0;
  const top = Math.max(0, ...view.players.map((p) => score(p.id)));
  const ids = all.map((p) => p.id).filter((id) => id in fr.scores || view.players.some((p) => p.id === id));
  const places = placesByScore(ids, score);
  // me at the bottom, the others clockwise in seat order
  const seated = view.players.slice(0, 4);
  const at = Math.max(0, seated.findIndex((p) => p.id === view.meId));
  const duelPlayers: DuelPlayer[] = [...seated.slice(at), ...seated.slice(0, at)].map((p) => ({ id: p.id, name: p.name.trim().slice(0, 8), color: partyColor(view, p.id), me: p.id === view.meId, slow: fr.slow[p.id] ?? 0 }));
  const result: DuelResult | null = !fr.item && fr.result && showResult === fr.result.round ? fr.result : null;
  const struckNow = !!fr.item && mine?.round === fr.item.round;
  const center = fr.phase === 'play' ? (fr.round >= fr.rounds && !fr.item ? '🏁' : 'Get ready…') : '';
  const hint = watching
    ? '👀 Watching: fastest sword takes the fruit'
    : fr.phase === 'countdown'
      ? 'Strike the fruit first · never the 🧲'
      : fr.phase === 'play'
        ? fr.item?.kind === 'magnet'
          ? "🧲 Magnet! Don't strike"
          : fr.item
            ? struckNow
              ? `⚔️ ${secs(mine!.ms)}`
              : '⚔️ STRIKE!'
            : 'Wait for it…'
        : '';
  // everyone's time for the last item, fastest first
  const times = result
    ? Object.entries(result.reactions)
        .filter((e): e is [string, number] => e[1] != null)
        .sort((a, b) => a[1] - b[1])
    : [];

  return (
    <main className={cx('table ar-table fr-table')} onPointerDown={wake}>
      <header className="topbar">
        <span className="code-chip">{view.code}</span>
        <span className="ar-timer fr-round" aria-label={`Item ${fr.round} of ${fr.rounds}`}>
          🍉 {Math.max(1, fr.round)}/{fr.rounds}
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

      <SeatStrip
        view={view}
        bubbles={bubbles}
        seatEls={seatEls}
        onTarget={setTarget}
        extraOf={(p) => top > 0 && score(p.id) === top && 'ar-lead'}
        tagOf={(p) => (
          <span key={score(p.id)} className="ar-tag bump" aria-label={`${score(p.id)} points`}>
            <i>{(fr.slow[p.id] ?? 0) > 0 ? '🧲' : '🍉'}</i>
            <b>{score(p.id)}</b>
          </span>
        )}
      />

      <div className="fr-stage">
        <Duel players={duelPlayers} round={fr.round} item={fr.item} result={result} swing={swing} count={count} center={center} early={early} />
        {times.length > 0 && (
          <ul key={`t${result!.round}`} className="fr-times" aria-label="Reaction times">
            {times.map(([id, ms]) => (
              <li key={id} className={cx(id === result!.winner && 'won', result!.slowed.includes(id) && 'zapped')} style={{ '--pc': partyColor(view, id) } as CSSProperties}>
                <b data-no-translate={id === view.meId ? undefined : true}>{name(id)}</b> {secs(ms)}
                {id === result!.winner ? ' ⚡' : result!.slowed.includes(id) ? ' 🧲' : ''}
              </li>
            ))}
          </ul>
        )}
        {note && (
          <span key={`n${note.key}`} className={cx('fr-note', note.cls)} aria-live="polite">
            {note.text}
          </span>
        )}
      </div>
      <p className={cx('ar-hint fr-hint', fr.item?.kind === 'magnet' && 'mag', fr.item && fr.item.kind !== 'magnet' && !struckNow && 'go')}>{hint}</p>
      {!watching && (
        <div className="fr-foot">
          <button
            type="button"
            className={cx('fr-strike', mySlow > 0 && 'slowed', !canStrike && 'off', struckNow && 'done')}
            style={{ '--pc': myColor } as CSSProperties}
            onPointerDown={(e) => {
              e.preventDefault();
              strike();
            }}
            onContextMenu={(e) => e.preventDefault()}
            aria-label="Strike"
          >
            <span className="fr-strike-ico">⚔️</span>
            <b>STRIKE</b>
            {mySlow > 0 && <small>{`🧲 slow ×${mySlow}`}</small>}
          </button>
        </div>
      )}

      {over && !podiumDone && !view.stopped && (
        <ArcadePodium
          view={view}
          title="🍉 Fruit Slice Duel"
          rows={ids.map((id) => ({ id, place: places[id], main: `${score(id)} pts` }))}
          onDone={() => setPodiumDone(true)}
          recap={<FruitRecap log={log} name={name} />}
        />
      )}
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
