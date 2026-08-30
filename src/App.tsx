import { useCallback, useEffect, useMemo, useState } from 'react';

import { Header } from './components/Header';
import { Summary } from './components/Summary';
import { Treemap } from './components/Treemap';
import { BarList } from './components/BarList';
import { TableView } from './components/TableView';
import { DetailPanel } from './components/DetailPanel';
import { SearchDialog } from './components/SearchDialog';
import { Footer } from './components/Footer';
import {
  IconArrowLeft,
  IconChevronRight,
  IconDownload,
  IconInfo,
  IconList,
  IconMap,
  IconTable,
} from './components/Icons';

import { stringsFor } from './i18n';
import { useChartMode, useLang, useMediaQuery, useTheme } from './lib/prefs';
import { useRoute } from './lib/router';
import { loadExtraView, loadIndex, loadTrends, loadYear, prefetchYear } from './lib/data';
import {
  ancestors,
  buildSearchIndex,
  downloadCsv,
  levelOf,
  levelTotal,
  viewToCsv,
  type SearchEntry,
  type SortKey,
} from './lib/tree';
import { money } from './lib/format';
import type {
  ExtraViewData,
  IndexData,
  Kind,
  NodeView,
  RawView,
  TrendsData,
  ViewId,
  YearData,
} from './types';

const DESKTOP = '(min-width: 62rem)';

