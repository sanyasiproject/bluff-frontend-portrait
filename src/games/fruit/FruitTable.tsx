import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useBack } from '../../lib/back';
import { cx } from '../../lib/cards';
import { compactCoins } from '../../lib/coins';
import { confettiAt, reducedMotion } from '../../lib/motion';
import { sfx, unlockAudio } from '../../lib/sounds';
import { isSoundOn, setSoundOn, unlockSpeech } from '../../lib/speech';
import { FRUIT_POINTS, type FruitView } from '../../types';
import { GameOver } from '../../components/Overlays';
import { LevelUp } from '../../components/LevelUp';
import { QuickChat } from '../../components/QuickChat';
import { LiveVoiceButtons, LiveVoiceNotice } from '../../components/LiveVoice';
import { SeatSheet, useOnChange } from '../../components/Table';
import type { PluggedTableProps } from '../registry';
import { LudoMenus, type Panel } from '../ludo/Menus';
import { ArcadePodium, partyColor, placesByScore, SeatStrip } from './arcade';
import { useServerClock } from './clock';
import { usePlayArea, type CutHit } from './usePlayArea';
import '../../styles/fruit.css';

/** the countdown before the fruit fly, on the server (spec: 3 s) */
const COUNTDOWN_MS = 3000;

interface Pop { id: number; x: number; y: number; text: string; cls: string }

export function FruitTable(props: PluggedTableProps) {
  const fr = props.view.plugged?.kind === 'fruit' ? props.view.plugged.fruit : null;
  if (!fr) return <main className="screen center-screen">Setting up the table…</main>;
  return <FruitInner {...props} fr={fr} />;
}

