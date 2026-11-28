import { useEffect, useMemo, useRef, useState } from 'react';
import { reducedMotion } from '../../lib/motion';
import { cx } from '../../lib/cards';
import type { RoomView } from '../../types';
import type { PluggedTableProps } from '../registry';
import { PartyEnd, PartyTopbar, usePartyTable } from '../dots/party';
import { CHESS_VARIANTS, type Color, type Role } from './lib';
import type { ChessView } from './contract';
import { Board, type DragApi } from './Board';
import { PlayerCard } from './PlayerCard';
import { MoveStrip } from './MoveStrip';
import { ChessControls, ConfirmMoveBar, OfferBanner } from './Controls';
import { ChessEnd } from './ChessEnd';
import { ChessAnalysis } from './Analysis';
import { EngineLines } from './EngineLines';
import { EvalBar } from './EvalViews';
import { timeLabel, VARIANT_ICON } from './catalog';
import { barCp, evalText } from './engine/protocol';
import { useEngineLines } from './engine/useEngine';
import { useChessTable } from './useChessTable';
import { materialDiff, other, ratingText } from './viewState';
import '../../styles/ludo.css';
import '../../styles/pgames.css';
import '../../styles/chess-board.css';
import '../../styles/chess-table.css';
import '../../styles/chess-analysis.css';

export function ChessTable(props: PluggedTableProps) {
  const cv = props.view.plugged?.kind === 'chess' ? props.view.plugged.chess : null;
  if (!cv) return <main className="screen center-screen">Setting up the board…</main>;
  return <ChessInner {...props} cv={cv} />;
}

/** a bot's name with its level, else the room name */
function useNames(view: RoomView, cv: ChessView) {
  const all = [...view.players, ...view.leftPlayers];
  return (c: Color) => {
    const id = cv.players[c];
    const n = all.find((p) => p.id === id)?.name ?? (c === 'w' ? 'White' : 'Black');
    return cv.bots[c] ? `${n} (L${cv.bots[c]})` : n;
  };
}

