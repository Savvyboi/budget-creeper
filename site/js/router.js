/**
 * Hash routing.
 *
 * A hash keeps every static host working without rewrite rules, and makes the
 * state of the explorer shareable: #/2025/menot/rakenne/28.90.30
 *
 * The slugs are Finnish and stay fixed whatever UI language is selected, so a
 * link shared by a Finnish reader opens the same place for an English one.
 */

const KIND_SLUG = { expenditure: 'menot', revenue: 'tulot' };
const VIEW_SLUG = { budget: 'rakenne', org: 'hallinnonala', economic: 'menolaji' };

const kindFromSlug = (slug) => (slug === 'tulot' ? 'revenue' : 'expenditure');

const viewFromSlug = (slug) => {
  if (slug === 'hallinnonala') return 'org';
  if (slug === 'menolaji') return 'economic';
  return 'budget';
};

export function routeToHash(route) {
  const parts = [route.year ?? '', KIND_SLUG[route.kind], VIEW_SLUG[route.view]];
  // Node ids may themselves contain slashes ("30/430/30.20.43"), which is fine:
  // everything after the third segment is the id.
  const tail = route.nodeId ? `/${route.nodeId}` : '';
  return `#/${parts.join('/')}${tail}`;
}

export function parseHash(hash) {
  const clean = hash.replace(/^#\/?/, '');
  const segments = clean.split('/');
  const yearRaw = segments[0] || '';
  return {
    year: /^\d{4}$/.test(yearRaw) ? Number(yearRaw) : null,
    kind: kindFromSlug(segments[1] || ''),
    view: viewFromSlug(segments[2] || ''),
    nodeId: segments.slice(3).join('/'),
  };
}

/**
 * A tiny router: `current()` reads the hash, `go()` writes it, and `onChange`
 * fires whenever it changes — including on the browser's back button.
 */
export function createRouter(onChange) {
  let route = parseHash(window.location.hash);

  window.addEventListener('hashchange', () => {
    route = parseHash(window.location.hash);
    onChange(route);
  });

  return {
    current: () => route,
    go(next, replace = false) {
      const merged = { ...parseHash(window.location.hash), ...next };
      const hash = routeToHash(merged);
      if (hash === window.location.hash) return;
      if (replace) {
        history.replaceState(null, '', hash);
        route = merged;
        onChange(route);
      } else {
        // Assigning the hash fires `hashchange`, which updates `route`.
        window.location.hash = hash;
      }
    },
  };
}
