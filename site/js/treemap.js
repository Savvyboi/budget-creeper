/**
 * Squarified treemap layout (Bruls, Huizing & van Wijk, 2000).
 *
 * Laid out in plain numbers so the component can render whatever it likes —
 * buttons here, rather than SVG, so every cell is focusable and reads as a
 * control to assistive technology.
 */

const worstRatio = (row, side, scale) => {
  let sum = 0;
  let min = Infinity;
  let max = -Infinity;
  for (const v of row) {
    sum += v;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const s2 = (sum * scale) ** 2;
  const side2 = side ** 2;
  return Math.max((side2 * max * scale) / s2, s2 / (side2 * min * scale));
};

/**
 * @param items  Values must be non-negative; zero and negative entries are
 *               dropped because a treemap cannot express them honestly.
 * @param width  Layout box in pixels.
 * @param gap    Space between cells; applied by shrinking each cell.
 */
export function squarify(items, width, height, gap = 3) {
  const usable = items
    .map((item) => ({ id: item.id, value: Math.abs(item.value) }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);

  if (!usable.length || width <= 0 || height <= 0) return [];

  const total = usable.reduce((sum, item) => sum + item.value, 0);
  const scale = (width * height) / total;

  const cells = [];
  let rect = { x: 0, y: 0, width, height };
  let index = 0;

  while (index < usable.length) {
    const side = Math.min(rect.width, rect.height);
    const row = [];
    const rowIds = [];

    // Grow the row while the aspect ratios keep improving.
    while (index < usable.length) {
      const candidate = usable[index].value;
      if (row.length === 0) {
        row.push(candidate);
        rowIds.push(usable[index].id);
        index++;
        continue;
      }
      const current = worstRatio(row, side, scale);
      const next = worstRatio([...row, candidate], side, scale);
      if (next > current) break;
      row.push(candidate);
      rowIds.push(usable[index].id);
      index++;
    }

    const rowSum = row.reduce((sum, v) => sum + v, 0);
    const thickness = (rowSum * scale) / side;

    let offset = 0;
    for (let i = 0; i < row.length; i++) {
      const length = (row[i] * scale) / thickness;
      const cell =
        rect.width >= rect.height
          ? { x: rect.x, y: rect.y + offset, width: thickness, height: length }
          : { x: rect.x + offset, y: rect.y, width: length, height: thickness };
      offset += length;
      cells.push({
        id: rowIds[i],
        x: cell.x + gap / 2,
        y: cell.y + gap / 2,
        width: Math.max(0, cell.width - gap),
        height: Math.max(0, cell.height - gap),
      });
    }

    rect =
      rect.width >= rect.height
        ? { x: rect.x + thickness, y: rect.y, width: rect.width - thickness, height: rect.height }
        : { x: rect.x, y: rect.y + thickness, width: rect.width, height: rect.height - thickness };

    if (rect.width < 0.5 || rect.height < 0.5) break;
  }

  return cells;
}

/**
 * A treemap with 400 cells is noise. Keep the leading items and fold the tail
 * into one "other" cell, which stays clickable and explains what it holds.
 */
export function withTail(items, max) {
  if (items.length <= max) return { head: items, tailValue: 0, tailCount: 0 };
  const sorted = [...items].sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  const head = sorted.slice(0, max - 1);
  const tail = sorted.slice(max - 1);
  return {
    head,
    tailValue: tail.reduce((sum, item) => sum + Math.abs(item.value), 0),
    tailCount: tail.length,
  };
}
