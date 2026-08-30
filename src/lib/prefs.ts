/** Theme, language and layout preferences, persisted per browser. */
import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import type { RefCallback } from 'react';
import type { Lang } from './format';

type Theme = 'light' | 'dark' | 'system';

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    // Private windows and blocked site data both throw here.
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* nothing we can do, and nothing that should break the page */
  }
}

export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = read('vb:theme');
    return stored === 'light' || stored === 'dark' ? stored : 'system';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') delete root.dataset.theme;
    else root.dataset.theme = theme;
    write('vb:theme', theme);
  }, [theme]);

  // Cycle light -> dark -> follow the system, so there is always a way back.
  const cycle = useCallback(() => {
    setTheme((current) => (current === 'system' ? 'light' : current === 'light' ? 'dark' : 'system'));
  }, []);

  return [theme, cycle];
}

function detectLang(): Lang {
  const stored = read('vb:lang');
  if (stored === 'fi' || stored === 'sv' || stored === 'en') return stored;
  const fromUrl = new URLSearchParams(window.location.search).get('lang');
  if (fromUrl === 'fi' || fromUrl === 'sv' || fromUrl === 'en') return fromUrl;
  const browser = navigator.languages ?? [navigator.language];
  for (const tag of browser) {
    const base = tag.slice(0, 2).toLowerCase();
    if (base === 'fi' || base === 'sv' || base === 'en') return base;
  }
  return 'fi';
}

export function useLang(): [Lang, (next: Lang) => void] {
  const [lang, setLang] = useState<Lang>(detectLang);

  useEffect(() => {
    document.documentElement.lang = lang;
    write('vb:lang', lang);
  }, [lang]);

  return [lang, setLang];
}

/** Chart mode is remembered too — readers tend to have a strong preference. */
export type ChartMode = 'treemap' | 'list' | 'table';

export function useChartMode(defaultMode: ChartMode): [ChartMode, (next: ChartMode) => void] {
  const [mode, setMode] = useState<ChartMode>(() => {
    const stored = read('vb:chart');
    return stored === 'treemap' || stored === 'list' || stored === 'table' ? stored : defaultMode;
  });

  const update = useCallback((next: ChartMode) => {
    setMode(next);
    write('vb:chart', next);
  }, []);

  return [mode, update];
}

/** True when the viewport is at least `query` wide. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

/**
 * Element width, for laying out the treemap without a hard-coded size.
 *
 * Measured directly on mount rather than waiting for the first ResizeObserver
 * callback: the treemap draws nothing at width 0, so an observer that is
 * missing, throttled, or slow to deliver its first entry would leave an empty
 * box on screen with no way to recover. The observer and the resize listener
 * are there to keep up with later changes.
 */
export function useElementWidth<T extends HTMLElement>(): [RefCallback<T>, number] {
  const [width, setWidth] = useState(0);
  const [element, setElement] = useState<T | null>(null);

  useLayoutEffect(() => {
    if (!element) return;

    const measure = () => {
      const next = element.getBoundingClientRect().width;
      setWidth((current) => (Math.abs(current - next) > 0.5 ? next : current));
    };
    measure();

    let observer: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(measure);
      observer.observe(element);
    }
    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', measure);

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
      window.removeEventListener('orientationchange', measure);
    };
  }, [element]);

  return [setElement, width];
}
