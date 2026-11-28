import { lazy } from 'react';
import { retryOnce } from './lib/lazyRetry';

// Screens not needed for the first Home paint load in their own chunks; prefetchScreens warms them once Home is idle

const load = {
  lobby: () => import('./components/Lobby'),
  table: () => import('./components/Table'),
  crazy7: () => import('./components/Crazy7Table'),
  rang: () => import('./components/RangTable'),
  admin: () => import('./components/AdminPanel'),
  profile: () => import('./components/ProfilePage'),
  tutorial: () => import('./components/tutorial/TutorialPage'),
};

export const LazyLobby = lazy(() => retryOnce(load.lobby).then((m) => ({ default: m.Lobby })));
export const LazyTable = lazy(() => retryOnce(load.table).then((m) => ({ default: m.Table })));
export const LazyCrazy7Table = lazy(() => retryOnce(load.crazy7).then((m) => ({ default: m.Crazy7Table })));
export const LazyRangTable = lazy(() => retryOnce(load.rang).then((m) => ({ default: m.RangTable })));
export const LazyAdminPanel = lazy(() => retryOnce(load.admin).then((m) => ({ default: m.AdminPanel })));
export const LazyProfilePage = lazy(() => retryOnce(load.profile).then((m) => ({ default: m.ProfilePage })));
export const LazyTutorialPage = lazy(() => retryOnce(load.tutorial).then((m) => ({ default: m.TutorialPage })));

let warmed = false;

/** downloads the lobby, tables and profile in the background so opening them later is instant */
export function prefetchScreens(): void {
  if (warmed) return;
  warmed = true;
  const order: (() => Promise<unknown>)[] = [load.lobby, load.profile, load.table, load.crazy7, load.rang, load.tutorial];
  // one after another, so they never compete with what the player is doing
  void order.reduce<Promise<unknown>>((p, next) => p.then(() => next().catch(() => {})), Promise.resolve());
}
