import { useCallback, useEffect, useRef } from 'react';

/** setTimeout that is cleared when the component unmounts, so no sound or confetti fires after leaving */
export function useTimeouts(): (fn: () => void, ms: number) => number {
  const ids = useRef(new Set<number>());
  useEffect(() => {
    const live = ids.current;
    return () => {
      live.forEach((id) => window.clearTimeout(id));
      live.clear();
    };
  }, []);
  return useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      ids.current.delete(id);
      fn();
    }, ms);
    ids.current.add(id);
    return id;
  }, []);
}
