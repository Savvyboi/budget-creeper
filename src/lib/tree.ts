/**
 * Helpers for walking the hierarchies: the path to a node, the children to show
 * at a level, the search index, and CSV export.
 */
import type { Kind, NodeView, RawNode, RawView } from '../types';

/** Ancestors of `id`, outermost first, excluding the node itself. */
export function ancestors(view: RawView, id: string): RawNode[] {
  const chain: RawNode[] = [];
  let current = view.nodes[id];
  const seen = new Set<string>([id]);
  while (current?.p) {
    const parent = view.nodes[current.p];
    if (!parent || seen.has(current.p)) break; // defensive: never loop on bad data
    seen.add(current.p);
    chain.unshift(parent);
    current = parent;
  }
  return chain;
}

/** Total of a set of ids, used for share-of-level calculations. */
function sumActual(view: RawView, ids: string[]): number {
  let total = 0;
  for (const id of ids) total += Math.abs(view.nodes[id]?.a ?? 0);
  return total;
}

export type SortKey = 'actual' | 'budget' | 'name' | 'code' | 'execution';

/**
 * The children to render below `parentId` (or the roots when it is empty),
 * decorated with the share and execution rate the UI needs.
 */
export function levelOf(
  view: RawView,
  parentId: string,
  options: { sort?: SortKey; descending?: boolean } = {},
): NodeView[] {
  const ids = parentId ? (view.nodes[parentId]?.ch ?? []) : view.roots;
  const total = sumActual(view, ids) || 1;

  const rows: NodeView[] = ids
    .map((id) => {
      const node = view.nodes[id];
      if (!node) return null;
      return {
        ...node,
        id,
        share: Math.abs(node.a) / total,
        execution: node.b ? node.a / node.b : null,
      } satisfies NodeView;
    })
    .filter((n): n is NodeView => n !== null);

  const sort = options.sort ?? 'actual';
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

/** Sum of the level, so the header can show what 100 % means. */
export function levelTotal(view: RawView, parentId: string): { a: number; b: number } {
  if (parentId) {
    const node = view.nodes[parentId];
    return { a: node?.a ?? 0, b: node?.b ?? 0 };
  }
  let a = 0;
  let b = 0;
  for (const id of view.roots) {
    a += view.nodes[id]?.a ?? 0;
    b += view.nodes[id]?.b ?? 0;
  }
  return { a, b };
}

/** Running total of a monthly series, for the cumulative curve. */
export function cumulative(monthly: number[]): number[] {
  const out: number[] = [];
  let running = 0;
  for (const value of monthly) {
    running += value;
    out.push(running);
  }
  return out;
}

// -------------------------------------------------------------------- search

export interface SearchEntry {
  id: string;
  kind: Kind;
  code: string;
  name: string;
  actual: number;
  level: number;
  haystack: string;
}

/** Build a flat, lower-cased index over both sides of one view. */
export function buildSearchIndex(views: Record<Kind, RawView>): SearchEntry[] {
  const entries: SearchEntry[] = [];
  for (const kind of ['expenditure', 'revenue'] as Kind[]) {
    const view = views[kind];
    if (!view) continue;
    for (const [id, node] of Object.entries(view.nodes)) {
      entries.push({
        id,
        kind,
        code: node.c,
        name: node.n,
        actual: node.a,
        level: node.l,
        haystack: `${node.c} ${node.n}`.toLowerCase(),
      });
    }
  }
  return entries;
}

/**
 * Substring search, ranked so that code prefixes and word-start matches beat a
 * match buried in the middle, and bigger items beat smaller ones on a tie.
 */
export function searchEntries(index: SearchEntry[], query: string, limit = 40): SearchEntry[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const scored: { entry: SearchEntry; score: number }[] = [];
  for (const entry of index) {
    const at = entry.haystack.indexOf(q);
    if (at < 0) continue;
    let score = 0;
    if (entry.code.toLowerCase().startsWith(q)) score += 600;
    if (entry.name.toLowerCase().startsWith(q)) score += 400;
    else if (new RegExp(`\\b${escapeRegExp(q)}`).test(entry.name.toLowerCase())) score += 200;
    score -= at;
    score -= entry.level * 12; // prefer the broader levels
    score += Math.min(120, Math.log10(Math.abs(entry.actual) + 10) * 12);
    scored.push({ entry, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.entry);
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ---------------------------------------------------------------- csv export

/** Flatten a whole view to CSV, with one row per node and its full path. */
export function viewToCsv(view: RawView, headers: string[]): string {
  const lines = [headers.map(csvCell).join(',')];

  const walk = (id: string, path: string[]) => {
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
    for (const child of node.ch ?? []) walk(child, trail);
  };

  for (const rootId of view.roots) walk(rootId, []);
  // Excel opens a UTF-8 CSV correctly only with a BOM.
  return '﻿' + lines.join('\r\n') + '\r\n';
}

function csvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function downloadCsv(filename: string, content: string): void {
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
