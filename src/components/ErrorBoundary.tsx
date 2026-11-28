import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Back to Home; missing: Home reloads the app without this tab's seat */
  onHome?: () => void;
  /** a new value (another screen or room) clears a shown error */
  resetKey?: string;
  /** where it sits, for the console */
  where?: string;
}

interface State {
  error: Error | null;
  key?: string;
}

/** shows "Something went wrong" instead of a blank app when a screen throws */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, key: this.props.resetKey };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    return props.resetKey !== state.key ? { error: null, key: props.resetKey } : null;
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(`[app] ${this.props.where ?? 'screen'} crashed`, error, info.componentStack);
    // the dev crash test fires once
    if (import.meta.env.DEV) (window as { bluffCrash?: boolean }).bluffCrash = false;
  }

  private home = () => {
    if (this.props.onHome) {
      this.setState({ error: null });
      this.props.onHome();
      return;
    }
    try {
      sessionStorage.removeItem('bluff.session');
    } catch {
      /* storage blocked */
    }
    location.assign('/');
  };

  render() {
    if (!this.state.error) return this.props.children;
    return <CrashCard onReload={() => location.reload()} onHome={this.home} />;
  }
}

/** the error screen's card */
export function CrashCard({ onReload, onHome }: { onReload: () => void; onHome: () => void }) {
  return (
    <main className="screen center-screen crash-screen" role="alert">
      <div className="crash-card">
        <div className="crash-icon" aria-hidden>
          😵
        </div>
        <h2>Something went wrong</h2>
        <p className="muted">This screen hit a problem. Reload to try again.</p>
        <div className="crash-actions">
          <button className="btn primary" onClick={onReload}>
            Reload
          </button>
          <button className="btn ghost" onClick={onHome}>
            Back to Home
          </button>
        </div>
      </div>
    </main>
  );
}

/** the game server restarted and this room was not brought back */
export function LostGameCard({ onHome }: { onHome: () => void }) {
  return (
    <main className="screen center-screen crash-screen" role="alert">
      <div className="crash-card">
        <div className="crash-icon" aria-hidden>
          🔌
        </div>
        <h2>Game not recovered</h2>
        <p className="muted">The game server restarted and that game couldn't be recovered. No coins moved.</p>
        <div className="crash-actions">
          <button className="btn primary" onClick={onHome}>
            Back to Home
          </button>
        </div>
      </div>
    </main>
  );
}

/** dev only: `window.bluffCrash = true` makes the screen's boundary show the error screen on its next render */
export function CrashProbe({ tick }: { tick: unknown }) {
  void tick;
  if (import.meta.env.DEV && (window as { bluffCrash?: boolean }).bluffCrash) throw new Error('test crash');
  return null;
}
