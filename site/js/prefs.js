/** Theme, language and layout preferences, persisted per browser. */

function read(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    // Private windows and blocked site data both throw here.
    return null;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* nothing we can do, and nothing that should break the page */
  }
}

// ------------------------------------------------------------------- theme

export function readTheme() {
  const stored = read('vb:theme');
  return stored === 'light' || stored === 'dark' ? stored : 'system';
}

export function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'system') delete root.dataset.theme;
  else root.dataset.theme = theme;
  write('vb:theme', theme);
}

/** Cycle light -> dark -> follow the system, so there is always a way back. */
export function nextTheme(current) {
  return current === 'system' ? 'light' : current === 'light' ? 'dark' : 'system';
}

// ---------------------------------------------------------------- language

export function detectLang() {
  const stored = read('vb:lang');
  if (stored === 'fi' || stored === 'sv' || stored === 'en') return stored;
  const fromUrl = new URLSearchParams(window.location.search).get('lang');
  if (fromUrl === 'fi' || fromUrl === 'sv' || fromUrl === 'en') return fromUrl;
  const browser = navigator.languages || [navigator.language];
  for (const tag of browser) {
    const base = String(tag).slice(0, 2).toLowerCase();
    if (base === 'fi' || base === 'sv' || base === 'en') return base;
  }
  return 'fi';
}

export function applyLang(lang) {
  document.documentElement.lang = lang;
  write('vb:lang', lang);
}

// -------------------------------------------------------------- chart mode

export function readChartMode(fallback) {
  const stored = read('vb:chart');
  return stored === 'treemap' || stored === 'list' || stored === 'table' ? stored : fallback;
}

export function writeChartMode(mode) {
  write('vb:chart', mode);
}

// ------------------------------------------------------------------ layout

export const DESKTOP_QUERY = '(min-width: 62rem)';

export const isDesktop = () => window.matchMedia(DESKTOP_QUERY).matches;

/** Call `handler` whenever the layout crosses the desktop breakpoint. */
export function onLayoutChange(handler) {
  const mql = window.matchMedia(DESKTOP_QUERY);
  mql.addEventListener('change', () => handler(mql.matches));
}

/**
 * Width of an element, reported now and whenever it changes.
 *
 * Measured directly rather than waiting for the first ResizeObserver callback:
 * the treemap draws nothing at width 0, so an observer that is missing,
 * throttled or slow to deliver its first entry would leave an empty box on
 * screen with no way to recover. Returns a stop function.
 */
export function observeWidth(element, handler) {
  let last = -1;
  const measure = () => {
    const next = element.getBoundingClientRect().width;
    if (Math.abs(next - last) > 0.5) {
      last = next;
      handler(next);
    }
  };
  measure();

  let observer;
  if (typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(measure);
    observer.observe(element);
  }
  window.addEventListener('resize', measure);
  window.addEventListener('orientationchange', measure);

  return () => {
    if (observer) observer.disconnect();
    window.removeEventListener('resize', measure);
    window.removeEventListener('orientationchange', measure);
  };
}
