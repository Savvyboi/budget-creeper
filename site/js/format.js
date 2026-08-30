/**
 * Money formatting.
 *
 * State budget figures span nine orders of magnitude — a 40 billion euro main
 * class and a 12 000 euro line item appear in the same list. Everything is
 * therefore scaled to a readable unit, and the full euro amount is kept for
 * tables, tooltips and screen readers.
 */

const LOCALE = { fi: 'fi-FI', sv: 'sv-FI', en: 'en-GB' };

/** Unit suffixes. Finnish and Swedish use "mrd/milj."; English uses "bn/m". */
const UNITS = {
  fi: { bn: 'mrd €', mn: 'milj. €', k: 't €' },
  sv: { bn: 'mrd €', mn: 'mn €', k: 't €' },
  en: { bn: 'bn €', mn: 'm €', k: 'k €' },
};

function decimalsFor(scaled) {
  const abs = Math.abs(scaled);
  if (abs >= 100) return 0;
  if (abs >= 10) return 1;
  return 2;
}

/** Compact money for headlines and lists: "40,3 mrd €", "812 milj. €". */
export function money(value, lang = 'fi', options = {}) {
  const locale = LOCALE[lang] || LOCALE.fi;
  const units = UNITS[lang] || UNITS.fi;
  const abs = Math.abs(value);
  const prefix = options.sign && value > 0 ? '+' : '';

  let scaled;
  let unit;
  if (abs >= 1e9) {
    scaled = value / 1e9;
    unit = units.bn;
  } else if (abs >= 1e6) {
    scaled = value / 1e6;
    unit = units.mn;
  } else if (abs >= 1e4) {
    scaled = value / 1e3;
    unit = units.k;
  } else {
    return prefix + value.toLocaleString(locale, { maximumFractionDigits: 0 }) + ' €';
  }

  const d = decimalsFor(scaled);
  return (
    prefix +
    scaled.toLocaleString(locale, { minimumFractionDigits: d, maximumFractionDigits: d }) +
    ' ' +
    unit
  );
}

/** Full euro amount, for tables and accessible chart labels. */
export function euros(value, lang = 'fi') {
  return Math.round(value).toLocaleString(LOCALE[lang] || LOCALE.fi, {
    maximumFractionDigits: 0,
  }) + ' €';
}

export function percent(fraction, lang = 'fi', digits = 1) {
  return (
    (fraction * 100).toLocaleString(LOCALE[lang] || LOCALE.fi, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }) + ' %'
  );
}

/** Signed percentage change, used for year-on-year deltas. */
export function change(from, to, lang = 'fi') {
  if (!from) return null;
  const ratio = (to - from) / Math.abs(from);
  const sign = ratio > 0 ? '+' : '';
  return (
    sign +
    (ratio * 100).toLocaleString(LOCALE[lang] || LOCALE.fi, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }) +
    ' %'
  );
}

export function perCapita(value, population, lang = 'fi') {
  if (!population) return null;
  const each = value / population;
  const digits = Math.abs(each) >= 100 ? 0 : Math.abs(each) >= 10 ? 1 : 2;
  return (
    each.toLocaleString(LOCALE[lang] || LOCALE.fi, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }) + ' €'
  );
}

export function integer(value, lang = 'fi') {
  return value.toLocaleString(LOCALE[lang] || LOCALE.fi, { maximumFractionDigits: 0 });
}

export function isoDate(iso, lang = 'fi') {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(LOCALE[lang] || LOCALE.fi, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