function ChessInner({ view, actions, bubbles, auth, cv }: PluggedTableProps & { cv: ChessView }) {
  const t = usePartyTable(view);
  const s = useChessTable(view, cv, actions);
  const nameOf = useNames(view, cv);
  const [analyse, setAnalyse] = useState(false);
  const dragApi: DragApi = useRef(null);
  const watching = !s.me;
  // watchers see the engine's best move live, players never do during their own game
  const input = useMemo(() => (watching && s.playing ? { variant: cv.variant, initialFen: cv.initialFen, moves: cv.moves } : null), [watching, s.playing, cv.moves.length, cv.initialFen]);
  const engine = useEngineLines(input, { multiPv: 3, maxMs: 2500 });
  const best = engine.lines[0];
  // the end sheet waits a moment so the last move (and an Atomic blast) can be seen
  const [endReady, setEndReady] = useState(cv.status === 'over');
  useEffect(() => {
    if (cv.status !== 'over') return setEndReady(false);
    const id = window.setTimeout(() => setEndReady(true), reducedMotion() ? 0 : 900);
    return () => window.clearTimeout(id);
  }, [cv.status]);

  const top = other(s.orient);
  const bottom = s.orient;
  const lead = materialDiff(s.board);
  const fresh = t.fresh(bubbles);
  const card = (c: Color) => {
    const id = cv.players[c];
    const player = view.players.find((p) => p.id === id);
    const mine = c === s.me;
    const myDrops = mine && s.myTurn;
    return (
      <PlayerCard
        player={player}
        name={nameOf(c)}
        color={c}
        rating={ratingText(cv.ratings?.[c])}
        ratingDiff={cv.status === 'over' ? cv.ratingDiff?.[c] : undefined}
        lead={cv.variant === 'crazyhouse' || cv.variant === 'horde' ? { roles: [], points: 0 } : lead[c]}
        clock={s.clocks ? s.clocks[c] : null}
        active={s.playing && s.pos?.turn === c}
        checks={cv.checks ? cv.checks[c] : undefined}
        pocket={cv.pockets ? cv.pockets[c] : undefined}
        onPocketDown={myDrops ? (r: Role, e) => dragApi.current?.(r, e) : undefined}
        pocketPick={mine ? (s.dropPick ?? null) : null}
        bubble={[...fresh].reverse().find((b) => b.from === id) ?? null}
        onTap={player && !mine ? () => t.setTarget(player.id) : undefined}
        seatRef={(el) => {
          if (!id) return;
          if (el) t.seatEls.current.set(id, el);
          else t.seatEls.current.delete(id);
        }}
        offer={cv.drawOffer === c ? '🤝 draw?' : cv.takebackOffer === c ? '↩️ takeback?' : null}
      />
    );
  };
  const variant = CHESS_VARIANTS.find((v) => v.id === cv.variant);
  const arrows = watching && best && s.playing ? engine.lines.slice(0, 3).map((l, i) => ({ from: l.first.from, to: l.first.to, tone: i === 0 ? ('best' as const) : ('alt' as const), weight: 1 - i * 0.35 })) : [];
  const resultText = cv.result ? (cv.result.winner === 'w' ? '1-0' : cv.result.winner === 'b' ? '0-1' : '1/2-1/2') : undefined;
  const abortIn = cv.abortAt && s.playing ? Math.max(0, Math.ceil((cv.abortAt - cv.now) / 1000)) : null;

  return (
    <main className="table ld-table pg-table ch-table">
      <PartyTopbar
        t={t}
        view={view}
        actions={actions}
        chip={
          <>
            {VARIANT_ICON[cv.variant]}
            <span>{` ${variant?.name ?? 'Chess'} · ${timeLabel(cv.time)}${cv.rated ? ' · Rated' : ''}`}</span>
          </>
        }
      />
      <MoveStrip sans={cv.sans} ply={cv.sans.length} startBlack={cv.initialFen.split(' ')[1] === 'b'} />
      <div className="ch-gap" />
      {card(top)}
      <div className={cx('ch-stage', watching && s.playing && 'with-bar')}>
        {watching && s.playing && <EvalBar cp={barCp(best)} orient={s.orient} label={evalText(best)} />}
        <Board
          variant={cv.variant}
          board={s.board}
          orient={s.orient}
          looks={s.looks}
          last={s.last}
          check={s.check}
          moves={s.legal}
          premoves={s.premoves}
          premove={s.premove}
          onMove={s.onMove}
          onPremove={s.setPremove}
          arrows={arrows}
          blast={s.blast}
          dropPick={s.dropPick ?? null}
          onDropPick={(r) => s.setDropPick(r)}
          dragApi={dragApi}
        />
      </div>
      {card(bottom)}
      <ConfirmMoveBar s={s} />
      <OfferBanner cv={cv} me={s.me} nameOf={nameOf} s={s} />
      {abortIn !== null && cv.moves.length < 2 && s.me && s.pos?.turn === s.me && <p className="ch-first-move">{`Make your first move · ${abortIn}s`}</p>}
      {watching && s.playing && <EngineLines lines={engine.lines} done={engine.done} />}
      <div className="ch-gap" />
      <ChessControls cv={cv} s={s} sound={t.sound} onSound={t.toggleSound} onAnalyse={cv.status === 'over' && cv.moves.length > 1 ? () => setAnalyse(true) : undefined} />
      {/* the analysis page sits under sheets, so the end sheet waits while it is open */}
      {!analyse && (
      <PartyEnd
        t={t}
        view={view}
        actions={actions}
        auth={auth}
        podium={endReady && <ChessEnd cv={cv} me={s.me} nameOf={nameOf} onAnalyse={() => setAnalyse(true)} onRematch={t.isHost ? () => void actions.rematch() : undefined} onDone={() => t.setPodiumDone(true)} />}
      />
      )}
      {analyse && (
        <ChessAnalysis
          game={{ variant: cv.variant, initialFen: cv.initialFen, moves: cv.moves }}
          id={cv.gameId ?? null}
          names={{ w: nameOf('w'), b: nameOf('b') }}
          orient={s.me ?? 'w'}
          result={resultText}
          onClose={() => setAnalyse(false)}
        />
      )}
    </main>
  );
}
