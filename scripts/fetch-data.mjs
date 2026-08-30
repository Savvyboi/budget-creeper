#!/usr/bin/env node
/**
 * Build the static data files the site ships with.
 *
 *   npm run data                 # years from data/config.json
 *   npm run data -- --years 2024-2026
 *   npm run data -- --years 2026 --no-cache
 *   npm run data -- --refresh-latest      # re-download only the newest year
 *
 * Source: Valtiokonttori / Tutkihallintoa open API, "Valtion talous" v1.
 * The dataset is licensed CC BY 4.0.
 *
 * Output (all written to public/data):
 *   index.json              years available + headline totals, ~10 kB
 *   year-<Y>.json           budget-structure tree with monthly outturn
 *   year-<Y>-org.json       ministry / agency tree      (loaded on demand)
 *   year-<Y>-economic.json  account-class tree          (loaded on demand)
 *   trends.json             multi-year series per budget item (on demand)
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { readTable } from './lib/csv.mjs';
import { API_BASE, API_DOCS, buildUrl, fetchText, mapLimit } from './lib/api.mjs';
import { NameBook } from './lib/names.mjs';
import { YearAggregator, buildYearPayload } from './lib/aggregate.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'public', 'data');
const CACHE_DIR = path.join(ROOT, '.cache', 'api');

const SOURCE = {
  name: 'Valtiokonttori — Tutkihallintoa.fi, avoin rajapinta "Valtion talous" v1',
  dataset: 'Budjettitalouden tapahtumat',
  endpoint: `${API_BASE}/budjettitaloudentapahtumat`,
  docs: API_DOCS,
  licence: 'CC BY 4.0',
  licenceUrl: 'https://creativecommons.org/licenses/by/4.0/deed.fi',
  homepage: 'https://www.tutkihallintoa.fi/',
};

// ---------------------------------------------------------------- CLI parsing

function parseArgs(argv) {
  const args = { years: null, cache: true, refreshLatest: false, concurrency: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--years') args.years = argv[++i];
    else if (a === '--no-cache') args.cache = false;
    else if (a === '--refresh-latest') args.refreshLatest = true;
    else if (a === '--concurrency') args.concurrency = Number(argv[++i]);
    else if (a === '--help' || a === '-h') args.help = true;
    else throw new Error(`Unknown argument: ${a}`);
  }
  return args;
}

function expandYears(spec, config) {
  if (!spec) {
    const { from, to } = config.years;
    return range(from, to);
  }
  const out = new Set();
  for (const part of String(spec).split(',')) {
    const m = part.trim().match(/^(\d{4})(?:\s*-\s*(\d{4}))?$/);
    if (!m) throw new Error(`Cannot read year spec "${part}". Use e.g. 2024 or 2015-2026.`);
    const from = Number(m[1]);
    const to = Number(m[2] ?? m[1]);
    for (const y of range(from, to)) out.add(y);
  }
  return [...out].sort((a, b) => a - b);
}

const range = (from, to) =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i);

// ------------------------------------------------------------------ formatting

const fmtEur = (n) =>
  `${(n / 1e9).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} bn €`;

const bytes = (n) =>
  n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} kB`;

// ----------------------------------------------------------------------- main

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(
      [
        'Usage: node scripts/fetch-data.mjs [options]',
        '',
        '  --years <spec>     e.g. 2026, 2015-2026, 2019,2024-2026',
        '  --refresh-latest   ignore the cache for the newest year only',
        '  --no-cache         ignore the cache entirely',
        '  --concurrency <n>  parallel API requests (default from data/config.json)',
        '',
      ].join('\n'),
    );
    return;
  }

  const config = JSON.parse(await readFile(path.join(ROOT, 'data', 'config.json'), 'utf8'));
  const populationFile = JSON.parse(
    await readFile(path.join(ROOT, 'data', 'population.json'), 'utf8'),
  );
  const years = expandYears(args.years, config);
  const concurrency = args.concurrency || config.concurrency || 3;
  const generatedAt = new Date().toISOString();

  await mkdir(OUT_DIR, { recursive: true });
  if (args.cache) await mkdir(CACHE_DIR, { recursive: true });

  process.stdout.write(
    `Building ${years.length} year(s): ${years[0]}-${years[years.length - 1]}\n` +
      `Source: ${SOURCE.endpoint}\n` +
      `Cache:  ${args.cache ? CACHE_DIR : 'disabled'}\n\n`,
  );

  const names = new NameBook();
  const perYear = [];
  const latestYear = Math.max(...years);

  for (const year of years) {
    const started = Date.now();
    process.stdout.write(`${year}  fetching`);

    const useCache =
      args.cache && !(args.refreshLatest && year === latestYear);

    const requests = config.mainClassCandidates.map((paaluokka) => ({
      paaluokka,
      url: buildUrl('budjettitaloudentapahtumat', {
        paaluokka,
        yearFrom: year,
        yearTo: year,
      }),
    }));

    let downloaded = 0;
    let fromCache = 0;
    const tables = await mapLimit(requests, concurrency, async (req) => {
      const { text, cached } = await fetchText(req.url, {
        cacheDir: useCache ? CACHE_DIR : null,
        label: `${year} main class ${req.paaluokka}`,
      });
      if (cached) fromCache++;
      else downloaded++;
      process.stdout.write('.');
      return { paaluokka: req.paaluokka, table: readTable(text) };
    });

    process.stdout.write(
      ` ${downloaded} downloaded / ${fromCache} cached\n${year}  aggregating`,
    );

    const agg = new YearAggregator(year, {
      revenueBelowCode: config.revenueBelowCode ?? 21,
      names,
    });
    const present = [];
    for (const { paaluokka, table } of tables) {
      const used = agg.ingest(table);
      if (used > 0) present.push(paaluokka);
    }

    if (agg.rowCount === 0) {
      process.stdout.write(`\n${year}  no data returned — skipping year\n\n`);
      continue;
    }

    const payload = buildYearPayload(agg, {
      names,
      population: populationFile.values[String(year)] ?? null,
      generatedAt,
      source: SOURCE,
    });

    const files = [
      [`year-${year}.json`, payload.main],
      [`year-${year}-org.json`, payload.org],
      [`year-${year}-economic.json`, payload.economic],
    ];
    let written = 0;
    for (const [name, data] of files) {
      const json = JSON.stringify(data);
      await writeFile(path.join(OUT_DIR, name), json, 'utf8');
      written += Buffer.byteLength(json);
    }

    const t = payload.totals;
    perYear.push({
      year,
      monthsAvailable: payload.meta.monthsAvailable,
      complete: payload.meta.complete,
      population: payload.meta.population,
      populationProjected: (populationFile._projected || []).includes(year),
      expenditure: { b0: t.expenditure.b0, b: t.expenditure.b, a: t.expenditure.a },
      revenue: { b0: t.revenue.b0, b: t.revenue.b, a: t.revenue.a },
      borrowing: { b0: t.borrowing.b0, b: t.borrowing.b, a: t.borrowing.a },
      balance: t.balance,
      mainClasses: present.length,
    });

    process.stdout.write(
      `\n${year}  ${agg.rowCount.toLocaleString('en-US')} rows, ` +
        `${present.length} main classes, months 1-${payload.meta.monthsAvailable}` +
        `${payload.meta.complete ? '' : ' (year in progress)'}\n` +
        `${year}  expenditure ${fmtEur(t.expenditure.a)} of ${fmtEur(t.expenditure.b)} budgeted · ` +
        `revenue ${fmtEur(t.revenue.a)} · borrowing ${fmtEur(t.borrowing.a)} · ` +
        `balance ${fmtEur(t.balance.a)}\n` +
        `${year}  wrote ${bytes(written)} in ${((Date.now() - started) / 1000).toFixed(1)}s\n\n`,
    );

    // Keep memory flat across a 1998-2026 run.
    payload.org = null;
    payload.economic = null;
    perYear[perYear.length - 1].trendSource = {
      expenditure: payload.main.view.expenditure,
      revenue: payload.main.view.revenue,
    };
  }

  if (!perYear.length) throw new Error('No years produced any data.');

  await writeTrends(perYear);
  const index = {
    generatedAt,
    source: SOURCE,
    population: {
      note: populationFile._comment,
      source: populationFile._source,
      projected: populationFile._projected || [],
    },
    years: perYear.map(({ trendSource, ...rest }) => rest).sort((a, b) => b.year - a.year),
    latestYear: Math.max(...perYear.map((y) => y.year)),
    latestCompleteYear: Math.max(
      ...perYear.filter((y) => y.complete).map((y) => y.year),
      -Infinity,
    ),
  };
  if (!Number.isFinite(index.latestCompleteYear)) index.latestCompleteYear = index.latestYear;

  const indexJson = JSON.stringify(index, null, 2);
  await writeFile(path.join(OUT_DIR, 'index.json'), indexJson, 'utf8');

  process.stdout.write(`index.json  ${bytes(Buffer.byteLength(indexJson))}\n`);
  process.stdout.write(`\nDone. Data written to public/data\n`);
}

/**
 * Multi-year series per budget item, so the detail panel can draw a trend
 * without loading every year. Only the budget-structure view is included; it is
 * the one with stable codes across years.
 */
