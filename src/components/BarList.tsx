import type { Lang, Strings } from '../i18n';
import type { Kind, NodeView } from '../types';
import { money, percent } from '../lib/format';
import { IconChevronRight } from './Icons';

interface Props {
  t: Strings;
  lang: Lang;
  rows: NodeView[];
  kind: Kind;
  selectedId: string | null;
  onOpen: (node: NodeView) => void;
  onSelect: (node: NodeView) => void;
}

/**
 * The list view: one row per item, with the share drawn as a background fill.
 * This is the default on phones — labels stay readable at any value, and the
 * whole row is a 44 px-plus tap target.
 *
 * A row is two controls, not one: the body opens the item's details, the
 * chevron steps into its sub-items. They used to be the same button, with
 * drilling hidden behind a second click on an already-selected row, which is
 * not something a reader can be expected to discover.
 */
export function BarList({ t, lang, rows, kind, selectedId, onOpen, onSelect }: Props) {
  if (!rows.length) return <p className="empty">{t.noChildren}</p>;

  const max = Math.max(...rows.map((row) => Math.abs(row.a)), 1);
  const accent = kind === 'expenditure' ? 'var(--spend)' : 'var(--revenue)';

  return (
    <div className="barlist">
      {rows.map((row) => {
        const drillable = Boolean(row.ch?.length);
        const over = row.b > 0 && row.a > row.b * 1.02;

        return (
          <div className="barrow" key={row.id} data-selected={row.id === selectedId}>
            <span
              className="barrow__fill"
              style={{ width: `${(Math.abs(row.a) / max) * 100}%`, background: accent }}
              aria-hidden="true"
            />
            <button
              type="button"
              className="barrow__body"
              aria-label={`${row.c} ${row.n}, ${money(row.a, lang)}`}
              onClick={() => onSelect(row)}
            >
              <span className="barrow__main">
                <span className="barrow__name">
                  <span>{row.n}</span>
                  <span className="barrow__code">{row.c}</span>
                </span>
                <span className="barrow__meta">
                  {row.b !== 0 && (
                    <span>
                      {t.budgeted} {money(row.b, lang)}
                    </span>
                  )}
                  {over && <span style={{ color: 'var(--gap)' }}>{t.overBudget}</span>}
                  {drillable && <span>{t.children(row.ch?.length ?? 0)}</span>}
                </span>
              </span>
              <span className="barrow__num">
                <span className="barrow__value">{money(row.a, lang)}</span>
                <span className="barrow__share">
                  {percent(row.share, lang, row.share < 0.01 ? 2 : 1)}
                </span>
              </span>
            </button>
            {drillable && (
              <button
                type="button"
                className="barrow__drill"
                title={t.showAllSubItems(row.ch?.length ?? 0)}
                aria-label={`${row.n} — ${t.showAllSubItems(row.ch?.length ?? 0)}`}
                onClick={() => onOpen(row)}
              >
                <IconChevronRight />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
