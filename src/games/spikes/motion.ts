import { SPIKES_RADIUS, SPIKES_SPEED, type SpikesView } from '../../types';
import { collide, walk } from './geometry';

// Free movement on this phone: I move at once every frame (prediction) and send where I am about 12 times a second;
// everyone else is drawn a little in the past, sliding between the server's updates

/** how often my place goes to the server */
export const SEND_MS = 80;
/** others are drawn this far behind the newest update, so there is always a next point to slide to */
const BUFFER_MS = 100;
/** a server place this far from mine means it moved me (clamped or a fresh game): pull towards it */
const FAR = 1.2;

type P = [number, number];
const dist = (a: P, b: P) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const lerp = (a: P, b: P, k: number): P => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];

export class Motion {
  private local: P | null = null;
  private lastInput = 0;
  private sent: { at: number; p: P } = { at: 0, p: [-1, -1] };
  private samples = new Map<string, { t: number; p: P }[]>();
  private face = new Map<string, number>();
  private shown = new Map<string, { p: P; moving: boolean }>();

  constructor(private meId: string) {}

  /** a new view: remember each player's place at the server's time */
  addView(sp: SpikesView): void {
    for (const [id, p] of Object.entries(sp.pos)) {
      const list = this.samples.get(id) ?? [];
      const last = list[list.length - 1];
      if (last && last.t >= sp.now) continue;
      list.push({ t: sp.now, p: [p[0], p[1]] });
      this.samples.set(id, list.slice(-12));
    }
  }

  /** one frame: moves me by the stick (when I can move) and works out where everyone is drawn */
  frame(sp: SpikesView, serverNow: number, dtMs: number, vec: P, canMove: boolean, send: (x: number, y: number) => void): void {
    const server = sp.pos[this.meId];
    const now = performance.now();
    const lo = SPIKES_RADIUS;
    const hi = sp.size - SPIKES_RADIUS;
    if (server) {
      let moving = false;
      if (!this.local || !canMove) this.local = [server[0], server[1]];
      else {
        const dt = Math.min(0.05, dtMs / 1000);
        if (vec[0] || vec[1]) {
          // crates are solid: push out and slide along them, same rule as the server
          const [x, y] = walk(this.local, [Math.max(lo, Math.min(hi, this.local[0] + vec[0] * SPIKES_SPEED * dt)), Math.max(lo, Math.min(hi, this.local[1] + vec[1] * SPIKES_SPEED * dt))], sp.boxes ?? [], sp.size);
          moving = Math.abs(x - this.local[0]) + Math.abs(y - this.local[1]) > 0.0005;
          if (Math.abs(vec[0]) > 0.15) this.face.set(this.meId, Math.sign(vec[0]));
          this.local = [x, y];
          this.lastInput = now;
        }
        // gently agree with the server: at once if it moved me far, softly once I've stood still a moment
        const err = dist(server, this.local);
        if (err > FAR) this.local = lerp(this.local, server, 0.25);
        else if (now - this.lastInput > 450 && err > 0.03) this.local = lerp(this.local, server, 0.12);
        this.local = collide(this.local, sp.boxes ?? [], sp.size);
        if (now - this.sent.at >= SEND_MS && dist(this.local, this.sent.p) > 0.01) {
          const p: P = [Math.round(this.local[0] * 1000) / 1000, Math.round(this.local[1] * 1000) / 1000];
          this.sent = { at: now, p };
          send(p[0], p[1]);
        }
      }
      this.shown.set(this.meId, { p: this.local, moving });
    }
    const at = serverNow - BUFFER_MS;
    for (const [id, list] of this.samples) {
      if (id === this.meId || !list.length) continue;
      let i = list.findIndex((s) => s.t > at);
      if (i === -1) i = list.length;
      const a = list[Math.max(0, i - 1)];
      const b = list[Math.min(list.length - 1, i)];
      const k = b.t > a.t ? Math.max(0, Math.min(1, (at - a.t) / (b.t - a.t))) : 1;
      const p = lerp(a.p, b.p, k);
      const prev = this.shown.get(id)?.p;
      const moving = i > 0 && i < list.length && dist(a.p, b.p) > 0.02;
      if (prev && Math.abs(p[0] - prev[0]) > 0.002) this.face.set(id, Math.sign(p[0] - prev[0]));
      this.shown.set(id, { p, moving });
    }
  }

  /** where to draw a player, whether they're running and which way they face */
  of(id: string, fallback: P): { p: P; moving: boolean; face: number } {
    const s = this.shown.get(id);
    return { p: s?.p ?? fallback, moving: s?.moving ?? false, face: this.face.get(id) ?? 1 };
  }

  /** a new game: forget the old places */
  reset(): void {
    this.local = null;
    this.samples.clear();
    this.shown.clear();
    this.sent = { at: 0, p: [-1, -1] };
  }
}
