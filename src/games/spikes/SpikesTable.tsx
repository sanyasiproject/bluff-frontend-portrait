import { useEffect, useMemo, useRef, useState } from 'react';
import { useTimeouts } from '../../lib/useTimeouts';
import { useBack } from '../../lib/back';
import { cx } from '../../lib/cards';
import { compactCoins } from '../../lib/coins';
import { confettiAt, reducedMotion } from '../../lib/motion';
import { sfx, unlockAudio } from '../../lib/sounds';
import { isSoundOn, setSoundOn, unlockSpeech } from '../../lib/speech';
import { SPIKES_LIVES, type SpikesView, type SpikeWarning } from '../../types';
import { GameOver } from '../../components/Overlays';
import { LevelUp } from '../../components/LevelUp';
import { QuickChat } from '../../components/QuickChat';
import { LiveVoiceButtons, LiveVoiceNotice } from '../../components/LiveVoice';
import { SeatSheet, useOnChange } from '../../components/Table';
import type { PluggedTableProps } from '../registry';
import { LudoMenus, type Panel } from '../ludo/Menus';
import { ArcadePodium, partyColor, SeatStrip } from '../fruit/arcade';
import { useServerClock } from '../fruit/clock';
import { Arena, type StrikeFx, type Token } from './Arena';
import { Joystick, useJoystick } from './Joystick';
import { hitBy, reaches } from './geometry';
import { Motion } from './motion';
import '../../styles/spikes.css';
import '../../styles/spikes-temple.css';

const STRIKE_FX_MS = 750;

export function SpikesTable(props: PluggedTableProps) {
  const sp = props.view.plugged?.kind === 'spikes' ? props.view.plugged.spikes : null;
  if (!sp) return <main className="screen center-screen">Setting up the table…</main>;
  return <SpikesInner {...props} sp={sp} />;
}

const hearts = (n: number) => (n > 0 ? '❤️'.repeat(n) + '🖤'.repeat(Math.max(0, SPIKES_LIVES - n)) : '👻');

