import { useEffect } from 'react';
import type { Profile } from '../engine/types';

/** Applies light/dark to <html data-theme>. "system" follows the phone setting. */
export function useTheme(theme: Profile['theme'] | undefined) {
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const t = theme === 'light' || theme === 'dark' ? theme : mq.matches ? 'dark' : 'light';
      document.documentElement.dataset.theme = t;
      const meta = document.querySelectorAll('meta[name="theme-color"]');
      meta.forEach((m) => m.setAttribute('content', t === 'dark' ? '#0f1110' : '#f6f6f3'));
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);
}
