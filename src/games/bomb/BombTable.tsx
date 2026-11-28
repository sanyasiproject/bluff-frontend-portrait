import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useTimeouts } from '../../lib/useTimeouts';
import { cx } from '../../lib/cards';
import { reducedMotion } from '../../lib/motion';
import { useNow } from '../../lib/useNow';
import { sfx, unlockAudio } from '../../lib/sounds';
import { useOnChange } from '../../components/Table';
import type { BombView } from '../../types';
import type { PluggedTableProps } from '../registry';
import { PartyEnd, partyColor, partyOrder, PartySeat, PartyStrip, PartyTopbar, usePartyTable, type PartyToast } from '../dots/party';
import { BombArt, Blast, Heart } from './BombArt';
import { BombPodium } from './Podium';
import { TaskCard } from './TaskCard';
import '../../styles/ludo.css';
import '../../styles/pgames.css';
import '../../styles/bomb.css';
import '../../styles/bomb-table.css';

/** seat spots round the table (percent of the stage), mine first at the bottom, then clockwise */
const SPOTS: Record<number, [number, number][]> = {
  1: [[50, 84]],
  2: [[50, 84], [50, 14]],
  3: [[50, 84], [16, 26], [84, 26]],
  4: [[50, 84], [13, 48], [50, 13], [87, 48]],
};
/** fuse ticks: ms between ticks by heat */
const TICK_MS = [1000, 620, 400, 230];

export function BombTable(props: PluggedTableProps) {
  const bv = props.view.plugged?.kind === 'bomb' ? props.view.plugged.bomb : null;
  if (!bv) return <main className="screen center-screen">Lighting the fuse…</main>;
  return <BombInner {...props} bv={bv} />;
}

