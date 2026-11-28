import { useEffect, useRef, useState } from 'react';
import { BOMB_ARROWS, BOMB_INKS, type BombTask, type BombView } from '../../types';
import type { Auth } from '../../useAuth';
import { PREVIEW_IDS, previewActions, previewView } from '../previewKit';
import { BombTable } from './BombTable';

// Dev only (?bombPreview=1): a local Bomb Pass against 3 bots (=2 for two players, =over for the podium).
// The fuse here is short so a BOOM comes quickly

/** the preview's setting, from the address the page opened with */
let query = '';
const arg = () => new URLSearchParams(query).get('bombPreview') ?? '1';
const pick = <T,>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)];
const shuffle = <T,>(a: T[]): T[] => a.map((v) => [Math.random(), v] as const).sort((p, q) => p[0] - q[0]).map((p) => p[1]);

let taskId = 0;
/** a task and its answer index */
function makeTask(): [BombTask, number] {
  const kind = pick(['sum', 'bigger', 'colour', 'odd', 'count', 'arrow'] as const);
  const id = ++taskId;
  if (kind === 'sum') {
    const a = 3 + Math.floor(Math.random() * 10);
    const b = 2 + Math.floor(Math.random() * 9);
    const ans = a + b;
    const ch = shuffle([ans, ans + 1, ans - 2, ans + 3]).map(String);
    return [{ id, kind, prompt: `${a} + ${b}`, choices: ch }, ch.indexOf(String(ans))];
  }
  if (kind === 'bigger') {
    const a = 10 + Math.floor(Math.random() * 80);
    const b = a + 1 + Math.floor(Math.random() * 9);
    const ch = shuffle([a, b]).map(String);
    return [{ id, kind, prompt: 'bigger', choices: ch }, ch.indexOf(String(b))];
  }
  if (kind === 'colour') {
    const ink = pick(BOMB_INKS);
    const word = pick(BOMB_INKS.filter((i) => i !== ink)).toUpperCase();
    const ch = shuffle([...BOMB_INKS]);
    return [{ id, kind, prompt: 'ink', word, ink, choices: ch }, ch.indexOf(ink)];
  }
  if (kind === 'odd') {
    const ch = shuffle(['🍎', '🍎', '🍎', '🍌']);
    return [{ id, kind, prompt: 'odd', choices: ch }, ch.indexOf('🍌')];
  }
  if (kind === 'count') {
    const n = 3 + Math.floor(Math.random() * 7);
    const dots = Array.from({ length: n }, (_, i) => [0.12 + (i % 5) * 0.19, 0.25 + Math.floor(i / 5) * 0.5] as [number, number]);
    const ch = shuffle([n, n + 1, n - 1, n + 2]).map(String);
    return [{ id, kind, prompt: 'count', dots, choices: ch }, ch.indexOf(String(n))];
  }
  const arrow = pick(BOMB_ARROWS);
  return [{ id, kind, prompt: 'arrow', arrow, choices: [...BOMB_ARROWS] }, BOMB_ARROWS.indexOf(arrow)];
}

interface Sim {
  bv: BombView;
  answer: number;
  fuseAt: number;
}

function startSim(): Sim {
  const n = arg() === '2' ? 2 : 4;
  const ids = PREVIEW_IDS.slice(0, n);
  const [task, answer] = makeTask();
  const now = Date.now();
  return {
    bv: { phase: 'play', startsAt: now, round: 1, speed: 'normal', maxHearts: 3, hearts: Object.fromEntries(ids.map((id) => [id, 3])), holder: 'me', heat: 0, task, shakeUntil: 0, lastPass: null, lastBoom: null, nextAt: null, places: {}, now },
    answer,
    fuseAt: now + 9000,
  };
}

const nextAlive = (bv: BombView, from: string) => {
  const ids = Object.keys(bv.hearts);
  for (let k = 1; k <= ids.length; k++) {
    const id = ids[(ids.indexOf(from) + k) % ids.length];
    if (bv.hearts[id] > 0) return id;
  }
  return from;
};

function answer(s: Sim, by: string, choice: number): Sim {
  const now = Date.now();
  if (s.bv.holder !== by || s.bv.phase !== 'play' || now < s.bv.shakeUntil) return s;
  const [task, ans] = makeTask();
  if (choice !== s.answer) return { ...s, answer: ans, bv: { ...s.bv, task, shakeUntil: now + 800, now } };
  const to = nextAlive(s.bv, by);
  return { ...s, answer: ans, bv: { ...s.bv, task, holder: to, lastPass: { from: by, to, at: now, ms: 1200 }, now } };
}

function tick(s: Sim): Sim {
  const now = Date.now();
  const bv = s.bv;
  if (bv.phase === 'play') {
    const left = s.fuseAt - now;
    const heat = (left < 1000 ? 3 : left < 2000 ? 2 : left < 3000 ? 1 : 0) as BombView['heat'];
    if (left > 0) return heat === bv.heat ? s : { ...s, bv: { ...bv, heat, now } };
    const id = bv.holder!;
    const hearts = { ...bv.hearts, [id]: bv.hearts[id] - 1 };
    const out = hearts[id] === 0;
    const alive = Object.keys(hearts).filter((p) => hearts[p] > 0);
    const places = { ...bv.places };
    if (out) places[id] = alive.length + 1;
    if (alive.length <= 1) places[alive[0]] = 1;
    return { ...s, bv: { ...bv, hearts, places, phase: alive.length <= 1 ? 'over' : 'boom', holder: null, task: null, heat: 0, lastBoom: { playerId: id, at: now, out }, nextAt: now + 3000, now } };
  }
  if (bv.phase === 'boom' && bv.nextAt && now >= bv.nextAt) {
    const [task, answer] = makeTask();
    const holder = nextAlive(bv, bv.lastBoom!.playerId);
    return { answer, fuseAt: now + 6000 + Math.random() * 6000, bv: { ...bv, phase: 'play', round: bv.round + 1, holder, task, nextAt: null, now } };
  }
  return s;
}

export function BombPreview({ auth, query: q }: { auth: Auth; query: string }) {
  query = q;
  const [sim, setSim] = useState(startSim);
  const ref = useRef(sim);
  ref.current = sim;
  const over = arg() === 'over';
  useEffect(() => {
    const id = window.setInterval(() => setSim((s) => tick(s)), 100);
    return () => window.clearInterval(id);
  }, []);
  // bots answer after a moment, sometimes wrong
  useEffect(() => {
    const h = sim.bv.holder;
    if (over || !h || h === 'me' || sim.bv.phase !== 'play') return;
    const id = window.setTimeout(() => setSim((s) => answer(s, h, Math.random() < 0.15 ? (s.answer + 1) % (s.bv.task?.choices.length ?? 2) : s.answer)), 1100 + Math.random() * 1200);
    return () => window.clearTimeout(id);
  }, [sim.bv.holder, sim.bv.task?.id, sim.bv.phase]);

  const actions = previewActions((m) => setSim((s) => answer(s, 'me', (m.move as { choice: number }).choice)));
  const bv: BombView = over ? { ...sim.bv, phase: 'over', holder: null, hearts: { me: 2, b1: 0, b2: 0, b3: 0 }, places: { me: 1, b2: 2, b1: 3, b3: 4 }, round: 7 } : sim.bv;
  const ended = bv.phase === 'over';
  const view = previewView('bomb', bv, Object.keys(bv.hearts), { hearts: 3, speed: 'normal' }, ended ? { places: bv.places } : null, bv.holder);
  return <BombTable view={view} actions={actions} bubbles={[]} auth={auth} />;
}
