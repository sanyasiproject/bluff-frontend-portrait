import { useEffect, useState } from 'react';
import { APP_FULL_NAME } from '../art/appVariant';
import { BaithakLogo, BaithakWordmark } from '../art/BaithakLogo';
import type { ConnStatus } from '../useBluff';

/** what the intro says while it waits, by seconds waited */
function statusLine(sec: number, status: ConnStatus): string {
  if (sec < 3) return 'Setting up the baithak…';
  if (sec < 15) return 'Waking up the server…';
  if (sec < 45) return 'The free server sleeps after a break. This can take up to a minute.';
  return status === 'offline' ? 'Still trying… check your internet connection.' : 'Almost there…';
}

/** intro shown while the app starts and the server wakes up; index.html has the same markup for the first paint */
export function Splash({ status }: { status: ConnStatus }) {
  const [sec, setSec] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const t = setInterval(() => setSec(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <main className="splash nt-splash">
      <BaithakLogo size={112} className="splash-mark" />
      <BaithakWordmark size={44} className="splash-word" title={APP_FULL_NAME} />
      <span className="nt-edition splash-edition" aria-hidden data-no-translate>
        Upright
      </span>
      <p className="splash-tag">Ludo, Saanp Seedhi, Darts, cards and more — with your friends</p>
      {/* three bouncing gotis: red, green, yellow */}
      <div className="splash-loader nt-gotis" aria-hidden>
        <i />
        <i />
        <i />
      </div>
      <p className="splash-status" aria-live="polite">
        {statusLine(sec, status)}
      </p>
      {sec >= 60 && (
        <button className="btn small" onClick={() => location.reload()}>
          Try again
        </button>
      )}
    </main>
  );
}
