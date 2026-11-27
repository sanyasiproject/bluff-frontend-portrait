import { useEffect, useState } from 'react';
import { cx } from '../lib/cards';
import { unlockAudio } from '../lib/sounds';
import { NUDGE_COOLDOWN_MS } from '../types';
import type { Actions, Nudged } from '../useBluff';

// The host's "get ready" buzz: the button by Start, and the banner on the players' phones

const BANNER_MS = 12_000;

/** ticks every quarter second while the time is in the future */
function useLeft(until: number): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (until <= Date.now()) return;
    const t = window.setInterval(() => {
      setNow(Date.now());
      if (Date.now() >= until) window.clearInterval(t);
    }, 250);
    return () => window.clearInterval(t);
  }, [until]);
  return Math.max(0, Math.ceil((until - now) / 1000));
}

/** host: buzz everyone not ready; a 10 s countdown after each buzz */
export function BuzzButton({ actions }: { actions: Actions }) {
  const [until, setUntil] = useState(0);
  const [busy, setBusy] = useState(false);
  const left = useLeft(until);
  const buzz = async () => {
    if (busy || left > 0) return;
    unlockAudio();
    setBusy(true);
    const count = await actions.nudge();
    setBusy(false);
    if (count === null) return;
    setUntil(Date.now() + NUDGE_COOLDOWN_MS);
    actions.toast(`📳 Buzzed ${count} ${count === 1 ? 'player' : 'players'}`);
  };
  return (
    <button className={cx('btn buzz-btn', left > 0 && 'cooling')} disabled={busy || left > 0} onClick={() => void buzz()} aria-label={left > 0 ? `Buzz again in ${left} seconds` : 'Buzz players to get ready'}>
      <span>📳 Buzz</span>
      <small>{left > 0 ? `again in ${left}s` : 'to get ready'}</small>
    </button>
  );
}

/** player: shown while the host's buzz is fresh and I'm not ready yet */
export function useNudgeBanner(nudged: Nudged | null | undefined, waiting: boolean): Nudged | null {
  const [shown, setShown] = useState<Nudged | null>(null);
  useEffect(() => {
    if (!nudged) return;
    setShown(nudged);
    const t = window.setTimeout(() => setShown(null), BANNER_MS);
    return () => window.clearTimeout(t);
  }, [nudged?.key]);
  return waiting ? shown : null;
}

export function NudgeBanner({ nudge }: { nudge: Nudged }) {
  return (
    <p key={nudge.key} className="nudge-banner" role="alert">
      📳 <b>{nudge.from}</b> is waiting — tap <b>I'm ready</b>
    </p>
  );
}
