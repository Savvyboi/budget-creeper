import type { Lang, Strings } from '../i18n';
import type { NodeView } from '../types';
import type { SortKey } from '../lib/tree';
import { euros, percent } from '../lib/format';
import { IconChevronDown } from './Icons';

interface Props {
  t: Strings;
  lang: Lang;
  rows: NodeView[];
  sort: SortKey;
  descending: boolean;
  onSort: (key: SortKey) => void;
  onSelect: (node: NodeView) => void;
  onOpen: (node: NodeView) => void;
  selectedId: string | null;
}

/**
 * Exact figures, sortable. The compact views round hard so that a treemap cell
 * stays legible; this is where a reader who wants the euro amount comes.
 */
export function TableView({
  t,
  lang,
  rows,
  sort,
  descending,
  onSort,
  onSelect,
  onOpen,
  selectedId,
}: Props) {
  const columns: { key: SortKey; label: string; numeric: boolean }[] = [
    { key: 'name', label: t.tableName, numeric: false },
    { key: 'budget', label: t.originalBudget, numeric: true },
    { key: 'budget', label: t.budgetInForce, numeric: true },
    { key: 'actual', label: t.actual, numeric: true },
    { key: 'execution', label: t.execution, numeric: true },
  ];

  return (
    <div className="tablewrap">
      <table className="data">
        <caption className="sr-only">
          {t.tableName} — {t.actual}
        </caption>
        <thead>
          <tr>
            {columns.map((column, i) => (
              <th key={`${column.key}-${i}`} scope="col" aria-sort={ariaSort(sort, column.key, descending)}>
                <button type="button" onClick={() => onSort(column.key)}>
                  {column.label}
                  {sort === column.key && (
                    <span
                      aria-hidden="true"
                      style={{ transform: descending ? 'none' : 'rotate(180deg)', display: 'inline-flex' }}
                    >
                      <IconChevronDown size={13} />
                    </span>
                  )}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              onClick={() => onSelect(row)}
              onDoubleClick={() => row.ch?.length && onOpen(row)}
              style={{ cursor: 'pointer' }}
              data-selected={row.id === selectedId}
            >
              <td>
                <span style={{ fontWeight: 560 }}>{row.n}</span>{' '}
                <span className="barrow__code">{row.c}</span>
              </td>
              <td className="num cell-muted">{row.b0 ? euros(row.b0, lang) : '—'}</td>
              <td className="num">{row.b ? euros(row.b, lang) : '—'}</td>
              <td className="num" style={{ fontWeight: 620 }}>
                {euros(row.a, lang)}
              </td>
              <td className="num">
                {row.execution === null ? (
                  '—'
                ) : (
                  <span style={{ color: row.execution > 1.02 ? 'var(--gap)' : undefined }}>
                    {percent(row.execution, lang, 0)}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && <p className="empty">{t.noChildren}</p>}
    </div>
  );
}

function ariaSort(
  sort: SortKey,
  key: SortKey,
  descending: boolean,
): 'ascending' | 'descending' | 'none' {
  if (sort !== key) return 'none';
  return descending ? 'descending' : 'ascending';
}
