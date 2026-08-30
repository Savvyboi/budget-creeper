import { useMemo } from 'react';
import type { Lang, Strings } from '../i18n';
import type { NodeView } from '../types';
import { money } from '../lib/format';
import { squarify, withTail } from '../lib/treemap';
import { useElementWidth } from '../lib/prefs';

interface Props {
  t: Strings;
  lang: Lang;
  rows: NodeView[];
  selectedId: string | null;
  kind: 'expenditure' | 'revenue';
  onOpen: (node: NodeView) => void;
  onSelect: (node: NodeView) => void;
}

/**
 * Cells are shaded by rank rather than by value: a value ramp would make the
 * two largest main classes nearly identical, and the area already encodes the
 * amount anyway.
 *
 * The lightness range is deliberately narrow and dark. Cell labels are white
 * and small, so every step of the ramp has to clear 4.5:1 against white; a
 * wider ramp looks livelier but leaves the smallest cells unreadable. The same
 * colours are used in both themes, since the cells carry their own background.
 */
function shade(index: number, count: number, kind: 'expenditure' | 'revenue'): string {
  const position = count <= 1 ? 0 : index / (count - 1);
  if (kind === 'revenue') {
    return `hsl(163 ${60 - position * 12}% ${20 + position * 14}%)`;
  }
  return `hsl(214 ${58 - position * 14}% ${26 + position * 18}%)`;
}

const MAX_CELLS = 60;

export function Treemap({ t, lang, rows, selectedId, kind, onOpen, onSelect }: Props) {
  const [ref, width] = useElementWidth<HTMLDivElement>();

  // A treemap needs vertical room to stay readable; on a phone it becomes a
  // tall block rather than a squashed strip.
  const height = width > 0 ? Math.max(280, Math.min(620, width * (width < 640 ? 1.15 : 0.58))) : 320;

  const { cells, byId, tail } = useMemo(() => {
    const positive = rows.filter((row) => Math.abs(row.a) > 0);
    const { head, tailValue, tailCount } = withTail(
      positive.map((row) => ({ id: row.id, value: Math.abs(row.a), row })),
      MAX_CELLS,
    );
    const inputs = head.map((item) => ({ id: item.id, value: item.value }));
    if (tailCount) inputs.push({ id: '__tail__', value: tailValue });

    const lookup = new Map(head.map((item) => [item.id, item.row]));
    return {
      cells: squarify(inputs, width, height, 3),
      byId: lookup,
      tail: tailCount ? { count: tailCount, value: tailValue } : null,
    };
  }, [rows, width, height]);

  const order = useMemo(() => {
    const map = new Map<string, number>();
    cells.forEach((cell, i) => map.set(cell.id, i));
    return map;
  }, [cells]);

  const hasArea = rows.some((row) => Math.abs(row.a) > 0);

  return (
    <div className="treemap" ref={ref} style={{ height }}>
      {!hasArea && <p className="empty">{t.noChildren}</p>}
      {width > 0 &&
        cells.map((cell) => {
          const row = byId.get(cell.id);
          const index = order.get(cell.id) ?? 0;
          const isTail = cell.id === '__tail__';
          const area = cell.width * cell.height;
          const sizeClass =
            area < 2400 ? 'treemap__cell--tiny' : area < 9000 ? 'treemap__cell--sm' : '';

          const label = isTail
            ? `${t.children(tail?.count ?? 0)}`
            : (row?.n ?? '');
          const value = isTail ? (tail?.value ?? 0) : (row?.a ?? 0);

          return (
            <button
              key={cell.id}
              type="button"
              className={`treemap__cell ${sizeClass}`}
              data-selected={row ? row.id === selectedId : undefined}
              style={{
                left: cell.x,
                top: cell.y,
                width: cell.width,
                height: cell.height,
                background: isTail ? 'var(--treemap-other)' : shade(index, cells.length, kind),
              }}
              title={`${isTail ? label : `${row?.c} ${label}`} — ${money(value, lang)}`}
              aria-label={`${isTail ? label : `${row?.c} ${label}`}, ${money(value, lang)}`}
              disabled={isTail}
              onClick={() => {
                if (!row) return;
                // One tap opens the details; the same tap on the already
                // selected cell drills in, which keeps the phone to one gesture.
                if (row.id === selectedId && row.ch?.length) onOpen(row);
                else onSelect(row);
              }}
              onDoubleClick={() => row?.ch?.length && onOpen(row)}
            >
              <span className="treemap__name">{label}</span>
              <span className="treemap__value">{money(value, lang)}</span>
            </button>
          );
        })}
    </div>
  );
}
