import { LUDO_COLORS, LUDO_HOME, LUDO_LAST_RING, ludoCellOf, ludoPath, type LudoColor, type LudoSeat } from '../../types';

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

/** where a goti sits on screen (cell units, top-left) */
export const spotOf = (c: LudoColor, progress: number, token: number, k: number) => rotCell(ludoCellOf(c, progress, token), k);

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
  3: [[-0.2, -0.14], [0.2, -0.14], [0, 0.18]],
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
  const groups = new Map<string, GotiSpot[]>();
  for (const g of all) {
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

/** the goti's transform; the goti box is one square, so 100% is one square */
export const tf = (x: number, y: number, s = 1) => `translate(${x * 100}%, ${y * 100}%) scale(${s})`;

/** a goti on its last few squares glows */
export const almostHome = (p: number) => p > LUDO_LAST_RING && p < LUDO_HOME;
