import { useEffect } from 'react';

/** Keeps the screen on while mounted. Silent where unsupported. */
export function useWakeLock(): void {
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    let gone = false;
    const request = async () => {
      try {
        if (!navigator.wakeLock || document.visibilityState !== 'visible') return;
        const l = await navigator.wakeLock.request('screen');
        if (gone) void l.release().catch(() => {});
        else lock = l;
      } catch {
        /* ignore */
      }
    };
    const onVis = () => {
      if (document.visibilityState === 'visible') void request();
    };
    void request();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      gone = true;
      document.removeEventListener('visibilitychange', onVis);
      try {
        void lock?.release().catch(() => {});
      } catch {
        /* ignore */
      }
    };
  }, []);
}
