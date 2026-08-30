/**
 * Data loading.
 *
 * Everything is a static JSON file under ./data, generated once a year by the
 * pipeline in ../build. Each file is fetched at most once per session and kept
 * in a module-level cache, so switching year, view or language never
 * re-downloads.
 *
 * The base URL is resolved from this module's own location, which is what lets
 * the whole folder be served from any path without configuration.
 */

const BASE = new URL('../data/', import.meta.url);

const cache = new Map();

function load(file) {
  const existing = cache.get(file);
  if (existing) return existing;

  const request = fetch(new URL(file, BASE), { headers: { Accept: 'application/json' } })
    .then((res) => {
      if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
      return res.json();
    })
    .catch((err) => {
      // A failed load must not poison the cache — the retry button depends on it.
      cache.delete(file);
      throw err;
    });

  cache.set(file, request);
  return request;
}

export const loadIndex = () => load('index.json');

export const loadYear = (year) => load(`year-${year}.json`);

export const loadTrends = () => load('trends.json');

/**
 * The budget-structure view ships inside the year file because it is what the
 * page opens on; the other two are separate downloads.
 */
export function loadExtraView(year, view) {
  const suffix = view === 'org' ? 'org' : 'economic';
  return load(`year-${year}-${suffix}.json`);
}

/** Warm the cache for a year the reader is likely to open next. */
export function prefetchYear(year) {
  if (cache.has(`year-${year}.json`)) return;
  loadYear(year).catch(() => {
    /* prefetch failures are not worth surfacing */
  });
}
