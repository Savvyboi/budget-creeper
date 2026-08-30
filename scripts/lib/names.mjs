/**
 * Name normalisation.
 *
 * From budget year 2025 onwards the source data switched main-class and chapter
 * names to ALL CAPS ("VALTIOVARAINMINISTERIÖN HALLINNONALA") while older years
 * use sentence case. Left alone the site would shout at the reader for recent
 * years and whisper for old ones, so names are normalised to sentence case.
 *
 * Two strategies, in order:
 *   1. Reuse a real sentence-case spelling of the same code seen in another
 *      year of the same dataset — always the most faithful option.
 *   2. Otherwise down-case and re-capitalise, protecting known acronyms.
 */

const ACRONYMS = new Set([
  'EU', 'ETA', 'EMU', 'EIP', 'EKP', 'EAKR', 'ESR', 'YK', 'NATO', 'OECD', 'IMF',
  'HUS', 'ICT', 'ELY', 'TE', 'VTT', 'YLE', 'VR', 'STUK', 'GTK', 'RAY', 'STEA', 'KEHA',
  'VNK', 'UM', 'OM', 'SM', 'PLM', 'VM', 'OKM', 'MMM', 'LVM', 'TEM', 'STM', 'YM',
  'ALV', 'KELA', 'THL', 'TUKES', 'SYKE', 'BKT', 'BKTL', 'CEF', 'RRF', 'PPP',
  'II', 'III', 'IV', 'VII', 'VIII',
]);

const isAllCaps = (s) => s === s.toLocaleUpperCase('fi-FI') && /\p{L}/u.test(s);

/**
 * Re-case one whitespace-free token, honouring the Finnish convention that a
 * case ending after a colon stays lower case ("EU:n", not "EU:N") and that only
 * the acronym part of a compound is capitalised ("HUS-yhtymän").
 */
function recaseToken(token) {
  return token
    .split(/([\-\/:])/)
    .map((part) => {
      if (part.length < 2) return part;
      const upper = part.toLocaleUpperCase('fi-FI');
      return ACRONYMS.has(upper) ? upper : part;
    })
    .join('');
}

/** "VALTIOVARAINMINISTERIÖN HALLINNONALA" -> "Valtiovarainministeriön hallinnonala" */
export function toSentenceCase(input) {
  if (!input) return '';
  const s = input.trim();
  if (!isAllCaps(s)) return s;

  const out = s
    .toLocaleLowerCase('fi-FI')
    .split(/(\s+)/)
    .map((token) => (/^\s*$/.test(token) ? token : recaseToken(token)))
    .join('');

  // Capitalise the first letter of the whole label, unless it already opens
  // with an acronym we just restored.
  return out.replace(/\p{L}/u, (c, offset) => {
    const head = out.slice(offset).match(/^[\p{L}:]+/u)?.[0] ?? '';
    if (head === head.toLocaleUpperCase('fi-FI') && head.length > 1) return c;
    return c.toLocaleUpperCase('fi-FI');
  });
}

/**
 * Collects every spelling seen for a code and hands back the best one.
 * `prefer` lets the caller bias toward the spelling used in a specific year.
 */
export class NameBook {
  constructor() {
    /** @type {Map<string, Map<string, {year: number, count: number}>>} */
    this.byCode = new Map();
  }

  add(code, name, year) {
    if (!code || !name) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    let variants = this.byCode.get(code);
    if (!variants) {
      variants = new Map();
      this.byCode.set(code, variants);
    }
    const prev = variants.get(trimmed);
    if (prev) {
      prev.count++;
      prev.year = Math.max(prev.year, year);
    } else {
      variants.set(trimmed, { year, count: 1 });
    }
  }

  resolve(code, preferYear) {
    const variants = this.byCode.get(code);
    if (!variants) return '';
    let best = null;
    let bestScore = -Infinity;
    for (const [name, meta] of variants) {
      // Prefer sentence case, then the spelling closest to the requested year.
      const score =
        (isAllCaps(name) ? 0 : 1000) - Math.abs((preferYear ?? meta.year) - meta.year) * 2;
      if (score > bestScore) {
        bestScore = score;
        best = name;
      }
    }
    return toSentenceCase(best ?? '');
  }
}
