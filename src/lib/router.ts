// Minimal hash router: #/today, #/plan, #/session/<id>, …
import { useEffect, useState } from 'react';

export interface Route {
  /** Path segments, e.g. ['session', '2026-11-02-gym0', 'active'] */
  parts: string[];
  query: URLSearchParams;
  path: string;
}

function parse(): Route {
  const raw = window.location.hash.replace(/^#/, '') || '/today';
  const [path, qs] = raw.split('?');
  return { parts: path.split('/').filter(Boolean).map(decodeURIComponent), query: new URLSearchParams(qs ?? ''), path };
}

export function useRoute(): Route {
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    const on = () => {
      setRoute(parse());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

export function navigate(path: string, opts: { replace?: boolean } = {}) {
  const url = '#' + path;
  if (opts.replace) {
    history.replaceState(null, '', url);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    window.location.hash = path;
  }
}

export function back(fallback = '/today') {
  if (window.history.length > 1) window.history.back();
  else navigate(fallback, { replace: true });
}
