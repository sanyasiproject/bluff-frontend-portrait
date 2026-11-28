import { useEffect, useMemo, useRef, useState } from 'react';
import { cx } from '../../lib/cards';
import { useNow } from '../../lib/useNow';
import { sfx, unlockAudio } from '../../lib/sounds';
import { useOnChange } from '../../components/Table';
import { SEA_COLS, SEA_SIZE, type SeaPower, type SeaShip, type SeaView } from '../../types';
import type { PluggedTableProps } from '../registry';
import { PartyChips, PartyEnd, partyColor, partyOrder, PartyStrip, PartyTopbar, usePartyTable, type PartyToast } from '../dots/party';
import { AimArrow, POWER_HINT, POWER_ICON, POWER_NAME, PowersBar } from './Parts';
import { Placement } from './Placement';
import { SeaPodium } from './Podium';
import { Sea, type SeaFx } from './Sea';
import '../../styles/ludo.css';
import '../../styles/pgames.css';
import '../../styles/seabattle.css';
import '../../styles/seabattle-table.css';

const shipKey = (s: SeaShip) => `${s.x},${s.y},${s.len},${s.v}`;

export function SeaTable(props: PluggedTableProps) {
  const sv = props.view.plugged?.kind === 'seabattle' ? props.view.plugged.seabattle : null;
  if (!sv) return <main className="screen center-screen">Launching the fleets…</main>;
  return <SeaInner {...props} sv={sv} />;
}

