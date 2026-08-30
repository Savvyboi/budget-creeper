/**
 * Turns raw "Budjettitalouden tapahtumat" rows into the small, denormalised
 * trees the browser renders.
 *
 * Source grain: one row per (year, month, agency, budget account, ledger
 * account) — roughly 250 000 rows for a single year across all main classes.
 *
 * Every monetary column in the source is a *movement for that month*, not a
 * running total, so annual figures are plain sums over the twelve months. That
 * also means the original appropriation appears in the month the budget was
 * confirmed (January) and each supplementary budget in the month it passed.
 *
 * Sign convention: the state's budget bookkeeping records revenue as credit,
 * i.e. negative. The site shows both sides as positive magnitudes and keeps the
 * direction in `kind`, so revenue rows are negated on the way in.
 */
import { num } from './csv.mjs';
import { toSentenceCase } from './names.mjs';

/**
 * Revenue department 15 "Lainat" is the borrowing that balances the budget on
 * paper. Counting it as ordinary revenue would make every year look balanced,
 * so it is reported separately and excluded from the deficit calculation.
 */
export const BORROWING_MAIN_CLASS = '15';

export const MEASURES = {
  original: 'Alkuperäinen_talousarvio',
  supplementary: 'Lisätalousarvio',
  current: 'Voimassaoleva_talousarvio',
  available: 'Käytettävissä',
  actual: 'Nettokertymä',
};

const trimCode = (s) => (s || '').trim().replace(/\.+$/, '');

/**
 * A few account-class codes are English-free bookkeeping placeholders whose
 * source label reads as a sentence fragment ("vain talousarviokirjanpidossa").
 * Give them a label that stands on its own in a list.
 */
const LABEL_OVERRIDES = {
  Tapahtumia: 'Kirjaukset vain talousarviokirjanpidossa',
  TUKU: 'Tuotto- ja kululaskelman erät',
};

function emptyNode(id, parent, code, name, level) {
  return {
    id,
    parent,
    code,
    name,
    level,
    b0: 0, // original appropriation
    bs: 0, // supplementary budgets (net)
    b: 0, // appropriation in force
    av: 0, // available, incl. appropriations carried over from earlier years
    a: 0, // actual outturn
    m: new Array(12).fill(0), // outturn per month
    children: new Set(),
  };
}

/** One (view, kind) tree under construction. */
class Tree {
  constructor() {
    this.nodes = new Map();
    this.roots = new Set();
  }

  touch(id, parent, code, name, level) {
    let node = this.nodes.get(id);
    if (!node) {
      node = emptyNode(id, parent, code, name, level);
      this.nodes.set(id, node);
      if (parent) this.nodes.get(parent).children.add(id);
      else this.roots.add(id);
    } else if (name && name.length > node.name.length) {
      node.name = name;
    }
    return node;
  }

  add(id, month, v) {
    const n = this.nodes.get(id);
    n.b0 += v.b0;
    n.bs += v.bs;
    n.b += v.b;
    n.av += v.av;
    n.a += v.a;
    n.m[month - 1] += v.a;
  }
}

const KINDS = ['expenditure', 'revenue'];
const VIEWS = ['budget', 'org', 'economic'];

export class YearAggregator {
  constructor(year, options = {}) {
    this.year = year;
    this.revenueBelowCode = options.revenueBelowCode ?? 21;
    this.names = options.names ?? null;
    this.monthsSeen = new Set();
    this.rowCount = 0;
    this.trees = {};
    for (const view of VIEWS) {
      this.trees[view] = {};
      for (const kind of KINDS) this.trees[view][kind] = new Tree();
    }
  }

