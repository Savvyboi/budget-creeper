/**
 * HTTP layer for the Valtiokonttori "Valtiontalous" open API.
 *
 * The API is unauthenticated but slow for large slices (a single main class for
 * one year is 5-10 MB of CSV), so every response is cached on disk, gzipped.
 * Re-running the build is then essentially free.
 */
import { createHash } from 'node:crypto';
import { gunzipSync, gzipSync } from 'node:zlib';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

export const API_BASE = 'https://api.tutkihallintoa.fi/valtiontalous/v1';
export const API_DOCS =
  'https://avoindata.tutkihallintoa.fi/api-details#api=valtiontalous&operation=BudjettitaloudenTapahtumat';

export function buildUrl(resource, params = {}) {
  const url = new URL(`${API_BASE}/${resource}`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  }
  return url.toString();
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Fetch a URL as text, with on-disk caching and exponential-backoff retries.
 * `cacheDir: null` disables the cache.
 */
export async function fetchText(url, { cacheDir, retries = 4, timeoutMs = 900_000, label } = {}) {
  const key = createHash('sha1').update(url).digest('hex').slice(0, 16);
  const cacheFile = cacheDir ? path.join(cacheDir, `${key}.csv.gz`) : null;

  if (cacheFile && existsSync(cacheFile)) {
    const buf = await readFile(cacheFile);
    return { text: gunzipSync(buf).toString('utf8'), cached: true };
  }

  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      const wait = Math.min(30_000, 2 ** attempt * 1000);
      process.stderr.write(`   retry ${attempt}/${retries} in ${wait / 1000}s — ${label ?? url}\n`);
      await sleep(wait);
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: 'text/csv, application/json;q=0.9, */*;q=0.5' },
      });
      if (!res.ok) {
        const body = (await res.text()).slice(0, 200);
        throw new Error(`HTTP ${res.status} ${res.statusText} — ${body}`);
      }
      const text = await res.text();
      if (cacheFile) {
        await mkdir(path.dirname(cacheFile), { recursive: true });
        await writeFile(cacheFile, gzipSync(Buffer.from(text, 'utf8')));
      }
      return { text, cached: false };
    } catch (err) {
      lastError = err;
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(`Failed to fetch ${url}: ${lastError?.message ?? lastError}`);
}

/** Run `worker` over `items` with bounded concurrency, preserving input order. */
export async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await worker(items[i], i);
    }
  });
  await Promise.all(runners);
  return results;
}
