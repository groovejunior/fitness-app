export type ThemePref = 'system' | 'light' | 'dark';
const KEY = 'fitness.theme';

export function readStoredTheme(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

let mq: MediaQueryList | null = null;
let listener: (() => void) | null = null;

/** Apply a theme preference to <html>. "system" follows the OS and updates live. */
export function applyTheme(pref: ThemePref): void {
  try {
    localStorage.setItem(KEY, pref);
  } catch {
    /* private mode */
  }
  const root = document.documentElement;
  if (mq && listener) mq.removeEventListener('change', listener);
  const set = (dark: boolean) => {
    root.classList.toggle('dark', dark);
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', dark ? '#111214' : '#f6f5f2'));
  };
  if (pref === 'system') {
    mq = window.matchMedia('(prefers-color-scheme: dark)');
    listener = () => set(mq!.matches);
    mq.addEventListener('change', listener);
    set(mq.matches);
  } else set(pref === 'dark');
}
