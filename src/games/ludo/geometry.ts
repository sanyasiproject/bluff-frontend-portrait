import { LUDO_BASE, LUDO_COLORS, LUDO_HOME, LUDO_LAST_RING, LUDO_TOKENS, ludoCellOf, ludoPath, type LudoColor, type LudoSeat } from '../../types';

// Board maths: the 15×15 board turned so this phone's colour sits bottom left

/** quarter turns clockwise that bring this colour's base to the bottom left */
export const turnsFor = (c: LudoColor | null | undefined): number => (c ? (3 - LUDO_COLORS.indexOf(c) + 4) % 4 : 0);

/** a cell's top-left corner after k clockwise quarter turns */
export function rotCell([x, y]: [number, number], k: number): [number, number] {
  let cx = x + 0.5;
  let cy = y + 0.5;
  for (let i = 0; i < k; i++) [cx, cy] = [15 - cy, cx];
  return [cx - 0.5, cy - 0.5];
}

/** each base's top-left corner on the unturned board, as Board draws it */
export const BASE_AT: Record<LudoColor, [number, number]> = { red: [0, 0], green: [9, 0], yellow: [9, 9], blue: [0, 9] };
/** the four white circles in a base, from its corner (centres) */
export const BASE_SPOTS: [number, number][] = [[2, 2], [4, 2], [2, 4], [4, 4]];
/** each home triangle's centre (centroid) and the way along its long edge, unturned */
const HOME_AT: Record<LudoColor, { c: [number, number]; along: [number, number] }> = {
  red: { c: [6.5, 7.5], along: [0, 1] },
  green: { c: [7.5, 6.5], along: [1, 0] },
  yellow: { c: [8.5, 7.5], along: [0, 1] },
  blue: { c: [7.5, 8.5], along: [1, 0] },
};

/** a goti's square (top-left, unturned): base gotis on their drawn circle, home gotis on their triangle's centre */
function cellOf(c: LudoColor, progress: number, token: number): [number, number] {
  if (progress <= LUDO_BASE) {
    const [bx, by] = BASE_AT[c];
    const [dx, dy] = BASE_SPOTS[token % LUDO_TOKENS];
    return [bx + dx - 0.5, by + dy - 0.5];
  }
  if (progress >= LUDO_HOME) {
    const [x, y] = HOME_AT[c].c;
    return [x - 0.5, y - 0.5];
  }
  return ludoCellOf(c, progress, token);
}

/** where a goti sits on screen (cell units, top-left) */
export const spotOf = (c: LudoColor, progress: number, token: number, k: number) => rotCell(cellOf(c, progress, token), k);

/** the squares a goti hops through, on screen */
export const hopPath = (c: LudoColor, from: number, to: number, k: number) => ludoPath(c, from, to).map((p) => rotCell(p, k));

/** the board corner of a colour after turning: 0 top-left, 1 top-right, 2 bottom-right, 3 bottom-left */
export const cornerOf = (c: LudoColor, k: number): number => (LUDO_COLORS.indexOf(c) + k) % 4;

/** a goti shown on the board: where it stands and how it shares the square */
export interface GotiSpot {
  key: string;
  color: LudoColor;
  playerId: string;
  token: number;
  progress: number;
  x: number;
  y: number;
  /** offset inside the square and size when sharing it */
  dx: number;
  dy: number;
  scale: number;
}

const FAN: Record<number, [number, number][]> = {
  2: [[-0.18, -0.1], [0.18, 0.1]],
  3: [[-0.2, -0.12], [0.2, -0.12], [0, 0.24]],
  4: [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]],
};

/** every goti's spot; gotis on one square shrink and fan out */
export function layout(seats: LudoSeat[], k: number): GotiSpot[] {
  const all: GotiSpot[] = [];
  for (const s of seats) {
    s.tokens.forEach((p, t) => {
      const [x, y] = spotOf(s.color, p, t, k);
      all.push({ key: `${s.color}-${t}`, color: s.color, playerId: s.playerId, token: t, progress: p, x, y, dx: 0, dy: 0, scale: 1 });
    });
  }
  // home gotis line up along their triangle's long edge, shrinking as more arrive
  for (const c of LUDO_COLORS) {
    const done = all.filter((g) => g.color === c && g.progress >= LUDO_HOME);
    if (done.length === 0) continue;
    const { c: [hx, hy], along } = HOME_AT[c];
    const [ax, ay] = rotVec(along, k);
    // upright pawns need a little more room when they line up top to bottom
    const gap = (done.length > 2 ? 0.4 : 0.5) * (ay !== 0 ? 1.15 : 1);
    done.forEach((g, i) => {
      const t = (i - (done.length - 1) / 2) * gap;
      const [x, y] = rotCell([hx - 0.5, hy - 0.5], k);
      g.x = x;
      g.y = y;
      g.dx = ax * t;
      g.dy = ay * t;
      g.scale = done.length === 1 ? 0.9 : done.length === 2 ? 0.7 : 0.56;
    });
  }
  const groups = new Map<string, GotiSpot[]>();
  for (const g of all) {
    if (g.progress >= LUDO_HOME) continue;
    const id = `${g.x.toFixed(2)},${g.y.toFixed(2)}`;
    groups.set(id, [...(groups.get(id) ?? []), g]);
  }
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    const fan = FAN[Math.min(list.length, 4)];
    list.forEach((g, i) => {
      const [dx, dy] = fan[i % fan.length];
      g.dx = dx;
      g.dy = dy;
      g.scale = list.length > 2 ? 0.62 : 0.74;
    });
  }
  return all;
}

/** a direction after k clockwise quarter turns */
function rotVec([x, y]: [number, number], k: number): [number, number] {
  for (let i = 0; i < k; i++) [x, y] = [-y, x];
  return [x, y];
}

/** the goti's transform; the goti box is one square, so 100% is one square */
export const tf = (x: number, y: number, s = 1) => `translate(${x * 100}%, ${y * 100}%) scale(${s})`;

/** a goti on its last few squares glows */
export const almostHome = (p: number) => p > LUDO_LAST_RING && p < LUDO_HOME;
