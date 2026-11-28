import { useEffect, useRef, useState } from 'react';
import type { Actions } from '../../useBluff';
import type { Auth } from '../../useAuth';
import { wordHuntPoints, type WordHuntRevealWord, type WordHuntView } from '../../types';
import { PREVIEW_IDS, previewActions, previewView } from '../previewKit';
import { WordHuntTable } from './WordHuntTable';

// Dev only (?wordhuntPreview=1): a local Word Grid Hunt against 2 bots on a fixed grid with a tiny demo word list
// (=reveal starts at a round end, =over the podium, =5 a 5×5 grid). The real dictionary lives on the server

let query = '';
const arg = () => new URLSearchParams(query).get('wordhuntPreview') ?? '1';
const GRID4 = 'starelinatedrops'.split('');
const GRID5 = ['s', 't', 'a', 'r', 'e', 'l', 'i', 'n', 'e', 's', 'a', 't', 'e', 'd', 't', 'r', 'o', 'p', 's', 'o', 'qu', 'i', 'l', 't', 'e'];
const DEMO = 'star tar art rat rats sea seal tea teal tile tiles line lines lite tied tide ride rode rope ropes pose dote dot dote note lane lean late later eat eats ate tad tea tear tears rate rated drop drops stale steal tale tales slate lint tin tins nil nile lit tilt ail ale sale real reals rail rails nail nails snail elite rose ore ores pro prod trod toe toes doe does rot rots aliens saline entail retail dilate tirade stair satin stain stale alert alter later lair liar rail tail tails'.split(' ');
const WORDS = [...new Set(DEMO)];

const adj = (n: number, a: number, b: number) => a !== b && Math.abs((a % n) - (b % n)) <= 1 && Math.abs(Math.floor(a / n) - Math.floor(b / n)) <= 1;
/** a path for a word on the grid, if there is one */
function find(grid: string[], n: number, word: string): number[] | null {
  const tiles = grid.map((g) => g.toLowerCase());
  const go = (path: number[], rest: string): number[] | null => {
    if (!rest) return path;
    for (let i = 0; i < tiles.length; i++) {
      if (path.includes(i) || !rest.startsWith(tiles[i]) || (path.length && !adj(n, path[path.length - 1], i))) continue;
      const r = go([...path, i], rest.slice(tiles[i].length));
      if (r) return r;
    }
    return null;
  };
  return go([], word);
}

interface Sim {
  wv: WordHuntView;
  found: Record<string, string[]>;
  solvable: string[];
}

const PLAY_MS = 60_000;
const REVEAL_MS = 8_000;

function round(s: Sim | null, r: number): Sim {
  const n = arg() === '5' ? 5 : 4;
  const grid = n === 5 ? GRID5 : GRID4;
  const minLen = n === 5 ? 4 : 3;
  const ids = PREVIEW_IDS.slice(0, 3);
  const now = Date.now();
  const solvable = WORDS.filter((w) => w.length >= minLen && find(grid, n, w));
  return {
    found: Object.fromEntries(ids.map((id) => [id, []])),
    solvable,
    wv: { grid, size: n as 4 | 5, minLen, time: PLAY_MS / 1000, round: r, rounds: 3, phase: 'countdown', startsAt: now + 3000, endsAt: now + 3000 + PLAY_MS, nextAt: null, now, mine: [], lastTry: null, counts: Object.fromEntries(ids.map((id) => [id, 0])), reveal: null, scores: s?.wv.scores ?? Object.fromEntries(ids.map((id) => [id, 0])), places: {} },
  };
}

