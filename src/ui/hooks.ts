/** Small React hooks for the player view. */
import { useEffect, useState } from 'react';

/**
 * `performance.now()`, refreshed every animation frame while `active`.
 * Components that show the moving position use this; everything else re-renders
 * only when the store changes.
 */
export function useFrameNow(active: boolean): number {
  const [t, setT] = useState(() => performance.now());
  useEffect(() => {
    setT(performance.now());
    if (!active) return;
    let id = requestAnimationFrame(function tick(now) {
      setT(now);
      id = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(id);
  }, [active]);
  return active ? t : performance.now();
}

/** Keep the screen awake while `active` (phones and tablets dim otherwise). */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const acquire = () =>
      navigator.wakeLock
        .request('screen')
        .then(l => {
          if (cancelled) void l.release();
          else lock = l;
        })
        .catch(() => {});
    const onVisible = () => {
      if (document.visibilityState === 'visible') void acquire();
    };
    void acquire();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      void lock?.release();
    };
  }, [active]);
}