function BombInner({ view, actions, bubbles, auth, bv }: PluggedTableProps & { bv: BombView }) {
  const later = useTimeouts();
  const t = usePartyTable(view);
  const order = partyOrder(view, Object.keys(bv.hearts));
  const colorOf = (id: string | null | undefined) => partyColor(order, id);
  // server time to mine
  const skew = useMemo(() => Date.now() - bv.now, [bv.now]);
  const now = useNow(100);
  const srv = now - skew;
  const holding = t.playing && bv.phase === 'play' && bv.holder === view.meId;
  const shaking = srv < bv.shakeUntil;
  const [toast, setToast] = useState<PartyToast | null>(null);
  const [answered, setAnswered] = useState<number | null>(null);
  const [blast, setBlast] = useState<{ id: string; key: number } | null>(null);
  const [popped, setPopped] = useState<string | null>(null);
  const [soot, setSoot] = useState<string | null>(null);
  const seq = useRef(0);
  const stage = useRef<HTMLDivElement>(null);
  const bomb = useRef<HTMLDivElement>(null);
  const shakeEl = useRef<HTMLElement>(null);
  const say = (text: string, tone: PartyToast['tone']) => setToast({ key: ++seq.current, text, tone });
  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 1500);
    return () => window.clearTimeout(id);
  }, [toast]);

  // seats: mine at the bottom, the rest clockwise
  const live = order.filter((id) => view.players.some((p) => p.id === id)).slice(0, 4);
  const meAt = Math.max(0, live.indexOf(view.meId));
  const spots = SPOTS[live.length] ?? SPOTS[4];
  const spotOf = (id: string | null | undefined): [number, number] => {
    const i = id ? live.indexOf(id) : -1;
    return i < 0 ? [50, 50] : spots[(i - meAt + live.length) % live.length];
  };
  /** where the bomb rests: in front of the holder, towards the middle */
  const restOf = (id: string | null | undefined): [number, number] => {
    const [x, y] = spotOf(id);
    return id ? [50 + (x - 50) * 0.22, 50 + (y - 50) * 0.22] : [50, 50];
  };

  // the answer I sent stays locked until the task changes or the shake ends
  useOnChange(bv.task?.id ?? null, () => setAnswered(null));
  useOnChange(bv.shakeUntil, (u) => {
    if (u <= bv.now) return;
    setAnswered(null);
    if (bv.holder === view.meId) {
      sfx.bombWrong();
      navigator.vibrate?.(60);
    }
  });
  const answer = (i: number) => {
    if (!bv.task || answered !== null) return;
    unlockAudio();
    setAnswered(bv.task.id);
    void actions.gameMove({ kind: 'bomb', move: { type: 'answer', task: bv.task.id, choice: i } });
  };

  // a pass: the bomb flies in an arc to the next player
  const [x, y] = restOf(bv.phase === 'play' || bv.phase === 'countdown' ? bv.holder : null);
  const prev = useRef<[number, number]>([x, y]);
  useOnChange(bv.lastPass?.at ?? null, () => {
    const p = bv.lastPass;
    if (!p) return;
    sfx.bombPass();
    if (p.from === view.meId && p.ms <= 1500) say(`⚡ ${(p.ms / 1000).toFixed(1)}s!`, 'good');
  });
  useLayoutEffect(() => {
    const el = bomb.current;
    const [px, py] = prev.current;
    prev.current = [x, y];
    if (!el || (px === x && py === y) || reducedMotion()) return;
    const w = stage.current?.clientWidth ?? 300;
    const h = stage.current?.clientHeight ?? 300;
    const dx = ((px - x) / 100) * w;
    const dy = ((py - y) / 100) * h;
    el.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) rotate(0deg) scale(1)` },
        { transform: `translate(${dx / 2}px, ${dy / 2 - 70}px) rotate(200deg) scale(1.25)`, offset: 0.5 },
        { transform: 'translate(0, 0) rotate(360deg) scale(1)' },
      ],
      { duration: 520, easing: 'cubic-bezier(0.3, 0.7, 0.4, 1)' },
    );
  }, [x, y]);

  // BOOM: blast at the holder's seat, screen shake, soot, a heart pops
  useOnChange(bv.lastBoom?.at ?? null, () => {
    const b = bv.lastBoom;
    if (!b) return;
    sfx.bombBoom();
    navigator.vibrate?.([120, 60, 220]);
    setBlast({ id: b.playerId, key: b.at });
    setPopped(b.playerId);
    setSoot(b.playerId);
    say(b.out ? `💀 ${t.name(b.playerId)} ${b.playerId === view.meId ? 'are' : 'is'} out!` : `💥 BOOM! ${t.name(b.playerId)} lost a heart`, 'bad');
    if (!reducedMotion())
      shakeEl.current?.animate(
        [0, -9, 8, -6, 5, -3, 0].map((v, i) => ({ transform: `translate(${v}px, ${i % 2 ? -v / 2 : v / 2}px)` })),
        { duration: 520 },
      );
    later(() => setBlast(null), 1400);
    later(() => setPopped(null), 1000);
  });
  useOnChange(bv.round, () => setSoot(null));
  // the last BOOM plays out before the podium comes up
  const [podiumLate, setPodiumLate] = useState(view.phase === 'over');
  useEffect(() => {
    if (view.phase !== 'over') return setPodiumLate(false);
    const id = window.setTimeout(() => setPodiumLate(true), reducedMotion() ? 0 : 1800);
    return () => window.clearTimeout(id);
  }, [view.phase]);
  useOnChange(holding ? bv.round * 1000 + (bv.lastPass?.at ?? 0) : null, (k) => {
    if (k !== null) navigator.vibrate?.(30);
  });

  // the fuse ticks, faster as it heats
  useEffect(() => {
    if (!t.playing || bv.phase !== 'play') return;
    const id = window.setInterval(() => sfx.bombTick(bv.heat), TICK_MS[bv.heat]);
    return () => window.clearInterval(id);
  }, [t.playing, bv.phase, bv.heat]);

  const countdown = bv.phase === 'countdown' ? Math.max(1, Math.ceil((bv.startsAt - srv) / 1000)) : null;
  const next = bv.phase === 'boom' && bv.nextAt ? Math.max(1, Math.ceil((bv.nextAt - srv) / 1000)) : null;
  const status = !t.playing
    ? ''
    : countdown !== null
      ? `The fuse is lit in ${countdown}…`
      : next !== null
        ? `Next round in ${next}…`
        : holding
          ? shaking
            ? '❌ Wrong! Hold on…'
            : '💣 You have the bomb! Solve it to pass'
          : `${t.name(bv.holder)} ${bv.holder === view.meId ? 'have' : 'has'} the bomb`;

  return (
    <main ref={shakeEl} className={cx('table ld-table pg-table bm-table', holding && 'holding', `heat-${bv.heat}`)}>
      <PartyTopbar t={t} view={view} actions={actions} chip={<>💣<span>{` Round ${bv.round}`}</span></>} />

      <PartyStrip toast={toast} status={status} mine={holding} live={holding && !shaking} />

      <div ref={stage} className="pg-stage bm-stage">
        <div className="bm-felt" aria-hidden />
        {live.map((id) => {
          const [sx, sy] = spotOf(id);
          const hearts = bv.hearts[id] ?? 0;
          return (
            <div key={id} className={cx('bm-spot', soot === id && 'soot', bv.places[id] && 'out')} style={{ left: `${sx}%`, top: `${sy}%` }}>
              <PartySeat
                t={t}
                view={view}
                bubbles={bubbles}
                id={id}
                color={colorOf(id)}
                turn={bv.holder === id && bv.phase === 'play' && t.playing}
                extra={cx('pg-chip bm-seat', id === view.meId && 'pg-me')}
                tag={
                  <span className="bm-hearts">
                    {Array.from({ length: bv.maxHearts }, (_, i) => (
                      <Heart key={i} full={i < hearts} pop={popped === id && i === hearts} />
                    ))}
                  </span>
                }
              />
              {blast?.id === id && (
                <span key={blast.key} className="bm-blast-at">
                  <Blast />
                </span>
              )}
            </div>
          );
        })}
        {(bv.phase === 'play' || bv.phase === 'countdown') && (
          <div ref={bomb} className="bm-bomb-at" style={{ left: `${x}%`, top: `${y}%` } as CSSProperties}>
            <BombArt heat={bv.heat} held={bv.phase === 'play'} />
            {shaking && <i className="bm-x">❌</i>}
          </div>
        )}
        {countdown !== null && <b className="bm-count" key={countdown}>{countdown}</b>}
      </div>

      <div className="pg-foot bm-foot">
        <TaskCard task={bv.phase === 'play' ? bv.task : null} mine={holding} shaking={shaking} locked={answered !== null} onAnswer={answer} who={t.name(bv.holder)} />
      </div>

      <PartyEnd t={t} view={view} actions={actions} auth={auth} podium={podiumLate ? <BombPodium view={view} bv={bv} order={order} onDone={() => t.setPodiumDone(true)} /> : null} />
    </main>
  );
}