/** the round's end: everyone's words, unique ones double */
function reveal(s: Sim): Sim {
  const ids = Object.keys(s.found);
  const by = (w: string) => ids.filter((id) => s.found[id].includes(w)).length;
  const words: Record<string, WordHuntRevealWord[]> = Object.fromEntries(ids.map((id) => [id, s.found[id].map((w) => ({ word: w, points: wordHuntPoints(w.length) * (by(w) === 1 ? 2 : 1), unique: by(w) === 1 }))]));
  const points = Object.fromEntries(ids.map((id) => [id, words[id].reduce((a, w) => a + w.points, 0)]));
  const scores = { ...s.wv.scores };
  ids.forEach((id) => (scores[id] += points[id]));
  const all = ids.flatMap((id) => words[id].map((w) => ({ id, ...w })));
  const top = all.sort((a, b) => b.points - a.points)[0];
  const missed = s.solvable.filter((w) => !ids.some((id) => s.found[id].includes(w))).sort((a, b) => b.length - a.length).slice(0, 5);
  const now = Date.now();
  const last = s.wv.round >= s.wv.rounds;
  const sorted = [...ids].sort((a, b) => scores[b] - scores[a]);
  const places = last ? Object.fromEntries(sorted.map((id) => [id, 1 + sorted.filter((o) => scores[o] > scores[id]).length])) : {};
  return { ...s, wv: { ...s.wv, phase: last ? 'over' : 'reveal', reveal: { round: s.wv.round, grid: s.wv.grid, words, points, best: top ? { playerId: top.id, word: top.word, points: top.points } : null, missed, total: s.solvable.length }, scores, places, nextAt: now + REVEAL_MS, now } };
}

function tick(s: Sim): Sim {
  const now = Date.now();
  const w = s.wv;
  if (w.phase === 'countdown' && now >= w.startsAt) return { ...s, wv: { ...w, phase: 'play', now } };
  if (w.phase === 'play' && now >= w.endsAt) return reveal(s);
  if (w.phase === 'reveal' && now >= (w.nextAt ?? 0)) return round(s, w.round + 1);
  if (w.phase === 'play' && Math.random() < 0.18) {
    const id = Math.random() < 0.5 ? 'b1' : 'b2';
    const word = s.solvable.find((x) => !s.found[id].includes(x) && Math.random() < 0.3);
    if (word) {
      const found = { ...s.found, [id]: [...s.found[id], word] };
      return { ...s, found, wv: { ...w, counts: { ...w.counts, [id]: found[id].length } } };
    }
  }
  return s;
}

export function WordHuntPreview({ auth, query: q }: { auth: Auth; query: string }) {
  query = q;
  const [sim, setSim] = useState<Sim>(() => {
    const s = round(null, 1);
    if (arg() !== 'reveal' && arg() !== 'over') return s;
    const found = { me: ['star', 'tile', 'lines'], b1: ['star', 'rate', 'tide'], b2: ['tea', 'slate'] };
    const r = reveal({ ...s, found, wv: { ...s.wv, round: arg() === 'over' ? 3 : 1, phase: 'play' } });
    return r;
  });
  const ref = useRef(sim);
  ref.current = sim;
  useEffect(() => {
    const id = window.setInterval(() => setSim((s) => tick(s)), 1000);
    return () => window.clearInterval(id);
  }, []);
  const base = previewActions(() => undefined);
  const actions = new Proxy(base, {
    get: (target, key) =>
      key === 'gameMoveTry'
        ? async (m: { move: { path: number[] } }) => {
            const s = ref.current;
            const word = m.move.path.map((i) => s.wv.grid[i]).join('').toLowerCase();
            const ok = m.move.path.every((p, i) => i === 0 || adj(s.wv.size, m.move.path[i - 1], p));
            const verdict = !ok ? 'path' : s.found.me.includes(word) ? 'again' : WORDS.includes(word) ? 'ok' : 'unknown';
            const points = verdict === 'ok' ? wordHuntPoints(word.length) : 0;
            const lastTry = { seq: (s.wv.lastTry?.seq ?? 0) + 1, word, path: m.move.path, verdict, points } as const;
            if (verdict !== 'ok') {
              setSim({ ...s, wv: { ...s.wv, lastTry } });
              return null;
            }
            setSim({ ...s, found: { ...s.found, me: [...s.found.me, word] }, wv: { ...s.wv, lastTry, mine: [...s.wv.mine, { word, points }], counts: { ...s.wv.counts, me: s.wv.mine.length + 1 } } });
            return null;
          }
        : target[key as keyof Actions],
  });
  const ended = sim.wv.phase === 'over';
  const ids = Object.keys(sim.wv.scores);
  const view = previewView('wordhunt', sim.wv, ids, { grid: sim.wv.size, time: 120 }, ended ? { places: sim.wv.places } : null, null);
  return <WordHuntTable view={view} actions={actions} bubbles={[]} auth={auth} />;
}