  /** Feed one parsed CSV table (one main class for this year). */
  ingest(table) {
    const { index, rows } = table;
    if (!rows.length) return 0;

    const col = (name) => {
      const i = index[name];
      if (i === undefined) throw new Error(`Missing column "${name}" in API response`);
      return i;
    };

    const cKk = col('Kk');
    const cHa = col('Ha_Tunnus');
    const cHaName = col('Hallinnonala');
    const cTv = col('Tv_Tunnus');
    const cTvName = col('Kirjanpitoyksikkö');
    const cPl = col('PaaluokkaOsasto_TunnusP');
    const cPlName = col('PaaluokkaOsasto_sNimi');
    const cLuku = col('Luku_TunnusP');
    const cLukuName = col('Luku_sNimi');
    const cMom = col('Momentti_TunnusP');
    const cMomName = col('Momentti_sNimi');
    const cTlk = col('Tililuokka_Tunnus');
    const cTlkName = col('Tililuokka_sNimi');
    const cTr = col('Tiliryhma_Tunnus');
    const cTrName = col('Tiliryhma_sNimi');
    const cTla = col('Tililaji_Tunnus');
    const cTlaName = col('Tililaji_sNimi');
    const cLkp = col('LkpT_Tunnus');
    const cLkpName = col('LkpT_sNimi');
    const cB0 = col(MEASURES.original);
    const cBs = col(MEASURES.supplementary);
    const cB = col(MEASURES.current);
    const cAv = col(MEASURES.available);
    const cA = col(MEASURES.actual);

    let used = 0;
    for (const r of rows) {
      const plCode = trimCode(r[cPl]);
      // Rows outside the budget structure ("6-alkuiset", "Tapahtumia vain
      // liikekirjanpidossa") carry no main-class number and are not part of the
      // budget economy, so they are dropped.
      if (!plCode || !/^\d+$/.test(plCode)) continue;

      const month = Number(r[cKk]);
      if (!Number.isInteger(month) || month < 1 || month > 12) continue;

      const kind = Number(plCode) < this.revenueBelowCode ? 'revenue' : 'expenditure';
      const sign = kind === 'revenue' ? -1 : 1;

      const v = {
        b0: num(r[cB0]) * sign,
        bs: num(r[cBs]) * sign,
        b: num(r[cB]) * sign,
        av: num(r[cAv]) * sign,
        a: num(r[cA]) * sign,
      };
      if (!v.b0 && !v.bs && !v.b && !v.av && !v.a) continue;

      this.monthsSeen.add(month);
      used++;
      this.rowCount++;

      const lukuCode = trimCode(r[cLuku]);
      const momCode = trimCode(r[cMom]);
      const plName = (r[cPlName] || '').trim();
      const lukuName = (r[cLukuName] || '').trim();
      const momName = (r[cMomName] || '').trim();

      if (this.names) {
        this.names.add(plCode, plName, this.year);
        if (lukuCode) this.names.add(lukuCode, lukuName, this.year);
        if (momCode) this.names.add(momCode, momName, this.year);
      }

      // ---- View 1: budget structure (main class -> chapter -> item) ----
      {
        const t = this.trees.budget[kind];
        t.touch(plCode, null, plCode, plName, 1);
        t.add(plCode, month, v);
        if (lukuCode) {
          t.touch(lukuCode, plCode, lukuCode, lukuName, 2);
          t.add(lukuCode, month, v);
          if (momCode) {
            t.touch(momCode, lukuCode, momCode, momName, 3);
            t.add(momCode, month, v);
          }
        }
      }

      // ---- View 2: organisation (ministry branch -> accounting unit -> item) ----
      {
        const t = this.trees.org[kind];
        const ha = (r[cHa] || '').trim() || '00';
        const haName = (r[cHaName] || '').trim() || 'Erittelemätön';
        const tv = (r[cTv] || '').trim();
        const tvName = (r[cTvName] || '').trim();
        t.touch(ha, null, ha, haName, 1);
        t.add(ha, month, v);
        if (tv) {
          const tvId = ha + '/' + tv;
          t.touch(tvId, ha, tv, tvName, 2);
          t.add(tvId, month, v);
          if (momCode) {
            const leaf = tvId + '/' + momCode;
            t.touch(leaf, tvId, momCode, momName, 3);
            t.add(leaf, month, v);
          }
        }
      }

      // ---- View 3: economic nature (account class -> group -> type -> account) ----
      //
      // Appropriations are not classified by account type: in the source, every
      // budget row carries the placeholder class "Tapahtumia / vain
      // talousarviokirjanpidossa", which would otherwise show up here as a
      // single node holding the entire budget and nothing else. Only rows with
      // an actual outturn are meaningful in this view, so the rest are skipped
      // and the budget columns are dropped on the way out.
      if (v.a !== 0) {
        const t = this.trees.economic[kind];
        const levels = [
          [(r[cTlk] || '').trim(), (r[cTlkName] || '').trim()],
          [(r[cTr] || '').trim(), (r[cTrName] || '').trim()],
          [(r[cTla] || '').trim(), (r[cTlaName] || '').trim()],
          [(r[cLkp] || '').trim(), (r[cLkpName] || '').trim()],
        ];
        let parent = null;
        let id = '';
        let depth = 0;
        let previousCode = null;
        for (const [code, name] of levels) {
          if (!code) break;
          // The source repeats a level's code on the level below when the two
          // coincide (e.g. account group == account type). Collapse those so the
          // tree does not contain single-child chains.
          if (code === previousCode) continue;
          previousCode = code;
          depth++;
          id = id ? id + '/' + code : code;
          t.touch(id, parent, code, name, depth);
          t.add(id, month, v);
          parent = id;
        }
      }
    }
    return used;
  }
}