function SpikesInner({ view, actions, bubbles, auth, sp }: PluggedTableProps & { sp: SpikesView }) {
  const later = useTimeouts();
  const [sound, setSound] = useState(isSoundOn);
  const [panel, setPanel] = useState<Panel>(null);
  useBack(() => setPanel('menu'));
  const [target, setTarget] = useState<string | null>(null);
  const [podiumDone, setPodiumDone] = useState(false);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const [fx, setFx] = useState<StrikeFx[]>([]);
  const [hits, setHits] = useState<Record<string, number>>({});
  const [shaking, setShaking] = useState(false);
  const [ouch, setOuch] = useState(0);
  const seatEls = useRef(new Map<string, HTMLElement>());
  const startLevel = useRef<number | null>(null);
  const clock = useServerClock();
  const actionsRef = useRef(actions);
  actionsRef.current = actions;
  const spRef = useRef(sp);
  spRef.current = sp;
  // strikes already shown or counted (old ones from before I opened the table don't replay)
  const [fired] = useState(() => new Set(sp.strikes.filter((s) => s.at < sp.now - 800).map((s) => s.id)));
  const [counted] = useState(() => new Set(fired));
  const warned = useRef(new Set<number>(sp.warnings.map((w) => w.id)));
  // my running (predicted here) and everyone else's (smoothed between updates)
  const [motion] = useState(() => new Motion(view.meId));
  const canMoveRef = useRef(false);

  const me = view.players.find((p) => p.id === view.meId);
  const watching = !me;
  const playing = view.phase === 'playing';
  const over = view.phase === 'over';
  const isHost = view.hostId === view.meId;
  const pot = view.config.stake * (view.players.length + view.leftPlayers.length);
  const myColor = partyColor(view, view.meId);
  const lives = (id: string) => sp.lives[id] ?? 0;
  const alive = !watching && lives(view.meId) > 0;

  useEffect(() => {
    clock.atLeast(sp.now);
    motion.addView(sp);
  }, [sp]);
  const [now, setNow] = useState(() => clock.now());

  const fire = (w: { id: number; dir: SpikeWarning['dir'] }) => {
    if (fired.has(w.id)) return;
    fired.add(w.id);
    sfx.spikeStrike();
    // the wall slams into the crates a moment later
    if ((spRef.current.boxes ?? []).length) later(() => sfx.spikeThud(), reducedMotion() ? 0 : 170);
    setFx((l) => [...l, { id: w.id, dir: w.dir }]);
    later(() => setFx((l) => l.filter((x) => x.id !== w.id)), STRIKE_FX_MS);
  };

  // 60 fps: countdowns, warning sounds, the tick as a strike nears, strikes right on time
  useEffect(() => {
    let raf = 0;
    let lastTick = '';
    let prev = performance.now();
    const loop = () => {
      const t = clock.now();
      const s = spRef.current;
      const f = performance.now();
      motion.frame(s, t, f - prev, joy.vec.current, canMoveRef.current, (x, y) => void actionsRef.current.gameMoveQuiet({ kind: 'spikes', move: { type: 'move', x, y } }));
      prev = f;
      setNow(t);
      let soon: SpikeWarning | null = null;
      for (const w of s.warnings) {
        if (!warned.current.has(w.id)) {
          warned.current.add(w.id);
          if (s.phase === 'play') sfx.spikeWarn();
        }
        if (w.strikeAt <= t) fire(w);
        else if (!soon || w.strikeAt < soon.strikeAt) soon = w;
      }
      if (soon && s.phase === 'play') {
        const rem = soon.strikeAt - t;
        const every = rem > 1000 ? 500 : 170;
        const key = `${soon.id}:${Math.floor(rem / every)}`;
        if (key !== lastTick) {
          lastTick = key;
          sfx.spikeTick(Math.max(0, Math.min(1, 1 - rem / 3000)));
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // strikes from the server: who got hit
  useEffect(() => {
    for (const s of sp.strikes) {
      fire(s);
      if (counted.has(s.id)) continue;
      counted.add(s.id);
      if (!s.hit.length) continue;
      setHits((h) => ({ ...h, ...Object.fromEntries(s.hit.map((id) => [id, (h[id] ?? 0) + 1])) }));
      if (s.hit.includes(view.meId)) {
        sfx.spikeHit();
        navigator.vibrate?.([90, 50, 90]);
        setOuch((n) => n + 1);
        setShaking(true);
        later(() => setShaking(false), 450);
      }
    }
  }, [sp.strikes]);

  // a new game
  useEffect(() => {
    if (!playing) return;
    startLevel.current = me?.level ?? null;
    setPodiumDone(false);
    motion.reset();
    motion.addView(spRef.current);
  }, [view.phase]);
  const count = !playing || sp.phase === 'over' ? null : now < sp.startsAt ? Math.ceil((sp.startsAt - now) / 1000) : now - sp.startsAt < 800 ? 0 : null;
  useOnChange(count, (n) => {
    if (n !== null) sfx.arcadeBeep(n === 0);
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

  const canMove = alive && playing && sp.phase === 'play';
  canMoveRef.current = canMove;
  const joy = useJoystick(canMove);

  const toggleSound = () => {
    setSoundOn(!sound);
    setSound(!sound);
  };
  const wake = () => {
    unlockAudio();
    unlockSpeech();
  };

  const boxes = sp.boxes ?? [];
  const reach = useMemo(() => reaches(sp.size, boxes), [sp.size, JSON.stringify(boxes)]);
  const liveWarn = sp.phase === 'play' ? sp.warnings.filter((w) => w.strikeAt > now) : [];
  // seconds until a warned wall reaches where I stand
  const dangerOf = (p: [number, number]) => {
    const w = liveWarn.filter((x) => hitBy(p, x.dir, reach[x.dir], sp.size)).sort((a, b) => a.strikeAt - b.strikeAt)[0];
    return w ? Math.max(1, Math.ceil((w.strikeAt - now) / 1000)) : null;
  };
  const all = [...view.players, ...view.leftPlayers];
  const ids = Object.keys(sp.pos);
  const tokens: Token[] = ids.map((id) => {
    const p = all.find((x) => x.id === id);
    const m = motion.of(id, sp.pos[id]);
    return {
      id,
      x: m.p[0],
      y: m.p[1],
      moving: m.moving && lives(id) > 0,
      face: m.face,
      color: partyColor(view, id),
      initial: (p?.name ?? '?').trim().charAt(0).toUpperCase(),
      name: (p?.name ?? '?').trim().slice(0, 7),
      lives: lives(id),
      me: id === view.meId,
      ghost: lives(id) <= 0,
      safe: (sp.safeUntil[id] ?? 0) > now && lives(id) > 0,
      hits: hits[id] ?? 0,
      danger: id === view.meId && alive && sp.phase === 'play' ? dangerOf(m.p) : null,
    };
  });
  // living players on top, me above everyone
  tokens.sort((a, b) => Number(!a.ghost) - Number(!b.ghost) || Number(a.me) - Number(b.me));
  const left = ids.filter((id) => lives(id) > 0).length;
  const hint = watching
    ? '👀 Watching: dodge along with them'
    : sp.phase === 'countdown'
      ? 'Get ready: hide behind a crate when a side glows red!'
      : sp.phase === 'over'
        ? ''
        : alive
          ? liveWarn.length
            ? '📦 Get behind a crate, out of the red!'
            : sp.boxesNext && (sp.boxesAt ?? 0) > now
              ? '🧱 Crates are moving: keep off the outlines!'
            : '🕹️ Drag anywhere to run · crates stop the spikes'
          : "👻 You're out: cheer the others on";
  const name = (id: string) => (id === view.meId ? 'You' : (all.find((p) => p.id === id)?.name ?? 'Someone'));
  const byLives = [...ids].sort((a, b) => lives(b) - lives(a));
  const placeOf = (id: string) => sp.places[id] ?? (view.winnerIds.includes(id) ? 1 : byLives.findIndex((x) => lives(x) === lives(id)) + 1);

  return (
    <main className="table ar-table sp-table" onPointerDown={wake}>
      <header className="topbar">
        <span className="code-chip">{view.code}</span>
        <span className="ar-timer sp-left" aria-label={`${left} players left`}>
          {`🔺 ${left} left`}
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
        extraOf={(p) => lives(p.id) <= 0 && 'ar-out'}
        blob
        tagOf={(p) => (
          <span key={lives(p.id)} className="ar-tag sp-hearts bump" aria-label={`${lives(p.id)} lives`}>
            <i>{lives(p.id) > 0 ? '❤️' : '👻'}</i>
            <b>{lives(p.id)}</b>
          </span>
        )}
      />

      <div className="sp-play" {...joy.zone}>
        <div className={cx('sp-stage', shaking && !reducedMotion() && 'shake')}>
          {ouch > 0 && <span key={ouch} className="sp-hitflash" aria-hidden />}
          <Arena size={sp.size} now={now} boxes={boxes} reach={reach} warnings={sp.phase === 'play' ? sp.warnings : []} strikes={fx} tokens={tokens} boxesNext={sp.phase === 'play' ? sp.boxesNext : undefined} boxesAt={sp.boxesAt} peek={!!joy.touch} />
          {count !== null && (
            <div className="ar-count" aria-live="polite">
              <b key={count} className={cx(count === 0 && 'go')}>
                {count === 0 ? 'GO!' : count}
              </b>
            </div>
          )}
        </div>
        <p className="ar-hint sp-hint">{hint}</p>
        {!watching && (
          <div className={cx('sp-thumb', !canMove && 'off', joy.touch && 'busy')} aria-hidden>
            <span className="sp-thumb-ring" style={{ '--pc': myColor } as React.CSSProperties}>
              <i />
            </span>
          </div>
        )}
        <Joystick touch={joy.touch} color={myColor} />
      </div>

      {over && !podiumDone && !view.stopped && (
        <ArcadePodium
          view={view}
          title="🔺 Last one standing"
          rows={ids.map((id) => ({ id, place: placeOf(id), main: hearts(lives(id)) }))}
          onDone={() => setPodiumDone(true)}
          recap={
            <ul>
              {ids.map((id) => (
                <li key={id}>
                  <b data-no-translate>{name(id)}</b>: {`💔 ${SPIKES_LIVES - lives(id)} hit${SPIKES_LIVES - lives(id) === 1 ? '' : 's'}`}
                </li>
              ))}
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
