/**
 * Helpers for walking the hierarchies: the path to a node, the children to show
 * at a level, the search index, and CSV export.
 *
 * A node in the generated JSON is:
 *   c  code          n  name           l  level        p  parent id
 *   b0 original budget                 bs supplementary budgets
 *   b  budget in force                 av available incl. carried-over
 *   a  actual outturn                  m  outturn per month (January first)
 *   ch child ids
 */

/** Ancestors of `id`, outermost first, excluding the node itself. */
export function ancestors(view, id) {
  const chain = [];
  let current = view.nodes[id];
  const seen = new Set([id]);
  while (current && current.p) {
    const parent = view.nodes[current.p];
    if (!parent || seen.has(current.p)) break; // defensive: never loop on bad data
    seen.add(current.p);
    chain.unshift({ id: current.p, node: parent });
    current = parent;
  }
  return chain;
}

function sumActual(view, ids) {
  let total = 0;
  for (const id of ids) total += Math.abs((view.nodes[id] && view.nodes[id].a) || 0);
  return total;
}

/**
 * The children to render below `parentId` (or the roots when it is empty),
 * decorated with the share and execution rate the UI needs.
 */
export function levelOf(view, parentId, options = {}) {
  const ids = parentId ? (view.nodes[parentId] || {}).ch || [] : view.roots;
  const total = sumActual(view, ids) || 1;

  const rows = [];
  for (const id of ids) {
    const node = view.nodes[id];
    if (!node) continue;
    rows.push({
      ...node,
      id,
      share: Math.abs(node.a) / total,
      execution: node.b ? node.a / node.b : null,
    });
  }

  const sort = options.sort || 'actual';
  const dir = options.descending === false ? -1 : 1;
  rows.sort((a, b) => {
    switch (sort) {
      case 'name':
        return -dir * a.n.localeCompare(b.n, 'fi');
      case 'code':
        return -dir * a.c.localeCompare(b.c, 'fi', { numeric: true });
      case 'budget':
        return dir * (Math.abs(b.b) - Math.abs(a.b));
      case 'execution':
        return dir * ((b.execution ?? -Infinity) - (a.execution ?? -Infinity));
      default:
        return dir * (Math.abs(b.a) - Math.abs(a.a));
    }
  });
  return rows;
}

/** Children of one node, biggest first, with their share of that node. */
export function childrenOf(view, id) {
  const node = view.nodes[id];
  if (!node || !node.ch) return [];
  const total = Math.abs(node.a) || 1;
  return node.ch
    .map((childId) => {
      const child = view.nodes[childId];
      if (!child) return null;
      return {
        ...child,
        id: childId,
        share: Math.abs(child.a) / total,
        execution: child.b ? child.a / child.b : null,
      };
    })
    .filter(Boolean)
    .sort((a, b) => Math.abs(b.a) - Math.abs(a.a));
}

/** Sum of the level, so the header can show what 100 % means. */
export function levelTotal(view, parentId) {
  if (parentId) {
    const node = view.nodes[parentId];
    return { a: (node && node.a) || 0, b: (node && node.b) || 0 };
  }
  let a = 0;
  let b = 0;
  for (const id of view.roots) {
    const node = view.nodes[id];
    if (!node) continue;
    a += node.a;
    b += node.b;
  }
  return { a, b };
}

/** Running total of a monthly series, for the cumulative curve. */
export function cumulative(monthly) {
  const out = [];
  let running = 0;
  for (const value of monthly) {
    running += value;
    out.push(running);
  }
  return out;
}

// -------------------------------------------------------------------- search

/** Build a flat, lower-cased index over both sides of one view. */
export function buildSearchIndex(views) {
  const entries = [];
  for (const kind of ['expenditure', 'revenue']) {
    const view = views[kind];
    if (!view) continue;
    for (const id of Object.keys(view.nodes)) {
      const node = view.nodes[id];
      entries.push({
        id,
        kind,
        code: node.c,
        name: node.n,
        actual: node.a,
        level: node.l,
        parent: node.p || '',
        haystack: `${node.c} ${node.n}`.toLowerCase(),
      });
    }
  }
  return entries;
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Substring search, ranked so that code prefixes and word-start matches beat a
 * match buried in the middle, and bigger items beat smaller ones on a tie.
 */
export function searchEntries(index, query, limit = 40) {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const scored = [];
  const wordStart = new RegExp(`\\b${escapeRegExp(q)}`);
  for (const entry of index) {
    const at = entry.haystack.indexOf(q);
    if (at < 0) continue;
    let score = 0;
    const lowerName = entry.name.toLowerCase();
    if (entry.code.toLowerCase().startsWith(q)) score += 600;
    if (lowerName.startsWith(q)) score += 400;
    else if (wordStart.test(lowerName)) score += 200;
    score -= at;
    score -= entry.level * 12; // prefer the broader levels
    score += Math.min(120, Math.log10(Math.abs(entry.actual) + 10) * 12);
    scored.push({ entry, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.entry);
}

// ---------------------------------------------------------------- csv export

function csvCell(value) {
  return /[",\r\n]/.test(value) ? `"${String(value).replace(/"/g, '""')}"` : value;
}

/** Flatten a whole view to CSV, with one row per node and its full path. */
export function viewToCsv(view) {
  const headers = [
    'code',
    'name',
    'level',
    'path',
    'original_budget_eur',
    'supplementary_eur',
    'budget_in_force_eur',
    'actual_eur',
  ];
  const lines = [headers.map(csvCell).join(',')];

  const walk = (id, path) => {
    const node = view.nodes[id];
    if (!node) return;
    const trail = [...path, node.n];
    lines.push(
      [
        node.c,
        node.n,
        String(node.l),
        trail.slice(0, -1).join(' / '),
        node.b0.toFixed(2),
        node.bs.toFixed(2),
        node.b.toFixed(2),
        node.a.toFixed(2),
      ]
        .map(csvCell)
        .join(','),
    );
    for (const child of node.ch || []) walk(child, trail);
  };

  for (const rootId of view.roots) walk(rootId, []);
  // Excel opens a UTF-8 CSV correctly only with a BOM.
  return '﻿' + lines.join('\r\n') + '\r\n';
}

export function downloadCsv(filename, content) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
