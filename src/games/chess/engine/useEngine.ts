import { useEffect, useState } from 'react';
import type { EngineLine, EngineReply, EngineRequest, GameInput, Review } from './protocol';

// The app's side of the engine worker: live lines for watchers and analysis, and the whole-game review

let seq = 0;
const spawn = () => new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });

/** true while the page is on screen; the engine stops when it is hidden to keep the phone cool */
export function usePageVisible(): boolean {
  const [on, setOn] = useState(() => document.visibilityState !== 'hidden');
  useEffect(() => {
    const fn = () => setOn(document.visibilityState !== 'hidden');
    document.addEventListener('visibilitychange', fn);
    return () => document.removeEventListener('visibilitychange', fn);
  }, []);
  return on;
}

const gameKey = (g: GameInput | null) => (g ? `${g.variant}|${g.initialFen}|${g.moves.join(' ')}` : '');
/** a short hash, so games without a saved id (guests, bots) still cache their review */
function hashOf(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = (h * 33) ^ text.charCodeAt(i);
  return `h${(h >>> 0).toString(36)}${text.length.toString(36)}`;
}

/** the engine's best lines for a position; restarts on each new position and stops when hidden or unmounted */
export function useEngineLines(game: GameInput | null, { multiPv = 3, maxMs = 2500 } = {}): { lines: EngineLine[]; done: boolean } {
  const visible = usePageVisible();
  const [state, setState] = useState<{ key: string; lines: EngineLine[]; done: boolean }>({ key: '', lines: [], done: false });
  const key = gameKey(game);
  useEffect(() => {
    if (!game || !visible) return;
    const w = spawn();
    const id = ++seq;
    w.onmessage = (e: MessageEvent<EngineReply>) => {
      const r = e.data;
      if (r.id !== id || r.type !== 'lines') return;
      setState({ key, lines: r.lines, done: r.done });
      if (r.done) w.terminate();
    };
    w.postMessage({ type: 'search', id, multiPv, maxMs, ...game } satisfies EngineRequest);
    return () => w.terminate();
  }, [key, visible, multiPv, maxMs]);
  return state.key === key ? state : { lines: [], done: false };
}

const CACHE = 'bluff.chessReview.';
const INDEX = 'bluff.chessReviews';
const KEEP = 20;

export function cachedReview(id: string): Review | null {
  try {
    const raw = localStorage.getItem(CACHE + id);
    return raw ? (JSON.parse(raw) as Review) : null;
  } catch {
    return null;
  }
}
function saveReview(id: string, review: Review) {
  try {
    const ids = (JSON.parse(localStorage.getItem(INDEX) ?? '[]') as string[]).filter((x) => x !== id);
    ids.push(id);
    while (ids.length > KEEP) localStorage.removeItem(CACHE + ids.shift());
    localStorage.setItem(INDEX, JSON.stringify(ids));
    localStorage.setItem(CACHE + id, JSON.stringify(review));
  } catch {
    /* storage full or private mode: the review just isn't kept */
  }
}

/** reviews a whole game in the worker (cached per game id); paused while the screen is hidden */
export function useReview(game: GameInput | null, savedId: string | null, msPerMove = 300) {
  const visible = usePageVisible();
  const cacheId = savedId ?? (game ? hashOf(gameKey(game)) : null);
  const [review, setReview] = useState<Review | null>(() => (cacheId ? cachedReview(cacheId) : null));
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const key = gameKey(game);
  useEffect(() => {
    if (!game || review || !visible) return;
    const w = spawn();
    const id = ++seq;
    setProgress({ done: 0, total: game.moves.length });
    w.onmessage = (e: MessageEvent<EngineReply>) => {
      const r = e.data;
      if (r.id !== id) return;
      if (r.type === 'progress') setProgress({ done: r.done, total: r.total });
      else if (r.type === 'review') {
        setReview(r.review);
        if (cacheId) saveReview(cacheId, r.review);
        w.terminate();
      } else if (r.type === 'error') {
        setError(r.message);
        w.terminate();
      }
    };
    w.onerror = () => setError('The engine stopped');
    w.postMessage({ type: 'review', id, msPerMove, ...game } satisfies EngineRequest);
    return () => w.terminate();
  }, [key, visible, review]);
  return { review, progress, error };
}
