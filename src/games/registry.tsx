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
};
