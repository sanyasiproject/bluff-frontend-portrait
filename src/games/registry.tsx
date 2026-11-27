import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import type { PluggedKind, RoomView } from '../types';
import type { Auth } from '../useAuth';
import type { Actions, ChatBubble } from '../useBluff';

export type PluggedTableProps = { view: RoomView; actions: Actions; bubbles: ChatBubble[]; auth: Auth };

/** one registry game on this side: its table, and its rules sheet */
export interface GameUi {
  Table: LazyExoticComponent<ComponentType<PluggedTableProps>>;
  Rules: LazyExoticComponent<ComponentType<object>>;
}

// every registry game adds one line here (see CLAUDE.md "How to add a new game")
export const GAME_UI: Record<PluggedKind, GameUi> = {
  ludo: {
    Table: lazy(() => import('./ludo/LudoTable').then((m) => ({ default: m.LudoTable }))),
    Rules: lazy(() => import('./ludo/Rules').then((m) => ({ default: m.LudoRules }))),
  },
  snakes: {
    Table: lazy(() => import('./snakes/SnakesTable').then((m) => ({ default: m.SnakesTable }))),
    Rules: lazy(() => import('./snakes/Rules').then((m) => ({ default: m.SnakesRules }))),
  },
  rmcs: {
    Table: lazy(() => import('./rmcs/RmcsTable').then((m) => ({ default: m.RmcsTable }))),
    Rules: lazy(() => import('./rmcs/Rules').then((m) => ({ default: m.RmcsRules }))),
  },
  darts: {
    Table: lazy(() => import('./darts/DartsTable').then((m) => ({ default: m.DartsTable }))),
    Rules: lazy(() => import('./darts/Rules').then((m) => ({ default: m.DartsRules }))),
  },
  dots: {
    Table: lazy(() => import('./dots/DotsTable').then((m) => ({ default: m.DotsTable }))),
    Rules: lazy(() => import('./dots/Rules').then((m) => ({ default: m.DotsRules }))),
  },
  colorwar: {
    Table: lazy(() => import('./colorwar/ColorWarTable').then((m) => ({ default: m.ColorWarTable }))),
    Rules: lazy(() => import('./colorwar/Rules').then((m) => ({ default: m.ColorWarRules }))),
  },
  fruit: {
    Table: lazy(() => import('./fruit/FruitTable').then((m) => ({ default: m.FruitTable }))),
    Rules: lazy(() => import('./fruit/Rules').then((m) => ({ default: m.FruitRules }))),
  },
  spikes: {
    Table: lazy(() => import('./spikes/SpikesTable').then((m) => ({ default: m.SpikesTable }))),
    Rules: lazy(() => import('./spikes/Rules').then((m) => ({ default: m.SpikesRules }))),
  },
};
