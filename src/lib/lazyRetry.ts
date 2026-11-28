import { lazy, type ComponentType } from 'react';

/** a chunk download that failed once is tried again after a short wait; a second failure reaches the error screen */
export function retryOnce<T>(load: () => Promise<T>, waitMs = 1200): Promise<T> {
  return load().catch(() => new Promise<T>((resolve, reject) => window.setTimeout(() => load().then(resolve, reject), waitMs)));
}

/** React.lazy whose chunk is retried once */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyRetry<T extends ComponentType<any>>(load: () => Promise<{ default: T }>) {
  return lazy(() => retryOnce(load));
}
