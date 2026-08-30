/** Shapes of the JSON produced by `scripts/fetch-data.mjs`. */

/** Which side of the budget. */
export type Kind = 'expenditure' | 'revenue';

/** Which hierarchy the money is broken down by. */
export type ViewId = 'budget' | 'org' | 'economic';

export interface SourceInfo {
  name: string;
  dataset: string;
  endpoint: string;
  docs: string;
  licence: string;
  licenceUrl: string;
  homepage: string;
}

/**
 * One node of a hierarchy. Keys are short because the whole tree ships as JSON.
 *   b0 original appropriation      bs supplementary budgets (net)
 *   b  appropriation in force      av available incl. amounts carried over
 *   a  actual outturn              m  outturn per month, January first
 */
export interface RawNode {
  c: string;
  n: string;
  l: number;
  b0: number;
  bs: number;
  b: number;
  av: number;
  a: number;
  p?: string;
  ch?: string[];
  m?: number[];
}

export interface RawView {
  roots: string[];
  nodes: Record<string, RawNode>;
}

export interface Totals {
  b0: number;
  bs: number;
  b: number;
  av: number;
  a: number;
  m: number[];
}

export interface YearData {
  year: number;
  monthsAvailable: number;
  complete: boolean;
  rows: number;
  population: number | null;
  generatedAt: string;
  source: SourceInfo;
  totals: {
    expenditure: Totals;
    revenue: Totals;
    borrowing: Totals;
    revenueIncludingBorrowing: Totals;
    balance: { b: number; a: number };
  };
  view: Record<Kind, RawView>;
}

/** The org / economic views, fetched only when the reader switches to them. */
export interface ExtraViewData {
  year: number;
  view: Record<Kind, RawView>;
}

export interface YearSummary {
  year: number;
  monthsAvailable: number;
  complete: boolean;
  population: number | null;
  populationProjected: boolean;
  expenditure: { b0: number; b: number; a: number };
  revenue: { b0: number; b: number; a: number };
  borrowing: { b0: number; b: number; a: number };
  balance: { b: number; a: number };
  mainClasses: number;
}

export interface IndexData {
  generatedAt: string;
  source: SourceInfo;
  population: { note: string; source: string; projected: number[] };
  years: YearSummary[];
  latestYear: number;
  latestCompleteYear: number;
}

export interface TrendsData {
  years: number[];
  nodes: Record<string, { n: string; l: number; a: (number | null)[]; b: (number | null)[] }>;
}

/** What the UI works with: a node plus everything derived from its context. */
export interface NodeView extends RawNode {
  id: string;
  share: number; // of the level total, 0-1
  execution: number | null; // outturn / appropriation in force
}