function FruitInner({ view, actions, bubbles, auth, fr }: PluggedTableProps & { fr: FruitView }) {
  const [sound, setSound] = useState(isSoundOn);
  const [panel, setPanel] = useState<Panel>(null);
  useBack(() => setPanel('menu'));
  const [target, setTarget] = useState<string | null>(null);
  const [podiumDone, setPodiumDone] = useState(false);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const [pops, setPops] = useState<Pop[]>([]);
  const [boom, setBoom] = useState(0);
  const [shaking, setShaking] = useState(false);
  const seatEls = useRef(new Map<string, HTMLElement>());
  const startLevel = useRef<number | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const popId = useRef(0);
  const clock = useServerClock();

  const me = view.players.find((p) => p.id === view.meId);
  const watching = !me;
  const playing = view.phase === 'playing';
  const over = view.phase === 'over';
  const isHost = view.hostId === view.meId;
  const pot = view.config.stake * (view.players.length + view.leftPlayers.length);
  const myColor = partyColor(view, view.meId);

  // line up with the server's clock from each view's stamp (older servers: from the countdown's start)
  useEffect(() => {
    if (fr.now) return clock.atLeast(fr.now);
    if (fr.phase === 'countdown') {
      clock.atLeast(fr.startsAt - COUNTDOWN_MS);
      clock.below(fr.startsAt);
    } else if (fr.phase === 'play') {
      if (Date.now() < fr.startsAt) clock.atLeast(fr.startsAt);
      clock.below(fr.endsAt);
    }
  }, [fr]);

  const pop = (x: number, y: number, text: string, cls: string) => {
    const id = ++popId.current;
    setPops((list) => [...list.slice(-8), { id, x, y, text, cls }]);
    window.setTimeout(() => setPops((list) => list.filter((p) => p.id !== id)), 1000);
  };

  const onCut = ({ f, x, y }: CutHit) => {
    if (f.kind === 'bomb') {
      sfx.fruitBomb();
      navigator.vibrate?.([80, 40, 120]);
      setBoom((n) => n + 1);
      setShaking(true);
      window.setTimeout(() => setShaking(false), 450);
      pop(x, y, '💣 −10', 'bomb');
      return;
    }
    sfx.fruitSlice();
    pop(x, y, `+${FRUIT_POINTS[f.kind]}`, 'pts');
  };
  const onSend = (ids: number[], at: number) => {
    const fruit = ids.filter((id) => area.wave.find((f) => f.id === id)?.kind !== 'bomb').length;
    if (fruit >= 3) {
      sfx.fruitCombo(fruit);
      navigator.vibrate?.(40);
      const box = wrap.current;
      pop((box?.clientWidth ?? 300) / 2, (box?.clientHeight ?? 400) * 0.38, `COMBO ×${fruit}!  +${fruit - 2}`, 'combo');
    }
    void actions.gameMoveQuiet({ kind: 'fruit', move: { type: 'slice', ids, at } });
  };
  const area = usePlayArea({
    canvas,
    wrap,
    fr,
    clock,
    meId: view.meId,
    canCut: !watching && playing,
    blade: myColor,
    onCut,
    onSend,
    onOther: (id) => (id === view.meId ? null : partyColor(view, id)),
  });

  // a new game
  useEffect(() => {
    if (!playing) return;
    startLevel.current = me?.level ?? null;
    setPodiumDone(false);
  }, [view.phase]);
  // 3-2-1-GO beeps, and ticks in the last 5 seconds
  useOnChange(area.count, (n) => {
    if (n === null || !playing) return;
    sfx.arcadeBeep(n === 0);
    if (n === 0) unlockAudio();
  });
  useOnChange(area.secs, (s) => {
    if (s !== null && s > 0 && s <= 5 && fr.phase === 'play') sfx.arcadeTick(s <= 2);
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
  const lowTime = area.secs !== null && area.secs <= 10 && fr.phase === 'play';
  const hint = watching
    ? '👀 Watching: everyone slices the same fruit'
    : fr.phase === 'countdown'
      ? 'Get ready: swipe across the fruit to slice'
      : fr.phase === 'play'
        ? 'Swipe to slice · keep off the 💣'
        : '';

  const ids = [...view.players, ...view.leftPlayers].map((p) => p.id).filter((id) => id in fr.scores || view.players.some((p) => p.id === id));
  const places = placesByScore(ids, score);
  const most = (rec: Record<string, number>) => ids.reduce<string | null>((b, id) => ((rec[id] ?? 0) > (b ? (rec[b] ?? 0) : 0) ? id : b), null);
  const sliced = Object.fromEntries(ids.map((id) => [id, (fr.sliced[id] ?? []).length]));
  const name = (id: string | null) => (id === view.meId ? 'You' : ([...view.players, ...view.leftPlayers].find((p) => p.id === id)?.name ?? 'Someone'));
  const comboKing = most(fr.combo);
  const slicer = most(sliced);
  const bomber = most(fr.bombs);

  return (
    <main className={cx('table ar-table fr-table')} onPointerDown={wake}>
      <header className="topbar">
        <span className="code-chip">{view.code}</span>
        {area.secs !== null && (
          <span className={cx('ar-timer', lowTime && 'low')} role="timer" aria-label={`${area.secs} seconds left`}>
            ⏱ {area.secs}s
          </span>
        )}
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
            <i>🍉</i>
            <b>{score(p.id)}</b>
          </span>
        )}
      />

      <div className={cx('fr-area', shaking && !reducedMotion() && 'shake')} ref={wrap} style={{ '--pc': myColor } as CSSProperties}>
        <canvas ref={canvas} className="fr-canvas" aria-label="Fruit play area: swipe to slice" />
        {boom > 0 && <span key={boom} className="fr-flash" aria-hidden />}
        {pops.map((p) => (
          <span key={p.id} className={cx('fr-pop', p.cls)} style={{ left: p.x, top: p.y }} aria-hidden>
            {p.text}
          </span>
        ))}
        {area.count !== null && playing && (
          <div className="ar-count" aria-live="polite">
            <b key={area.count} className={cx(area.count === 0 && 'go')}>
              {area.count === 0 ? 'SLICE!' : area.count}
            </b>
          </div>
        )}
      </div>
      <p className="ar-hint">{hint}</p>

      {over && !podiumDone && !view.stopped && (
        <ArcadePodium
          view={view}
          title="🍉 Time's up!"
          rows={ids.map((id) => ({ id, place: places[id], main: `${score(id)} pts` }))}
          onDone={() => setPodiumDone(true)}
          recap={
            <ul>
              {slicer && (
                <li>
                  🔪 Most sliced: <b data-no-translate>{name(slicer)}</b> ×{sliced[slicer]}
                </li>
              )}
              {comboKing && (fr.combo[comboKing] ?? 0) >= 3 && (
                <li>
                  ⚡ Best combo: <b data-no-translate>{name(comboKing)}</b> ×{fr.combo[comboKing]}
                </li>
              )}
              {bomber && (
                <li>
                  💣 Bomb magnet: <b data-no-translate>{name(bomber)}</b> ×{fr.bombs[bomber]}
                </li>
              )}
            </ul>
          }
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
