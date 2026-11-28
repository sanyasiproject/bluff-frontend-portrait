import type { PublicUser } from '../types';
import { loadAuthToken, loadPref, savePref } from './storage';

// The last account read from the server, so Home shows the profile at once while a sleeping server wakes

const KEY = 'me';

/** the saved account, only while a login token is saved too */
export function loadCachedUser(): PublicUser | null {
  if (!loadAuthToken()) return null;
  try {
    const raw = loadPref(KEY);
    const u = raw ? (JSON.parse(raw) as PublicUser) : null;
    return u && typeof u.id === 'string' && typeof u.displayName === 'string' ? u : null;
  } catch {
    return null;
  }
}

/** keeps the cache in step with the account; null (logged out) clears it */
export function saveCachedUser(user: PublicUser | null): void {
  savePref(KEY, user ? JSON.stringify(user) : '');
}
