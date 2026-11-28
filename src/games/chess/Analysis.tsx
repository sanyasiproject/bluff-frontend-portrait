import { useEffect, useMemo, useRef, useState } from 'react';
import { cx } from '../../lib/cards';
import { FullPage } from '../../components/FullPage';
import type { Color } from './lib';
import type { Arrow } from './Arrows';
import { Board } from './Board';
import { EvalBar, EvalGraph } from './EvalViews';
import { MoveStrip } from './MoveStrip';
import { EngineLines } from './EngineLines';
import { JUDGE_TONE, PgnButton, ReviewSummary } from './AnalysisParts';
import { useChessLooks } from './looks';
import { barCp, evalText, type GameInput } from './engine/protocol';
import { useEngineLines, useReview } from './engine/useEngine';
import { checkSquare, rebuildGame } from './viewState';
import '../../styles/chess-board.css';
import '../../styles/chess-table.css';
import '../../styles/chess-analysis.css';

// After the game: the engine reviews every move in a Web Worker; step through with eval bar, graph, marks and better moves

export interface AnalysisProps {
  game: GameInput;
  /** saved game id, for the review cache */
  id: string | null;
  names: Record<Color, string>;
  orient: Color;
  result?: string;
  onClose: () => void;
}

const BAD = new Set(['inaccuracy', 'mistake', 'blunder']);
/** the review's white-POV eval as "+1.2", or "#3" / "#-2" for mates (stored as ±(10000 − moves)) */
const evalLabel = (e: number) => (Math.abs(e) >= 9000 ? (e > 0 ? `#${10000 - e}` : `#-${10000 + e}`) : evalText({ cp: e, mate: null }));

export function ChessAnalysis({ game, id, names, orient: start, result, onClose }: AnalysisProps) {
  const looks = useChessLooks();
  const g = useMemo(() => rebuildGame(game.variant, game.initialFen, game.moves), [game]);
  const total = g.moves.length;
  const sans = useMemo(() => g.sanList(), [g]);
  const [ply, setPly] = useState(total);
  const [orient, setOrient] = useState<Color>(start);
  const [showLine, setShowLine] = useState(false);
  const { review, progress, error } = useReview(game, id);
  const pos = useMemo(() => g.positionAt(ply), [g, ply]);
  const sub: GameInput | null = useMemo(() => (showLine ? { ...game, moves: game.moves.slice(0, ply) } : null), [showLine, ply, game]);
  const engine = useEngineLines(sub, { multiPv: 2, maxMs: 2000 });

  const step = (n: number) => setPly((p) => Math.max(0, Math.min(total, p + n)));
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === 'ArrowRight') step(1);
      else if (e.key === 'Home') setPly(0);
      else if (e.key === 'End') setPly(total);
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [total]);
  const swipe = useRef<{ x: number; y: number } | null>(null);

  const mv = ply > 0 ? review?.moves[ply - 1] : undefined;
  const evals = review?.evals ?? [];
  const cp = showLine && engine.lines[0] ? barCp(engine.lines[0]) : review ? (evals[ply] ?? 0) : 0;
  const label = showLine && engine.lines[0] ? evalText(engine.lines[0]) : review ? evalLabel(evals[ply] ?? 0) : '…';
  const lastMove = ply > 0 ? g.moves[ply - 1] : null;
  const arrows: Arrow[] = [];
  if (mv && BAD.has(mv.judgement)) arrows.push({ from: mv.best.from, to: mv.best.to, tone: 'best' });
  if (showLine && engine.lines[0]) arrows.push({ from: engine.lines[0].first.from, to: engine.lines[0].first.to, tone: 'alt', weight: 0.7 });
  const judge = review ? review.moves.map((m) => (BAD.has(m.judgement) ? m.judgement : undefined)) : undefined;
  const marks = review?.moves.filter((m) => BAD.has(m.judgement)).map((m) => ({ ply: m.ply, tone: JUDGE_TONE[m.judgement] }));
  const pgn = useMemo(() => g.pgn({ Event: 'Game Baithak', White: names.w, Black: names.b, Variant: game.variant, Result: result ?? '*' }), [g]);
  const fen = pos.fen().split(' ');
  const opening = review?.opening;

  return (
    <FullPage title="Analysis" onBack={onClose}>
      <div className="ch-analysis">
        <p className="ch-an-head">
          <span data-no-translate>{`${names.w} vs ${names.b}`}</span>
          {opening && <small data-no-translate>{`📖 ${opening.eco} ${opening.name}`}</small>}
        </p>
        {!review && (
          <div className="ch-progress" role="progressbar" aria-valuenow={progress?.done ?? 0} aria-valuemax={progress?.total ?? total}>
            <span>{error ? `Engine error: ${error}` : `🔍 Reviewing move ${progress?.done ?? 0} of ${progress?.total ?? total}…`}</span>
            <i style={{ transform: `scaleX(${progress && progress.total ? progress.done / progress.total : 0})` }} />
          </div>
        )}
        <div
          className="ch-stage with-bar"
          onPointerDown={(e) => (swipe.current = { x: e.clientX, y: e.clientY })}
          onPointerUp={(e) => {
            const s = swipe.current;
            swipe.current = null;
            if (s && Math.abs(e.clientX - s.x) > 40 && Math.abs(e.clientX - s.x) > Math.abs(e.clientY - s.y)) step(e.clientX < s.x ? 1 : -1);
          }}
        >
          <EvalBar cp={cp} orient={orient} label={label} />
          <Board variant={game.variant} board={pos.board()} orient={orient} looks={looks} last={lastMove ? { from: lastMove.from, to: lastMove.to } : null} check={checkSquare(pos)} arrows={arrows} />
        </div>
        <div className="ch-steps">
          <button onClick={() => setPly(0)} aria-label="First move">
            ⏮
          </button>
          <button onClick={() => step(-1)} aria-label="Previous move">
            ◀
          </button>
          <span className="ch-step-now">
            {mv ? (
              <>
                <b data-no-translate>{mv.san}</b>
                <span className={cx('ch-judge', `j-${mv.judgement}`)}>{mv.judgement}</span>
                {BAD.has(mv.judgement) && <small data-no-translate>{`best ${mv.bestSan}`}</small>}
              </>
            ) : ply > 0 ? (
              <b data-no-translate>{sans[ply - 1]}</b>
            ) : (
              <small>Start</small>
            )}
          </span>
          <button onClick={() => step(1)} aria-label="Next move">
            ▶
          </button>
          <button onClick={() => setPly(total)} aria-label="Last move">
            ⏭
          </button>
        </div>
        {review && <EvalGraph evals={evals} ply={ply} onPly={setPly} marks={marks} />}
        <MoveStrip sans={sans} ply={ply} onPly={setPly} judge={judge} startBlack={game.initialFen.split(' ')[1] === 'b'} />
        <div className="ch-an-tools">
          <button className={cx('btn small ghost', showLine && 'on')} aria-pressed={showLine} onClick={() => setShowLine((v) => !v)}>
            🧠 Engine line
          </button>
          <button className="btn small ghost" onClick={() => setOrient((o) => (o === 'w' ? 'b' : 'w'))}>
            🔄 Flip
          </button>
          <PgnButton pgn={pgn} />
        </div>
        {showLine && <EngineLines lines={engine.lines} done={engine.done} max={2} title="🧠 Best line" moveNo={{ n: Number(fen[5]) || 1, black: fen[1] === 'b' }} />}
        {review && <ReviewSummary review={review} names={names} />}
      </div>
    </FullPage>
  );
}
