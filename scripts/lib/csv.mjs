/**
 * Minimal, allocation-conscious RFC 4180 CSV reader.
 *
 * The Valtiokonttori exports quote every text field, leave numbers bare, use a
 * UTF-8 BOM and mix CRLF/LF line endings. Field values may contain commas
 * ("Ympäristökorvaukset, luonnonmukainen tuotanto, ...") so a `split(',')` is
 * not good enough.
 */

/** Parse a whole CSV document, yielding one array of strings per record. */
export function* parseRows(text) {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // strip BOM

  const len = text.length;
  let i = 0;
  let row = [];
  let field = '';
  let inQuotes = false;
  let sawAnyChar = false;

  while (i < len) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      sawAnyChar = true;
      i++;
      continue;
    }
    if (ch === ',') {
      row.push(field);
      field = '';
      sawAnyChar = true;
      i++;
      continue;
    }
    if (ch === '\r') {
      i++;
      continue;
    }
    if (ch === '\n') {
      row.push(field);
      if (sawAnyChar || row.length > 1 || row[0] !== '') yield row;
      row = [];
      field = '';
      sawAnyChar = false;
      i++;
      continue;
    }
    field += ch;
    sawAnyChar = true;
    i++;
  }

  if (sawAnyChar || field !== '') {
    row.push(field);
    yield row;
  }
}

/**
 * Parse a CSV document into objects keyed by header name.
 * Returns `{ header, rows }` where `rows` is a generator of index-keyed arrays
 * plus a `col(name)` accessor, which is far cheaper than building 25k objects.
 */
export function readTable(text) {
  const it = parseRows(text);
  const first = it.next();
  if (first.done) return { header: [], index: {}, rows: [] };

  const header = first.value.map((h) => h.trim());
  const index = {};
  header.forEach((h, n) => {
    index[h] = n;
  });

  const rows = [];
  for (const r of it) {
    // Trailing blank line / short row guard.
    if (r.length === 1 && r[0].trim() === '') continue;
    rows.push(r);
  }
  return { header, index, rows };
}

/** Finnish exports use `.` as decimal separator and leave blanks for zero. */
export function num(value) {
  if (value == null) return 0;
  const s = value.trim();
  if (s === '') return 0;
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}