async function writeTrends(perYear) {
  const years = perYear.map((y) => y.year).sort((a, b) => a - b);
  const nodes = {};

  const ensure = (key, name, level) => {
    let entry = nodes[key];
    if (!entry) {
      entry = { n: name, l: level, a: new Array(years.length).fill(null), b: new Array(years.length).fill(null) };
      nodes[key] = entry;
    } else if (name && name.length > entry.n.length) {
      entry.n = name;
    }
    return entry;
  };

  for (const y of perYear) {
    const slot = years.indexOf(y.year);
    for (const kind of ['expenditure', 'revenue']) {
      const view = y.trendSource[kind];
      for (const [id, node] of Object.entries(view.nodes)) {
        const entry = ensure(`${kind === 'revenue' ? 'r' : 'e'}:${id}`, node.n, node.l);
        entry.a[slot] = node.a;
        entry.b[slot] = node.b;
      }
    }
  }

  const json = JSON.stringify({ years, nodes });
  await writeFile(path.join(OUT_DIR, 'trends.json'), json, 'utf8');
  process.stdout.write(
    `trends.json ${bytes(Buffer.byteLength(json))} (${Object.keys(nodes).length.toLocaleString('en-US')} items across ${years.length} years)\n`,
  );
}

main().catch(async (err) => {
  process.stderr.write(`\nData build failed: ${err.message}\n`);
  if (process.env.DEBUG) process.stderr.write(`${err.stack}\n`);
  process.exitCode = 1;
});
