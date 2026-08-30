import { useEffect, useRef } from 'react';
import type { Lang, Strings } from '../i18n';
import type { Kind, NodeView, TrendsData, ViewId, YearData } from '../types';
import { change, euros, money, percent, perCapita } from '../lib/format';
import { CumulativeLine, MonthlyBars, YearTrend } from './Charts';
import { IconChevronRight, IconClose, IconExternal } from './Icons';

interface Props {
  t: Strings;
  lang: Lang;
  node: NodeView;
  /** Children of `node`, biggest first. Not named `children`: that is React's
   *  own slot, and these are data, not markup. */
  subItems: NodeView[];
  parentTotal: number;
  year: YearData;
  kind: Kind;
  view: ViewId;
  trends: TrendsData | null;
  isSheet: boolean;
  canDrill: boolean;
  onDrill: () => void;
  onOpenChild: (childId: string) => void;
  onClose: () => void;
}

/** How many sub-items to list before falling back to "open all of them". */
const CHILD_PREVIEW = 8;

/** Reconstruct the API call that produced this node, for the "source" link. */
function sourceUrl(node: NodeView, view: ViewId, year: number): string {
  const base = 'https://api.tutkihallintoa.fi/valtiontalous/v1/budjettitaloudentapahtumat';
  const params = new URLSearchParams({ yearFrom: String(year), yearTo: String(year) });
  const digits = node.c.replace(/\D/g, '');

  if (view === 'budget') {
    if (node.l === 1) params.set('paaluokka', digits);
    else if (node.l === 2) params.set('luku', digits);
    else params.set('momentti', digits);
  } else if (view === 'org') {
    if (node.l === 1) params.set('hallinnonala', digits);
    else if (node.l === 2) params.set('tilivirasto', digits);
    else params.set('momentti', digits);
  } else {
    const key = ['tililuokka', 'tiliryhma', 'tililaji', 'lkptili'][node.l - 1] ?? 'tililuokka';
    params.set(key, node.c);
  }
  return `${base}?${params.toString()}`;
}

