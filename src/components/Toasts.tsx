import { cx } from '../lib/cards';
import { useNow } from '../lib/useNow';
import type { Note } from '../useBluff';

const VISIBLE_MS = 3500;
const LONG_MS = 6000;

export function Toasts({ notes }: { notes: Note[] }) {
  const now = useNow(500);
  // forfeits and errors stay up longer so they're read
  const live = notes.filter((n) => now - n.at < (n.kind === 'forfeit' || n.kind === 'error' ? LONG_MS : VISIBLE_MS)).slice(-2);
  return (
    <div className="toasts" aria-live="polite">
      {live.map((n) => (
        <div key={n.key} className={cx('toast', n.kind)}>
          {n.text}
        </div>
      ))}
    </div>
  );
}
