import { lazy, useState, type ComponentType, type LazyExoticComponent } from 'react';
import type { PluggedKind, RoomView } from '../types';
import type { Auth } from '../useAuth';
import type { Actions, ChatBubble } from '../useBluff';

export type PluggedTableProps = { view: RoomView; actions: Actions; bubbles: ChatBubble[]; auth: Auth };

/** one registry game on this side: its table, and its rules sheet */
export interface GameUi {
  Table: ComponentType<PluggedTableProps>;
  Rules: LazyExoticComponent<ComponentType<object>>;
}

/** each table's chunk loader: the lazy Table and the prefetch use the same import, so the chunk downloads once */
export const TABLE_LOAD = {
  ludo: () => import('./ludo/LudoTable').then((m) => ({ default: m.LudoTable })),
  snakes: () => import('./snakes/SnakesTable').then((m) => ({ default: m.SnakesTable })),
  rmcs: () => import('./rmcs/RmcsTable').then((m) => ({ default: m.RmcsTable })),
  darts: () => import('./darts/DartsTable').then((m) => ({ default: m.DartsTable })),
  dots: () => import('./dots/DotsTable').then((m) => ({ default: m.DotsTable })),
  colorwar: () => import('./colorwar/ColorWarTable').then((m) => ({ default: m.ColorWarTable })),
  fruit: () => import('./fruit/FruitTable').then((m) => ({ default: m.FruitTable })),
  spikes: () => import('./spikes/SpikesTable').then((m) => ({ default: m.SpikesTable })),
  chess: () => import('./chess/ChessTable').then((m) => ({ default: m.ChessTable })),
} satisfies Record<PluggedKind, () => Promise<{ default: ComponentType<PluggedTableProps> }>>;

/** tables whose chunk already arrived (prefetched in the lobby or at home) */
const ready: Partial<Record<PluggedKind, ComponentType<PluggedTableProps>>> = {};
/** downloads a table's chunk and remembers it, so the table can draw on its first frame */
export const loadTable = (kind: PluggedKind) =>
  TABLE_LOAD[kind]().then((m) => {
    ready[kind] = m.default;
    return m;
  });

/** the table for a game: drawn at once when its chunk is already here, else lazily (picked once per mount, so it never remounts) */
function tableFor(kind: PluggedKind): ComponentType<PluggedTableProps> {
  const Lazy: LazyExoticComponent<ComponentType<PluggedTableProps>> = lazy(() => loadTable(kind));
  return function GameTable(props: PluggedTableProps) {
    const [Now] = useState(() => ready[kind] ?? null);
    return Now ? <Now {...props} /> : <Lazy {...props} />;
  };
}

// every registry game adds one line here and one in TABLE_LOAD (see CLAUDE.md "How to add a new game")
export const GAME_UI: Record<PluggedKind, GameUi> = {
  ludo: {
    Table: tableFor('ludo'),
    Rules: lazy(() => import('./ludo/Rules').then((m) => ({ default: m.LudoRules }))),
  },
  snakes: {
    Table: tableFor('snakes'),
    Rules: lazy(() => import('./snakes/Rules').then((m) => ({ default: m.SnakesRules }))),
  },
  rmcs: {
    Table: tableFor('rmcs'),
    Rules: lazy(() => import('./rmcs/Rules').then((m) => ({ default: m.RmcsRules }))),
  },
  darts: {
    Table: tableFor('darts'),
    Rules: lazy(() => import('./darts/Rules').then((m) => ({ default: m.DartsRules }))),
  },
  dots: {
    Table: tableFor('dots'),
    Rules: lazy(() => import('./dots/Rules').then((m) => ({ default: m.DotsRules }))),
  },
  colorwar: {
    Table: tableFor('colorwar'),
    Rules: lazy(() => import('./colorwar/Rules').then((m) => ({ default: m.ColorWarRules }))),
  },
  fruit: {
    Table: tableFor('fruit'),
    Rules: lazy(() => import('./fruit/Rules').then((m) => ({ default: m.FruitRules }))),
  },
  spikes: {
    Table: tableFor('spikes'),
    Rules: lazy(() => import('./spikes/Rules').then((m) => ({ default: m.SpikesRules }))),
  },
  chess: {
    Table: tableFor('chess'),
    Rules: lazy(() => import('./chess/Rules').then((m) => ({ default: m.ChessRules }))),
  },
};