export default function App() {
  const [lang, setLang] = useLang();
  const [theme, cycleTheme] = useTheme();
  const t = stringsFor(lang);
  const isDesktop = useMediaQuery(DESKTOP);

  const [route, navigate] = useRoute();
  const [index, setIndex] = useState<IndexData | null>(null);
  const [year, setYear] = useState<YearData | null>(null);
  const [extra, setExtra] = useState<Record<string, ExtraViewData>>({});
  const [trends, setTrends] = useState<TrendsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [sort, setSort] = useState<SortKey>('actual');
  const [descending, setDescending] = useState(true);
  const [chartMode, setChartMode] = useChartMode(isDesktop ? 'treemap' : 'list');

  // ---------------------------------------------------------------- loading

  useEffect(() => {
    loadIndex().then(setIndex).catch((err) => setError(String(err.message ?? err)));
  }, []);

  const activeYear = useMemo(() => {
    if (!index) return null;
    const wanted = route.year;
    if (wanted && index.years.some((y) => y.year === wanted)) return wanted;
    return index.latestCompleteYear || index.latestYear;
  }, [index, route.year]);

  // Keep the URL honest: a bare "#/" or an unknown year becomes a real address.
  useEffect(() => {
    if (!index || !activeYear) return;
    if (route.year !== activeYear) navigate({ year: activeYear }, true);
  }, [index, activeYear, route.year, navigate]);

  useEffect(() => {
    if (!activeYear) return;
    let cancelled = false;
    setError(null);
    loadYear(activeYear)
      .then((data) => !cancelled && setYear(data))
      .catch((err) => !cancelled && setError(String(err.message ?? err)));
    return () => {
      cancelled = true;
    };
  }, [activeYear]);

  useEffect(() => {
    loadTrends().then(setTrends).catch(() => setTrends(null));
  }, []);

  // The org and economic breakdowns are separate files; fetch on first use.
  useEffect(() => {
    if (!activeYear || route.view === 'budget') return;
    const key = `${activeYear}:${route.view}`;
    if (extra[key]) return;
    loadExtraView(activeYear, route.view)
      .then((data) => setExtra((current) => ({ ...current, [key]: data })))
      .catch((err) => setError(String(err.message ?? err)));
  }, [activeYear, route.view, extra]);

  // Warm the neighbouring year so the year picker feels instant.
  useEffect(() => {
    if (!index || !activeYear) return;
    const neighbours = index.years
      .map((y) => y.year)
      .filter((y) => Math.abs(y - activeYear) === 1);
    for (const y of neighbours) prefetchYear(y);
  }, [index, activeYear]);

  // ------------------------------------------------------------- derivation

  const views: Record<Kind, RawView> | null = useMemo(() => {
    if (!year) return null;
    if (route.view === 'budget') return year.view;
    const key = `${year.year}:${route.view}`;
    return extra[key]?.view ?? null;
  }, [year, route.view, extra]);

  const view = views?.[route.kind] ?? null;

  const rows = useMemo(
    () => (view ? levelOf(view, route.nodeId, { sort, descending }) : []),
    [view, route.nodeId, sort, descending],
  );

  const trail = useMemo(
    () => (view && route.nodeId ? ancestors(view, route.nodeId) : []),
    [view, route.nodeId],
  );

  const currentNode = view && route.nodeId ? view.nodes[route.nodeId] : null;
  const total = view ? levelTotal(view, route.nodeId) : { a: 0, b: 0 };

  const searchIndex = useMemo<SearchEntry[]>(
    () => (views ? buildSearchIndex(views) : []),
    [views],
  );

  /**
   * A selection is only honoured while the node is actually on screen — that is,
   * while it is one of the children of the current level. Deriving this rather
   * than clearing the state in an effect matters: opening a search result sets
   * the selection and the route in the same tick, and an effect would race the
   * hash change and blank the panel before the route caught up. Leaving a stale
   * id in state is harmless, because it is ignored until it is valid again.
   */
  const selected = useMemo<NodeView | null>(
    () => (selectedId ? (rows.find((row) => row.id === selectedId) ?? null) : null),
    [selectedId, rows],
  );

  /** Children of the selected node, so the panel can offer them as the next step. */
  const selectedChildren = useMemo<NodeView[]>(() => {
    if (!selected || !view) return [];
    const total = Math.abs(selected.a) || 1;
    return (selected.ch ?? [])
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
      .filter((n): n is NodeView => n !== null)
      .sort((a, b) => Math.abs(b.a) - Math.abs(a.a));
  }, [selected, view]);

  // ---------------------------------------------------------------- actions

  const drillInto = useCallback(
    (id: string) => {
      navigate({ nodeId: id });
      setSelectedId(null);
      window.scrollTo({ top: Math.min(window.scrollY, explorerTop()), behavior: 'smooth' });
    },
    [navigate],
  );

  /**
   * Step into one of the selected node's children: move the main view down to
   * that node's level and put the child's details on screen. The selection is
   * derived from the route rather than cleared by an effect, so setting both in
   * the same tick is safe.
   */
  const openChild = useCallback(
    (parentId: string, childId: string) => {
      navigate({ nodeId: parentId });
      setSelectedId(childId);
    },
    [navigate],
  );

  const openFromSearch = useCallback(
    (entry: SearchEntry) => {
      setSearchOpen(false);
      if (!view && !views) return;
      const target = views?.[entry.kind];
      const node = target?.nodes[entry.id];
      // Land on the parent level with the item selected, so the reader sees it
      // in context rather than on an empty leaf screen.
      const parentId = node?.p ?? '';
      navigate({ kind: entry.kind, nodeId: parentId });
      setSelectedId(entry.id);
    },
    [navigate, view, views],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (typing) return;
      if (event.key === '/' || (event.key === 'k' && (event.metaKey || event.ctrlKey))) {
        event.preventDefault();
        setSearchOpen(true);
      } else if (event.key === 'Escape') {
        setSelectedId(null);
      } else if (event.key === 'Backspace' && route.nodeId) {
        event.preventDefault();
        const parent = view?.nodes[route.nodeId]?.p ?? '';
        navigate({ nodeId: parent });
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [route.nodeId, view, navigate]);

  const onSort = useCallback(
    (key: SortKey) => {
      if (key === sort) setDescending((d) => !d);
      else {
        setSort(key);
        setDescending(true);
      }
    },
    [sort],
  );

  const exportCsv = useCallback(() => {
    if (!view || !year) return;
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
    downloadCsv(
      `valtion-budjetti-${year.year}-${route.kind}-${route.view}.csv`,
      viewToCsv(view, headers),
    );
  }, [view, year, route.kind, route.view]);

  // ------------------------------------------------------------------ render

  if (error && !year) {
    return (
      <div className="error-box">
        <h1>{t.loadError}</h1>
        <p>{error}</p>
        <button type="button" className="btn" onClick={() => window.location.reload()}>
          {t.retry}
        </button>
      </div>
    );
  }

  if (!index || !year || !activeYear) {
    return (
      <div className="boot" role="status" aria-live="polite">
        <div className="boot__bar">
          <span />
        </div>
        <p>{t.loading}</p>
      </div>
    );
  }

  const previous = index.years.find((y) => y.year === activeYear - 1);
  const showDetail = Boolean(selected);
  const kindLabel = route.kind === 'revenue' ? t.revenue : t.expenditure;

  return (
    <>
      <a className="skip-link" href="#explorer">
        {lang === 'en' ? 'Skip to the explorer' : lang === 'sv' ? 'Hoppa till utforskaren' : 'Siirry selaimeen'}
      </a>

      <Header
        t={t}
        lang={lang}
        onLang={setLang}
        theme={theme}
        onTheme={cycleTheme}
        years={index.years}
        year={activeYear}
        onYear={(next) => navigate({ year: next, nodeId: '' })}
        onSearch={() => setSearchOpen(true)}
      />

      <main className="page">
        <Summary
          t={t}
          lang={lang}
          data={year}
          previous={previous}
          onPick={(kind, nodeId) => {
            navigate({ kind, view: 'budget', nodeId: '' });
            setSelectedId(nodeId);
          }}
        />

        <div id="explorer">
          <div className="toolbar">
            <div className="segmented segmented--kind" role="tablist" aria-label={t.expenditure}>
              {(['expenditure', 'revenue'] as Kind[]).map((kind) => (
                <button
                  key={kind}
                  type="button"
                  role="tab"
                  data-kind={kind}
                  aria-selected={route.kind === kind}
                  onClick={() => navigate({ kind, nodeId: '' })}
                >
                  {kind === 'revenue' ? t.revenue : t.expenditure}
                </button>
              ))}
            </div>

            <div className="segmented" role="tablist" aria-label={t.viewBudget}>
              {(
                [
                  ['budget', t.viewBudget, t.viewBudgetHint],
                  ['org', t.viewOrg, t.viewOrgHint],
                  ['economic', t.viewEconomic, t.viewEconomicHint],
                ] as [ViewId, string, string][]
              ).map(([id, label, hint]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={route.view === id}
                  title={hint}
                  onClick={() => navigate({ view: id, nodeId: '' })}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="toolbar__spacer" />

            <div className="segmented" role="group" aria-label={t.chartList}>
              {(
                [
                  ['treemap', t.chartTreemap, IconMap],
                  ['list', t.chartList, IconList],
                  ['table', t.chartTable, IconTable],
                ] as const
              ).map(([id, label, Icon]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={chartMode === id}
                  title={label}
                  aria-label={label}
                  onClick={() => setChartMode(id)}
                >
                  <Icon />
                </button>
              ))}
            </div>

            <button type="button" className="btn btn--icon" onClick={exportCsv} title={t.downloadCsv} aria-label={t.downloadCsv}>
              <IconDownload />
            </button>
          </div>

          <nav className="crumbs" aria-label="breadcrumb">
            <button type="button" onClick={() => drillInto('')}>
              {kindLabel} · {t.breadcrumbRoot}
            </button>
            {trail.map((node, i) => {
              const id = trailIdAt(view, route.nodeId, i);
              return (
                <span key={id} style={{ display: 'contents' }}>
                  <span className="crumbs__sep" aria-hidden="true">
                    <IconChevronRight size={13} />
                  </span>
                  <button type="button" onClick={() => drillInto(id)}>
                    {node.n}
                  </button>
                </span>
              );
            })}
            {currentNode && (
              <>
                <span className="crumbs__sep" aria-hidden="true">
                  <IconChevronRight size={13} />
                </span>
                <span className="crumbs__current" aria-current="page">
                  {currentNode.n}
                </span>
              </>
            )}
          </nav>

          {route.view === 'economic' && (
            <p className="notice notice--quiet" style={{ marginBottom: '0.75rem' }}>
              <IconInfo />
              <span>{t.viewEconomicNote}</span>
            </p>
          )}

          <div className={`explorer ${showDetail && isDesktop ? 'explorer--with-detail' : ''}`}>
            <section className="panel" aria-label={kindLabel}>
              <div className="panel__head">
                {route.nodeId && (
                  <button
                    type="button"
                    className="btn btn--ghost btn--icon"
                    onClick={() => drillInto(view?.nodes[route.nodeId]?.p ?? '')}
                    aria-label={t.back}
                    title={t.back}
                  >
                    <IconArrowLeft />
                  </button>
                )}
                <h2>{currentNode ? currentNode.n : `${kindLabel} · ${t.breadcrumbRoot}`}</h2>
                <span style={{ marginLeft: 'auto', fontWeight: 620, color: 'var(--ink)' }}>
                  {money(total.a, lang)}
                </span>
              </div>

              {!view ? (
                <p className="empty">{t.loading}</p>
              ) : chartMode === 'treemap' ? (
                <Treemap
                  t={t}
                  lang={lang}
                  rows={rows}
                  kind={route.kind}
                  selectedId={selectedId}
                  onOpen={(node) => drillInto(node.id)}
                  onSelect={(node) => setSelectedId(node.id)}
                />
              ) : chartMode === 'list' ? (
                <BarList
                  t={t}
                  lang={lang}
                  rows={rows}
                  kind={route.kind}
                  selectedId={selectedId}
                  onOpen={(node) => drillInto(node.id)}
                  onSelect={(node) => setSelectedId(node.id)}
                />
              ) : (
                <TableView
                  t={t}
                  lang={lang}
                  rows={rows}
                  sort={sort}
                  descending={descending}
                  onSort={onSort}
                  selectedId={selectedId}
                  onOpen={(node) => drillInto(node.id)}
                  onSelect={(node) => setSelectedId(node.id)}
                />
              )}
            </section>

            {selected && (
              <DetailPanel
                t={t}
                lang={lang}
                node={selected}
                subItems={selectedChildren}
                parentTotal={total.a}
                year={year}
                kind={route.kind}
                view={route.view}
                trends={trends}
                isSheet={!isDesktop}
                canDrill={Boolean(selected.ch?.length)}
                onDrill={() => drillInto(selected.id)}
                onOpenChild={(childId) => openChild(selected.id, childId)}
                onClose={() => setSelectedId(null)}
              />
            )}
          </div>
        </div>
      </main>

      <Footer t={t} lang={lang} index={index} year={year} />

      {searchOpen && (
        <SearchDialog
          t={t}
          lang={lang}
          index={searchIndex}
          onPick={openFromSearch}
          onClose={() => setSearchOpen(false)}
        />
      )}
    </>
  );
}

/** Id of the i-th ancestor of `nodeId`, walking down from the root. */
function trailIdAt(view: RawView | null, nodeId: string, depth: number): string {
  if (!view || !nodeId) return '';
  const chain: string[] = [];
  let current: string | undefined = view.nodes[nodeId]?.p;
  const seen = new Set<string>();
  while (current && !seen.has(current)) {
    seen.add(current);
    chain.unshift(current);
    current = view.nodes[current]?.p;
  }
  return chain[depth] ?? '';
}

/** Scroll target for a drill-down: keep the explorer heading in view. */
function explorerTop(): number {
  const element = document.getElementById('explorer');
  if (!element) return 0;
  return element.getBoundingClientRect().top + window.scrollY - 8;
}
