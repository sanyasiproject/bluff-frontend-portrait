import type { ReactNode } from 'react';
import { Icon, type IconName } from '../art/icons';
import { useBack } from '../lib/back';
import { BackButton } from './BackButton';

/** a full-screen page over the current screen, with a back button and an optional header icon */
export function FullPage({ title, onBack, icon, children }: { title: string; onBack: () => void; icon?: IconName; children: ReactNode }) {
  useBack(onBack);
  return (
    <div className="page" role="dialog" aria-modal aria-label={title}>
      <header className="page-head">
        <BackButton onClick={onBack} />
        <h2 className="grow">
          {icon && (
            <span className="page-head-icon" aria-hidden>
              <Icon name={icon} size={22} />
            </span>
          )}
          <span className="page-head-title">{title}</span>
        </h2>
      </header>
      <div className="page-body">{children}</div>
    </div>
  );
}
