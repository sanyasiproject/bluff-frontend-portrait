/// <reference lib="webworker" />
import { ChessGame, Position, reviewGame, search, type Move, type PvLine } from '../lib';
import type { EngineLine, EngineReply, EngineRequest, GameInput } from './protocol';

// The chess engine in a Web Worker, so the phone's screen never stalls; the app ends it by terminating the worker

const post = (m: EngineReply) => (self as unknown as DedicatedWorkerGlobalScope).postMessage(m);

/** the game rebuilt from its start and UCI moves (stops at the first move that does not parse) */
function rebuild(g: GameInput): ChessGame {
  const game = new ChessGame(g.variant, g.initialFen);
  for (const u of g.moves) {
    const m = game.position().parseUci(u);
    if (!m) break;
    game.play(m);
  }
  return game;
}

function toLine(pos: Position, pv: PvLine): EngineLine {
  const sans: string[] = [];
  const uci: string[] = [];
  let p = pos;
  for (const m of pv.moves) {
    sans.push(p.san(m));
    uci.push(p.uci(m));
    p = p.play(m);
  }
  const flip = pos.turn === 'w' ? 1 : -1;
  return {
    first: pv.moves[0] as Move,
    uci,
    sans,
    cp: pv.mate !== undefined && pv.mate !== null ? null : (pv.scoreCp ?? 0) * flip,
    mate: pv.mate !== undefined && pv.mate !== null ? pv.mate * flip : null,
    depth: pv.depth,
  };
}

self.onmessage = (e: MessageEvent<EngineRequest>) => {
  const req = e.data;
  try {
    const game = rebuild(req);
    if (req.type === 'search') {
      const pos = game.position();
      if (pos.outcome() || pos.legalMoves().length === 0) return post({ type: 'lines', id: req.id, lines: [], done: true });
      const history = game.keys();
      let lastPost = 0;
      const lines = search(pos, history, { maxMs: req.maxMs, multiPv: req.multiPv }, (info) => {
        const now = Date.now();
        if (now - lastPost < 150 || !info.length || !info[0].moves.length) return;
        lastPost = now;
        post({ type: 'lines', id: req.id, lines: info.filter((l) => l.moves.length).map((l) => toLine(pos, l)), done: false });
      });
      post({ type: 'lines', id: req.id, lines: lines.filter((l) => l.moves.length).map((l) => toLine(pos, l)), done: true });
    } else {
      const review = reviewGame(game, { msPerMove: req.msPerMove, onProgress: (done, total) => post({ type: 'progress', id: req.id, done, total }) });
      post({ type: 'review', id: req.id, review });
    }
  } catch (err) {
    post({ type: 'error', id: req.id, message: err instanceof Error ? err.message : String(err) });
  }
};
