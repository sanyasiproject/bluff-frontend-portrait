import { useEffect, useRef, useState } from 'react';
import { reducedMotion } from '../../lib/motion';
import { sfx } from '../../lib/sounds';
import { CM } from './Pieces';
import { toScreen } from './geometry';
import { CarromSim, launchOf, type CarromCoin, type CarromSide } from './lib';

// Plays a shot at 60 fps with the shared simulation (the same one the server ran), then hands back to the
// server's final board. Pieces move by their <g> transform; sounds follow the simulation's events

export interface Shot {
  seq: number;
  side: CarromSide;
  x: number;
  dx: number;
  dy: number;
  power: number;
  before: CarromCoin[];
}

/** at most this many sounds a frame, so a break doesn't turn into noise */
const SOUNDS_PER_FRAME = 3;

export function useShotAnim(mySide: CarromSide) {
  const els = useRef(new Map<string, SVGGElement>());
  /** the shot being played, its start coins drawn while it runs */
  const [playing, setPlaying] = useState<Shot | null>(null);
  const raf = useRef(0);
  const done = useRef<number | null>(null);
  const onEnd = useRef<(seq: number) => void>(() => undefined);

  const bind = (id: string, el: SVGGElement | null) => {
    if (el) els.current.set(id, el);
    else els.current.delete(id);
  };

  /** starts a shot unless it already played; false when it had already finished */
  const play = (shot: Shot): boolean => {
    if (done.current === shot.seq) return false;
    if (playing?.seq === shot.seq) return true;
    cancelAnimationFrame(raf.current);
    setPlaying(shot);
    return true;
  };

  useEffect(() => {
    if (!playing) return;
    const sim = new CarromSim(playing.before, launchOf(playing.side, playing.x, playing.dx, playing.dy, playing.power));
    let t0 = 0;
    let heard = 0;
    const gone = new Set<string>();
    const frame = (now: number) => {
      if (!t0) t0 = now;
      sim.advance(now - t0);
      for (const p of sim.pieces()) {
        const el = els.current.get(p.id);
        if (!el) continue;
        const s = toScreen(mySide, p.x, p.y);
        el.setAttribute('transform', `translate(${s.x * CM} ${s.y * CM})`);
        if (!p.on && !gone.has(p.id)) {
          gone.add(p.id);
          el.classList.add('sunk');
        }
      }
      let n = 0;
      while (heard < sim.events.length && sim.events[heard].t <= now - t0) {
        const e = sim.events[heard++];
        if (n++ >= SOUNDS_PER_FRAME) continue;
        if (e.kind === 'pocket') sfx.carromPocket();
        else if (e.kind === 'hit') sfx.carromClack(e.v);
        else sfx.carromWall(e.v);
        if (e.kind === 'pocket' && !reducedMotion()) navigator.vibrate?.(15);
      }
      if (sim.done) {
        done.current = playing.seq;
        setPlaying(null);
        onEnd.current(playing.seq);
        return;
      }
      raf.current = requestAnimationFrame(frame);
    };
    raf.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf.current);
  }, [playing, mySide]);

  return { playing, play, bind, onEnd };
}
