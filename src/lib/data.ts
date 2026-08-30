/**
 * Data loading.
 *
 * Everything is a static JSON file under /data, generated once a year by
 * `npm run data`. Each file is fetched at most once per session and kept in a
 * module-level cache, so switching year, view or language never re-downloads.
 */
import type { ExtraViewData, IndexData, TrendsData, ViewId, YearData } from '../types';

const BASE = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/data`;

const cache = new Map<string, Promise<unknown>>();

function load<T>(file: string): Promise<T> {
  const existing = cache.get(file) as Promise<T> | undefined;
  if (existing) return existing;

  const request = fetch(`${BASE}/${file}`, { headers: { Accept: 'application/json' } })
    .then((res) => {
      if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
      return res.json() as Promise<T>;
    })
    .catch((err) => {
      // A failed load must not poison the cache — the retry button depends on it.
      cache.delete(file);
      throw err;
    });

  cache.set(file, request);
  return request;
}

export const loadIndex = () => load<IndexData>('index.json');

export const loadYear = (year: number) => load<YearData>(`year-${year}.json`);

export const loadTrends = () => load<TrendsData>('trends.json');

/**
 * The budget-structure view ships inside the year file because it is what the
 * page opens on; the other two are separate downloads.
 */
export function loadExtraView(year: number, view: Exclude<ViewId, 'budget'>) {
  const suffix = view === 'org' ? 'org' : 'economic';
  return load<ExtraViewData>(`year-${year}-${suffix}.json`);
}

/** Warm the cache for a year the reader is likely to open next. */
export function prefetchYear(year: number): void {
  if (cache.has(`year-${year}.json`)) return;
  loadYear(year).catch(() => {
    /* prefetch failures are not worth surfacing */
  });
}
