import { io } from 'socket.io-client';
import { PLUGGED_GAMES } from '../types';
import { loadAuthToken } from './storage';

// Locally the server runs on port 3001 of the same machine, which also works from phones on home Wi-Fi
const envUrl = (import.meta.env.VITE_SERVER_URL as string | undefined)?.trim().replace(/\/$/, '');
export const SERVER_URL = envUrl || `${location.protocol}//${location.hostname}:3001`;

// the login token is read on every (re)connect, so the server knows which account this is
export const socket = io(SERVER_URL, {
  reconnectionDelayMax: 4000,
  // ready: this app has the lobby's Ready button (older apps never hold up a start)
  // twists: this app shows the Kismat card and makes Seedhi claims; rang: it plays Rang and Crazy 7's power cards
  // games: the registry games this app can draw
  auth: (cb) => cb({ token: loadAuthToken() ?? '', ready: true, twists: true, rang: true, games: [...PLUGGED_GAMES] }),
});

/** reconnect so the server picks up a login or logout */
export function reconnectSocket(): void {
  socket.disconnect();
  socket.connect();
}

/** Error message coming from the server's game rules */
export class ServerError extends Error {}

type Ack<T> = ({ ok: true } & T) | { ok: false; error: string };

/** the shown "Reconnecting…" refusal while offline or while the seat is being taken back */
export const RECONNECTING = 'Reconnecting…';

/** true from a (re)connect until room:rejoin has answered: moves wait so none reach a stale seat */
let rejoining = false;
export const setRejoining = (on: boolean) => {
  rejoining = on;
};

export async function request<T extends object = object>(event: string, payload: object = {}): Promise<T> {
  // offline: fail at once instead of waiting out the 10 s timeout
  if (!socket.connected || (rejoining && event !== 'room:rejoin')) throw new Error(RECONNECTING);
  let res: Ack<T>;
  try {
    res = await socket.timeout(10_000).emitWithAck(event, payload);
  } catch {
    throw new Error('No connection to the server, try again');
  }
  if (!res.ok) throw new ServerError(res.error);
  return res;
}