function SeaInner({ view, actions, bubbles, auth, sv }: PluggedTableProps & { sv: SeaView }) {
  const t = usePartyTable(view);
  const order = partyOrder(view, Object.keys(sv.seas));
  const colorOf = (id: string | null | undefined) => partyColor(order, id);
  const skew = useMemo(() => Date.now() - sv.now, [sv.now]);
  const now = useNow(250);
  const turnEndsAt = sv.deadline ? sv.deadline + skew : null;
  const myTurn = t.playing && sv.phase === 'battle' && sv.turnId === view.meId;
  const alive = (id: string) => !sv.places[id] && (sv.seas[id]?.afloat.length ?? 0) > 0;
  const rivals = order.filter((id) => id !== view.meId && alive(id));
  const [target, setTarget] = useState<string | null>(null);
  const [follow, setFollow] = useState<string | null>(null);
  const [mode, setMode] = useState<SeaPower | 'fire'>('fire');
  const [picks, setPicks] = useState<number[]>([]);
  const [toast, setToast] = useState<PartyToast | null>(null);
  const [fx, setFx] = useState<{ sea: string; list: SeaFx[]; torp?: { row: number; to: number } } | null>(null);
  const [sinking, setSinking] = useState<Set<string>>(new Set());
  const [sent, setSent] = useState(false);
  const seq = useRef(0);
  const chipsRow = useRef<HTMLDivElement>(null);
  const say = (text: string, tone: PartyToast['tone']) => setToast({ key: ++seq.current, text, tone });
  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 1700);
    return () => window.clearTimeout(id);
  }, [toast]);

  // my aim: the picked rival while alive, else the first one afloat
  const aimAt = target && rivals.includes(target) ? target : (rivals[0] ?? null);
  // the big sea: mine to aim on my turn; otherwise the sea being shot at
  const big = myTurn ? aimAt : (follow ?? aimAt);
  const held = sv.held[view.meId] ?? [];
  useOnChange(myTurn, (m) => {
    setMode('fire');
    setPicks([]);
    setSent(false);
    if (m) {
      sfx.turn();
      if (navigator.userActivation?.hasBeenActive) navigator.vibrate?.(60);
    }
  });
  useEffect(() => {
    if (!sent) return;
    const id = window.setTimeout(() => setSent(false), 4000);
    return () => window.clearTimeout(id);
  }, [sent]);

  // each shot: effects on the sea that was hit, sounds and lines
  useOnChange(sv.last?.seq ?? null, () => {
    const l = sv.last;
    if (!l) return;
    setSent(false);
    setPicks([]);
    setMode('fire');
    setFollow(l.target);
    if (l.kind === 'radar') {
      sfx.seaRadar();
      if (l.by === view.meId && l.count !== undefined) say(`📡 Radar: ${l.count} ship ${l.count === 1 ? 'cell' : 'cells'}`, 'gold');
      return;
    }
    sfx.seaFire();
    const anySunk = l.cells.some((c) => c.sunk);
    const anyHit = l.cells.some((c) => c.hit);
    window.setTimeout(() => (anySunk ? sfx.seaSink() : anyHit ? sfx.seaHit() : sfx.seaSplash()), 260);
    if (l.kind === 'torpedo') sfx.seaTorpedo();
    const list: SeaFx[] = l.cells.map((c) => ({ key: `${l.seq}-${c.x}-${c.y}`, x: c.x, y: c.y, kind: c.sunk ? 'sunk' : c.hit ? 'hit' : 'miss' }));
    const torp = l.kind === 'torpedo' && l.row !== undefined ? { row: l.row, to: l.cells[0]?.x ?? SEA_SIZE - 1 } : undefined;
    setFx({ sea: l.target, list, torp });
    if (anySunk) {
      const keys = new Set((sv.seas[l.target]?.ships ?? []).filter((s) => s.sunk && l.cells.some((c) => c.sunk && (s.v ? c.x === s.x && c.y >= s.y && c.y < s.y + s.len : c.y === s.y && c.x >= s.x && c.x < s.x + s.len))).map(shipKey));
      setSinking(keys);
    }
    if (l.target === view.meId && anyHit) navigator.vibrate?.(anySunk ? [80, 40, 160] : 50);
    if (l.out) say(`💀 ${t.name(l.target)} ${l.target === view.meId ? 'are' : 'is'} sunk!`, 'bad');
    else if (anySunk) say(`💥 ${t.name(l.by)} sank a ship!${l.earned ? ` ${POWER_ICON[l.earned]} ${POWER_NAME[l.earned]} earned` : ''}`, 'gold');
    else if (l.again && l.by === view.meId) say('🎯 Hit! Fire again', 'good');
  });
  useEffect(() => {
    if (!fx) return;
    const id = window.setTimeout(() => setFx(null), 1700);
    return () => window.clearTimeout(id);
  }, [fx]);
  useEffect(() => {
    if (!sinking.size) return;
    const id = window.setTimeout(() => setSinking(new Set()), 1700);
    return () => window.clearTimeout(id);
  }, [sinking]);

  const send = (move: Parameters<typeof actions.gameMove>[0]) => {
    unlockAudio();
    setSent(true);
    void t.act(() => actions.gameMove(move));
  };
  const canFire = myTurn && !t.busy && !sent && !!aimAt;
  const onCell = (x: number, y: number) => {
    if (!canFire || !aimAt) return;
    const i = y * SEA_SIZE + x;
    const open = (sv.seas[aimAt]?.shots[i] ?? 0) === 0;
    if (mode === 'radar') return send({ kind: 'seabattle', move: { type: 'radar', target: aimAt, x, y } });
    if (mode === 'torpedo') return send({ kind: 'seabattle', move: { type: 'torpedo', target: aimAt, row: y } });
    if (!open) return;
    if (mode === 'salvo') {
      const next = picks.includes(i) ? picks.filter((p) => p !== i) : [...picks, i];
      if (next.length < 3) return setPicks(next);
      setPicks(next);
      return send({ kind: 'seabattle', move: { type: 'salvo', target: aimAt, cells: next.map((c) => [c % SEA_SIZE, Math.floor(c / SEA_SIZE)] as [number, number]) } });
    }
    send({ kind: 'seabattle', move: { type: 'fire', target: aimAt, x, y } });
  };

  const myRadars = (id: string) => sv.radars.filter((r) => r.target === id);
  const aimSet = new Set(picks);
  const placing = sv.phase === 'place';
  const placeLeft = Math.max(0, Math.ceil((sv.placeEndsAt + skew - now) / 1000));
  const shooter = sv.phase === 'battle' ? sv.turnId : null;
  const arrowTo = myTurn ? aimAt : sv.last && sv.last.by === sv.turnId ? sv.last.target : null;

  const status = !t.playing
    ? ''
    : placing
      ? sv.ready[view.meId]
        ? 'Waiting for the other fleets…'
        : `⚓ Place your fleet · ${placeLeft}s`
      : myTurn
        ? mode === 'fire'
          ? `Your shot! Fire at ${t.plainName(aimAt)}`
          : POWER_HINT[mode]
        : `${t.name(sv.turnId)} ${sv.turnId === view.meId ? 'are' : 'is'} aiming…`;

  const bigSea = big ? sv.seas[big] : null;
  return (
    <main className={cx('table ld-table pg-table sb-table', placing && 'placing')}>
      <PartyTopbar t={t} view={view} actions={actions} chip={<>⚓<span>{` Sea Battle${sv.powers ? ' · ⚡' : ''}`}</span></>} />

      <div ref={chipsRow} className="sb-chips-wrap">
        <PartyChips
          t={t}
          view={view}
          bubbles={bubbles}
          order={order}
          colorOf={colorOf}
          turnId={shooter}
          turnEndsAt={turnEndsAt}
          extra={(id) => cx('sb-seat', id === big && !placing && 'watched', sv.places[id] && 'out')}
          tag={(id) =>
            placing ? (
              <b className="pg-num sb-ready">{sv.ready[id] ? '✅' : '⏳'}</b>
            ) : (
              <>
                <b className="pg-num">{sv.seas[id]?.afloat.length ?? 0}</b>
                <span className="sb-tag">🚢</span>
                {(sv.held[id] ?? []).map((p, i) => (
                  <span key={i} className="sb-tag">{POWER_ICON[p]}</span>
                ))}
              </>
            )
          }
        />
        {!placing && <AimArrow row={chipsRow} seats={t.seatEls} from={shooter} to={arrowTo} />}
      </div>

      <PartyStrip toast={toast} status={status} mine={myTurn || (placing && !sv.ready[view.meId])} live={canFire} />

      {placing && !t.watching ? (
        <div className="sb-stage">
          <Placement
            start={sv.seas[view.meId]?.ships ?? []}
            ready={!!sv.ready[view.meId]}
            secsLeft={placeLeft}
            onPlace={(ships) => void actions.gameMove({ kind: 'seabattle', move: { type: 'place', ships } })}
            onReady={() => void t.act(() => actions.gameMove({ kind: 'seabattle', move: { type: 'ready' } }))}
          />
        </div>
      ) : (
        <>
          <div className="sb-stage">
            <p className="sb-sea-name" data-no-translate>
              {big === view.meId ? '🛟 Your sea' : big ? `🎯 ${t.plainName(big)}'s sea` : ''}
            </p>
            <Sea
              board={bigSea}
              ships={(bigSea?.ships ?? []).filter((s) => big === view.meId || s.sunk)}
              radars={big ? myRadars(big) : []}
              live={canFire && big === aimAt}
              aim={aimSet}
              fx={fx?.sea === big ? fx.list : undefined}
              sinking={fx?.sea === big ? sinking : undefined}
              size="big"
              onCell={big === aimAt && big !== view.meId ? onCell : undefined}
            >
              {fx?.sea === big && fx.torp && (
                <span className="sb-torp" style={{ top: `${fx.torp.row * 10}%`, left: 0, width: `${(fx.torp.to + 1) * 10}%` }}>
                  <i />
                </span>
              )}
            </Sea>
          </div>
          <div className="pg-foot sb-foot">
            {sv.powers && !t.watching && <PowersBar held={held} mode={mode} can={canFire} onPick={(p) => (setMode(p), setPicks([]))} />}
            <div className={cx('sb-minis', `n${order.length}`)}>
              {order.map((id) => (
                <button key={id} className={cx('sb-mini', id === big && 'on', id === view.meId && 'mine', !alive(id) && 'out')} onClick={() => (id === view.meId ? setFollow(id) : (setTarget(id), setFollow(id)))} disabled={id !== view.meId && !alive(id)}>
                  <Sea board={sv.seas[id] ?? null} ships={(sv.seas[id]?.ships ?? []).filter((s) => id === view.meId || s.sunk)} fx={fx?.sea === id ? fx.list : undefined} size="mini" />
                  <span className="sb-mini-name" data-no-translate>{id === view.meId ? 'You' : t.plainName(id)}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
      <p className="ld-sixes pg-rules-line">{`Ships 5 · 4 · 3 · 3 · 2 · hit = fire again${sv.powers ? ' · sink = power' : ''} · ${SEA_COLS[0]}–${SEA_COLS[9]}`}</p>

      <PartyEnd t={t} view={view} actions={actions} auth={auth} podium={<SeaPodium view={view} sv={sv} order={order} onDone={() => t.setPodiumDone(true)} />} />
    </main>
  );
}