const round = (n) => Math.round(n * 100) / 100;

/** Serialise one tree into the compact shape shipped to the browser. */
function serialiseTree(tree, names, year, options = {}) {
  const includeMonthly = options.includeMonthly !== false;
  const nodes = {};
  for (const node of tree.nodes.values()) {
    // Budget-structure codes have canonical spellings shared across years, so
    // prefer a sentence-case spelling seen in any year. Organisation and account
    // labels have no such cross-year book, and fall back to plain re-casing.
    const resolved = options.resolveNames === false ? '' : names && names.resolve(node.code, year);
    const dropBudget = options.dropBudget === true;
    const out = {
      c: node.code,
      n: LABEL_OVERRIDES[node.code] || resolved || toSentenceCase(node.name) || node.code,
      l: node.level,
      b0: dropBudget ? 0 : round(node.b0),
      bs: dropBudget ? 0 : round(node.bs),
      b: dropBudget ? 0 : round(node.b),
      av: dropBudget ? 0 : round(node.av),
      a: round(node.a),
    };
    if (node.parent) out.p = node.parent;
    if (node.children.size) {
      out.ch = [...node.children].sort(
        (x, y) => Math.abs(tree.nodes.get(y).a) - Math.abs(tree.nodes.get(x).a),
      );
    }
    if (includeMonthly && node.m.some((x) => x !== 0)) out.m = node.m.map(round);
    nodes[node.id] = out;
  }
  const roots = [...tree.roots].sort((x, y) =>
    tree.nodes.get(x).code.localeCompare(tree.nodes.get(y).code, 'fi', { numeric: true }),
  );
  return { roots, nodes };
}

function totalsFor(tree, filter) {
  const t = { b0: 0, bs: 0, b: 0, av: 0, a: 0, m: new Array(12).fill(0) };
  for (const id of tree.roots) {
    if (filter && !filter(id)) continue;
    const n = tree.nodes.get(id);
    t.b0 += n.b0;
    t.bs += n.bs;
    t.b += n.b;
    t.av += n.av;
    t.a += n.a;
    for (let i = 0; i < 12; i++) t.m[i] += n.m[i];
  }
  return {
    b0: round(t.b0),
    bs: round(t.bs),
    b: round(t.b),
    av: round(t.av),
    a: round(t.a),
    m: t.m.map(round),
  };
}

/** Build the JSON payloads for one year. */
export function buildYearPayload(agg, context) {
  const { names, population, generatedAt, source } = context;
  const months = [...agg.monthsSeen].sort((a, b) => a - b);
  const monthsAvailable = months.length ? Math.max(...months) : 0;

  const revenueTree = agg.trees.budget.revenue;
  const isBorrowing = (id) => id === BORROWING_MAIN_CLASS;

  const totals = {
    expenditure: totalsFor(agg.trees.budget.expenditure),
    // Everything credited to the state except the loans raised to cover the gap.
    revenue: totalsFor(revenueTree, (id) => !isBorrowing(id)),
    borrowing: totalsFor(revenueTree, isBorrowing),
    revenueIncludingBorrowing: totalsFor(revenueTree),
  };
  // Negative = deficit. On paper the budget always balances, because borrowing is
  // budgeted to close the gap, so the interesting number is the outturn.
  totals.balance = {
    b: round(totals.revenue.b - totals.expenditure.b),
    a: round(totals.revenue.a - totals.expenditure.a),
  };

  const meta = {
    year: agg.year,
    monthsAvailable,
    complete: monthsAvailable === 12,
    rows: agg.rowCount,
    population: population ?? null,
    generatedAt,
    source,
  };

  const view = (name, options) => ({
    expenditure: serialiseTree(agg.trees[name].expenditure, names, agg.year, options),
    revenue: serialiseTree(agg.trees[name].revenue, names, agg.year, options),
  });

  return {
    meta,
    main: { ...meta, totals, view: view('budget') },
    org: {
      year: agg.year,
      view: view('org', { includeMonthly: false, resolveNames: false }),
    },
    economic: {
      year: agg.year,
      // Flagged so the UI can say why there is no budget-versus-outturn here.
      budgetByLevel: false,
      view: view('economic', {
        includeMonthly: false,
        resolveNames: false,
        dropBudget: true,
      }),
    },
    totals,
  };
}