export function DetailPanel({
  t,
  lang,
  node,
  subItems,
  parentTotal,
  year,
  kind,
  view,
  trends,
  isSheet,
  canDrill,
  onDrill,
  onOpenChild,
  onClose,
}: Props) {
  const panelRef = useRef<HTMLElement>(null);

  // As a bottom sheet the panel is modal-ish: Escape closes it and focus moves
  // in, so a keyboard or screen-reader user is not left behind the sheet.
  useEffect(() => {
    if (!isSheet) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    panelRef.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [isSheet, onClose]);

  const execution = node.b ? node.a / node.b : null;
  const overspend = execution !== null && execution > 1.02;
  const share = parentTotal ? Math.abs(node.a) / Math.abs(parentTotal) : null;
  const head = perCapita(node.a, year.population, lang);

  const trendKey = view === 'budget' ? `${kind === 'revenue' ? 'r' : 'e'}:${node.id}` : null;
  const trend = trendKey ? trends?.nodes[trendKey] : undefined;
  const previousIndex = trends ? trends.years.indexOf(year.year) - 1 : -1;
  const previousValue =
    trend && previousIndex >= 0 ? trend.a[previousIndex] : null;
  const yoy =
    previousValue != null && year.complete ? change(previousValue, node.a, lang) : null;

  return (
    <>
      {isSheet && <div className="sheet-backdrop" onClick={onClose} aria-hidden="true" />}
      <aside
        className="panel detail"
        ref={panelRef}
        tabIndex={-1}
        aria-label={`${node.c} ${node.n}`}
        role={isSheet ? 'dialog' : undefined}
        aria-modal={isSheet ? true : undefined}
      >
        <span className="detail__grip" aria-hidden="true" />
        <div className="detail__head">
          <div className="detail__eyebrow">
            <span>{node.c}</span>
            {execution !== null && (
              <span className={`chip ${overspend ? 'chip--over' : 'chip--under'}`}>
                {percent(execution, lang, 0)} {overspend ? t.overBudget : t.ofBudget}
              </span>
            )}
            <button
              type="button"
              className="btn btn--ghost btn--icon"
              style={{ marginLeft: 'auto' }}
              onClick={onClose}
              aria-label={t.close}
            >
              <IconClose />
            </button>
          </div>
          <h2 className="detail__title">{node.n}</h2>
        </div>

        <div className="detail__section">
          <dl className="kv">
            <dt>{t.originalBudget}</dt>
            <dd>{node.b0 ? money(node.b0, lang) : '—'}</dd>
            <dt>{t.supplementaryBudgets}</dt>
            <dd>{node.bs ? money(node.bs, lang, { sign: true }) : '—'}</dd>
            <dt className="kv__total">{t.budgetInForce}</dt>
            <dd className="kv__total">{node.b ? money(node.b, lang) : '—'}</dd>
            {/* Available can exceed the budget in force: appropriations carried
                over from earlier years are spendable this year, which is how an
                item can overrun its own budget without anything being wrong. */}
            {Math.abs(node.av - node.b) > Math.abs(node.b) * 0.005 && (
              <>
                <dt>{t.available}</dt>
                <dd>{money(node.av, lang)}</dd>
              </>
            )}
            <dt>{t.actual}</dt>
            <dd style={{ color: kind === 'revenue' ? 'var(--revenue)' : 'var(--spend)' }}>
              {money(node.a, lang)}
            </dd>
          </dl>

          {node.b !== 0 && (
            <div className="meter">
              <div className="meter__track">
                <div
                  className="meter__fill"
                  style={{
                    width: `${Math.min(100, Math.abs(node.a / node.b) * 100)}%`,
                    background: overspend ? 'var(--gap)' : 'var(--accent)',
                  }}
                />
              </div>
              <div className="meter__caption">
                <span>{t.actual}</span>
                <span>{euros(node.a, lang)}</span>
              </div>
            </div>
          )}

          <dl className="kv" style={{ marginTop: '0.75rem' }}>
            {share !== null && (
              <>
                <dt>{t.shareOfTotal}</dt>
                <dd>{percent(share, lang, share < 0.01 ? 2 : 1)}</dd>
              </>
            )}
            {head && (
              <>
                <dt>{t.perResident}</dt>
                <dd>{head}</dd>
              </>
            )}
            {yoy && (
              <>
                <dt>{t.changeVsPreviousYear}</dt>
                <dd>{yoy}</dd>
              </>
            )}
          </dl>
        </div>

        {/* What is inside this item, directly under the figures. Drilling used
            to be a single button below three charts, which meant the obvious
            next question — "what is this made of?" — was the hardest thing to
            reach in the panel. */}
        {subItems.length > 0 && (
          <div className="detail__section">
            <h3>{t.subItems(subItems.length)}</h3>
            <ul className="subitems">
              {subItems.slice(0, CHILD_PREVIEW).map((child) => (
                <li key={child.id}>
                  <button type="button" onClick={() => onOpenChild(child.id)}>
                    <span
                      className="subitems__fill"
                      style={{ width: `${Math.min(100, child.share * 100)}%` }}
                      aria-hidden="true"
                    />
                    <span className="subitems__name">
                      {/* The label truncates in its own box; text-overflow does
                          nothing on a flex container itself. */}
                      <span className="subitems__label">{child.n}</span>
                      {child.ch?.length ? (
                        <span className="subitems__deeper" aria-hidden="true">
                          <IconChevronRight size={12} />
                        </span>
                      ) : null}
                    </span>
                    <span className="subitems__value">{money(child.a, lang)}</span>
                  </button>
                </li>
              ))}
            </ul>
            {canDrill && (
              <button type="button" className="btn subitems__all" onClick={onDrill}>
                {subItems.length > CHILD_PREVIEW
                  ? t.showAllSubItems(subItems.length)
                  : t.openInMainView}
                <IconChevronRight />
              </button>
            )}
          </div>
        )}

        {node.m && (
          <div className="detail__section">
            <h3>{t.cumulativeOutturn}</h3>
            <CumulativeLine
              values={node.m}
              budget={node.b}
              monthsAvailable={year.monthsAvailable}
              lang={lang}
              t={t}
            />
            <h3 style={{ marginTop: '0.85rem' }}>{t.monthlyOutturn}</h3>
            <MonthlyBars
              values={node.m}
              monthsAvailable={year.monthsAvailable}
              lang={lang}
              t={t}
            />
          </div>
        )}

        {trend && (
          <div className="detail__section">
            <h3>{t.multiYear}</h3>
            <YearTrend
              years={trends!.years}
              actual={trend.a}
              budget={trend.b}
              currentYear={year.year}
              lang={lang}
              t={t}
            />
          </div>
        )}

        <div className="detail__section">
          {!canDrill && (
            <p style={{ fontSize: '0.85rem', color: 'var(--ink-3)' }}>{t.noChildren}</p>
          )}
          <p style={{ marginTop: canDrill ? 0 : '0.75rem', fontSize: '0.8rem', color: 'var(--ink-3)' }}>
            <a href={sourceUrl(node, view, year.year)} target="_blank" rel="noopener noreferrer">
              {t.rawData} <IconExternal />
            </a>
            <br />
            {t.rawDataHint}
          </p>
        </div>
      </aside>
    </>
  );
}
