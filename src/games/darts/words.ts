import type { DartThrow } from '../../types';

// What a dart is called: short on the chalkboard (T20, D16, BULL), long in the pop-up (Treble 20!)

export function dartWord(d: Pick<DartThrow, 'ring' | 'number'>): string {
  switch (d.ring) {
    case 'bull':
      return 'BULL';
    case 'outerBull':
      return '25';
    case 'treble':
      return `T${d.number}`;
    case 'double':
      return `D${d.number}`;
    case 'single':
      return String(d.number);
    default:
      return '✗';
  }
}

export function dartLabel(d: Pick<DartThrow, 'ring' | 'number' | 'score'>): string {
  switch (d.ring) {
    case 'bull':
      return 'BULL!';
    case 'outerBull':
      return 'OUTER BULL 25';
    case 'treble':
      return `TREBLE ${d.number}!`;
    case 'double':
      return `DOUBLE ${d.number}`;
    case 'single':
      return String(d.score);
    default:
      return 'MISS';
  }
}

/** the pop's colour: gold trebles, green doubles, a red-gold burst for the bull */
export const dartTone = (ring: DartThrow['ring']): string => (ring === 'treble' ? 'gold' : ring === 'double' ? 'green' : ring === 'bull' || ring === 'outerBull' ? 'bull' : ring === 'miss' ? 'miss' : '');

/** every single dart worth aiming at, biggest first */
const AIMS: [string, number][] = [
  ...Array.from({ length: 20 }, (_, i): [string, number] => [`T${20 - i}`, (20 - i) * 3]),
  ['BULL', 50],
  ...Array.from({ length: 20 }, (_, i): [string, number] => [`D${20 - i}`, (20 - i) * 2]),
  ['25', 25],
  ...Array.from({ length: 20 }, (_, i): [string, number] => [String(20 - i), 20 - i]),
];
/** the dart that finishes exactly, if one can */
function oneDart(left: number): string | null {
  return AIMS.find(([, v]) => v === left)?.[0] ?? null;
}

/** a finishing tip for what's left: the one dart that finishes, else one that leaves a one-dart finish, else T20 */
export function checkoutHint(left: number, darts: number): string {
  if (darts <= 0 || left <= 0) return `${left} left`;
  const one = oneDart(left);
  if (one) return `Need ${left}: ${one}`;
  if (left > 170) return `${left} left · aim T20`;
  if (darts >= 2) {
    const setup = AIMS.find(([, v]) => v < left && oneDart(left - v) !== null);
    if (setup) return `${left}: ${setup[0]} → ${oneDart(left - setup[1])}`;
  }
  const big = AIMS.find(([, v]) => v < left);
  return `${left} left · aim ${big ? big[0] : 'T20'}`;
}
