# Valtion budjetti — an explorer for the Finnish state budget

A small, fast, static site that shows where central government money in Finland
is budgeted and where it actually goes, in the spirit of the old
*tutkibudjettia.fi* and *avoinbudjetti.fi*.

All figures come from Valtiokonttori's open **Valtion talous** API on
[avoindata.tutkihallintoa.fi](https://avoindata.tutkihallintoa.fi/api-details#api=valtiontalous),
dataset *Budjettitalouden tapahtumat*. The API is called **once, at build time**;
the browser only ever loads static JSON. That is what makes the site cheap to
host and safe to leave alone between annual updates.

```
npm install
npm run data     # fetch + aggregate the years in data/config.json  (~1 min/year)
npm run dev      # http://localhost:5173
npm run build    # -> dist/, ready for Cloudflare Pages, Vercel or GitHub Pages
```

---

## What you get

| | |
|---|---|
| **Three hierarchies** | budget structure (main class → chapter → item), ministry branch → agency → item, and economic nature (account class → group → account) |
| **Both sides** | expenditure and revenue, with borrowing separated out so the deficit is the real one |
| **Three renderings** | treemap, bar list and an exact-figures table — the choice is remembered |
| **Budget vs outturn** | original budget, supplementary budgets, budget in force, and what was actually spent, per item |
| **Time** | outturn per month, cumulative against the appropriation, and a year-by-year trend |
| **Deep links** | `#/2025/menot/rakenne/28.90.30` restores year, side, view and position |
| **Three languages** | Finnish, Swedish, English UI (data labels are Finnish — see *Caveats*) |
| **Mobile first** | the detail panel is a bottom sheet on phones and a side panel on desktop |
| **Navigation** | every item's sub-items are listed in its detail panel, one click deep; the list view has a separate drill control per row |
| **Keyboard** | `/` or `⌘K` search, `↑ ↓ ↵` in results, `Backspace` to go up a level, `Esc` to close |
| **Offline-friendly output** | no runtime API calls, no third-party requests, no cookies, no analytics |

---

## Updating the data once a year

The whole yearly ritual is two commands:

```bash
npm run data -- --years 2026 --no-cache
npm run build
```

Then commit `public/data/` and deploy. A few notes:

- **When to run it.** Data for a year keeps accumulating month by month. Re-run
  in February or March once December is booked, and the previous year becomes
  *complete*; the site labels any year that is not complete and refuses to
  compare it with a full year's budget.
- **Widening the range.** `data/config.json` holds the year window. The API goes
  back to 1998 — `npm run data:all` builds the lot, which takes roughly a minute
  per year and about 150 MB of downloads per year.
- **The cache.** Raw API responses are stored gzipped in `.cache/api/`
  (git-ignored), so a rebuild after a code change costs seconds rather than
  minutes. `--refresh-latest` re-downloads only the newest year;
  `--no-cache` re-downloads everything.
- **Population.** `data/population.json` feeds the optional "per resident"
  figures. Update the last entry from Statistics Finland once a year, and move
  the year out of `_projected` when the real figure lands.
- **Icons.** `node scripts/make-icons.mjs` regenerates `apple-touch-icon.png` and
  `og.png`. Only needed if you change the colours.

A full run prints a summary you should sanity-check before deploying:

```
2025  154,184 rows, 19 main classes, months 1-12
2025  expenditure 89.40 bn € of 90.25 bn € budgeted · revenue 76.34 bn € ·
      borrowing 16.69 bn € · balance -13.05 bn €
```

---

## Deploying

The build output is a plain static directory. Nothing is server-rendered, there
are no serverless functions and routing lives in the URL hash, so every target
below is essentially zero-config.

### Cloudflare Pages

Connect the repository and set:

- **Build command** `npm run build`
- **Build output directory** `dist`

`public/_headers` is picked up automatically and sets the cache and security
headers, including a `script-src 'self'` CSP. That is why the theme bootstrap
lives in `public/boot-theme.js` rather than inline in `index.html` — keep it
that way, or the page will flash the wrong theme on every load.

For Wrangler / Workers Assets instead of Pages:

```bash
npx wrangler pages deploy dist
```

### Vercel

Import the repository. The framework is detected as Vite; `vercel.json` pins the
build command, output directory and headers. Or from the CLI:

```bash
npx vercel deploy --prod
```

### GitHub Pages (free, and the whole site fits)

`.github/workflows/deploy-pages.yml` is already here. Three steps:

1. Push the repository to GitHub. **Commit `public/data/`** — it is the site.
2. Repository → **Settings → Pages → Build and deployment → Source: GitHub
   Actions**. (Not "Deploy from a branch" — the workflow uploads an artifact.)
3. Push to `main`. The workflow builds and publishes; the URL appears in the
   Actions run and under Settings → Pages.

The one thing that needs care is the path. A project site is served from
`https://<user>.github.io/<repo>/`, not from the root, so every asset URL needs
that prefix. The workflow passes it in:

```yaml
env:
  BASE_PATH: /${{ github.event.repository.name }}/
```

Vite rewrites the bundle, the files referenced from `index.html`, and
`import.meta.env.BASE_URL` — which is how `src/lib/data.ts` finds `/data`. On a
**user or organisation site** (`<user>.github.io`) or a **custom domain**, the
site *is* at the root: change that line to `BASE_PATH: /`.

To reproduce a project-site build locally before pushing:

```bash
BASE_PATH=/your-repo-name/ npm run build
```

On Windows in PowerShell, `$env:BASE_PATH = "/your-repo-name/"; npm run build`.
(Git Bash rewrites values that look like Unix paths, which mangles the prefix —
use PowerShell there, or `MSYS_NO_PATHCONV=1`.)

Two limits worth knowing. GitHub Pages **cannot set custom headers**, so the
cache and security rules in `public/_headers` and `vercel.json` are simply
ignored — the site works, but without the CSP those two targets apply. And a
Pages site has a **1 GB soft limit**; this build is about 7 MB with twelve years
of data, so a full 1998– archive would still fit comfortably.

Routing uses the URL hash, so no 404 fallback or rewrite rules are needed —
which is exactly why Pages works here without a workaround.

### Anywhere else

`dist/` is a static bundle — S3, Netlify, nginx, any CDN. Set `BASE_PATH` if you
serve it from a subdirectory; otherwise there is nothing to configure.

---

## How the numbers are derived

This is the part worth understanding before you trust a figure.

**The source rows are monthly movements, not running totals.** One row is a
(month, agency, budget account, ledger account) combination. Annual figures are
plain sums over the twelve months. That means:

- `Alkuperäinen_talousarvio` (original budget) appears in the month the budget
  was confirmed — January.
- `Lisätalousarvio` (supplementary budget) appears in the month each
  supplementary budget passed, and can be negative.
- `Voimassaoleva_talousarvio` (budget in force) summed over the year equals
  original + supplementary.
- `Nettokertymä` summed over the year is the outturn.

**Revenue is negative in the source.** State bookkeeping credits revenue, so
revenue rows arrive with a minus sign. The build negates them and the site shows
both sides as positive magnitudes, with the direction in the heading.

**Borrowing is not revenue.** Revenue department 15 *Lainat* is the borrowing
budgeted to close the gap, which is why the budget always balances on paper. The
build reports it separately, and the deficit is `revenue (excluding 15) −
expenditure`.

**Rows outside the budget economy are dropped.** The source also carries rows
with a non-numeric main class (`6-alkuiset`, `Tapahtumia vain
liikekirjanpidossa`). They are not part of the budget economy and are excluded.

**The spending-type view has no budget figures.** Appropriations are not
classified by account in the source: every budget row carries the placeholder
account class `Tapahtumia / vain talousarviokirjanpidossa`, so left alone that
view would show one node holding the entire budget and nothing else. The build
keeps only rows with an actual outturn there and drops the budget columns, and
the UI says why.

**Names are normalised.** From budget year 2025 the source switched main class
and chapter names to ALL CAPS. The build restores sentence case, preferring a
real mixed-case spelling of the same code from another year where one exists,
and protecting acronyms (`EU:n`, `HUS-yhtymän`).

### Caveats

- **Item names are truncated at 60 characters upstream.** The API itself returns
  them that way; nothing here can recover the full text. The item code is the
  reliable identifier, and every detail panel links to the exact API query that
  produced its figures.
- **Data labels exist only in Finnish.** The UI is trilingual; the register is
  not. The site says so rather than machine-translating public finance terms.
- **Population figures are rounded to the nearest thousand** and the two most
  recent years are projections. They only affect the optional per-resident line.
- **A year in progress is not comparable to a full year.** The site labels it and
  suppresses year-on-year comparisons rather than drawing a misleading number.
- **"Revenue" means two things, so both are named in full.** The headline card
  reads *revenue excluding borrowing*, because that is what the deficit is
  measured against. The explorer's revenue side is the complete budget side and
  includes department 15 *Lainat*.
- **Outturn can exceed the budget in force** without anything being wrong:
  appropriations carried over from earlier years are spendable this year. Where
  that gap is material the detail panel also shows the *available* figure.

---

## Project layout

```
data/
  config.json           years to build, main classes to probe
  population.json       population by year, for the per-resident figures
scripts/
  fetch-data.mjs        the annual build: fetch -> aggregate -> write JSON
  make-icons.mjs        generates apple-touch-icon.png and og.png
  lib/
    api.mjs             fetch with on-disk cache, retries, bounded concurrency
    csv.mjs             RFC 4180 reader (the exports quote fields and use a BOM)
    names.mjs           sentence-casing and cross-year name resolution
    aggregate.mjs       rows -> the three hierarchies -> compact JSON
public/
  data/                 generated; commit this
  _headers              Cloudflare Pages headers
  favicon.svg, og.png, manifest.webmanifest, robots.txt
  .github/workflows/deploy-pages.yml   builds and publishes to GitHub Pages
src/
  App.tsx               state, routing, layout
  i18n.ts               fi / sv / en UI strings
  types.ts              the shape of the generated JSON
  components/           Header, Summary, Treemap, BarList, TableView,
                        DetailPanel, Charts, SearchDialog, Footer, Icons
  lib/
    data.ts             fetch + per-session cache for the JSON files
    tree.ts             level/ancestor helpers, search index, CSV export
    treemap.ts          squarified treemap layout
    router.ts           hash routing
    prefs.ts            theme, language, chart mode, media queries
    format.ts           money, percentages, per-capita, locale dates
```

### Generated data files

| File | Size (12 years) | Loaded |
|---|---|---|
| `index.json` | ~5 kB | always |
| `year-<Y>.json` | ~200 kB | on year select (neighbours prefetched) |
| `year-<Y>-org.json` | ~260 kB | when the ministry view is opened |
| `year-<Y>-economic.json` | ~140 kB | when the spending-type view is opened |
| `trends.json` | ~500 kB | in the background, for the year-by-year chart |

Everything gzips to roughly a fifth of that on the wire.

---

## Licence and attribution

The source data is published by Valtiokonttori under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.fi). Attribution is
shown in the site footer and must stay there, or be replaced with an equivalent,
in any fork.

The code in this repository is yours to license as you see fit; it carries no
licence file yet, so add one before publishing.
