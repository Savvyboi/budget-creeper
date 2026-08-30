/**
 * Hash routing.
 *
 * A hash keeps every deployment target — Cloudflare Pages, Vercel, a plain
 * bucket — working without rewrite rules, and makes the state of the explorer
 * shareable: #/2025/menot/rakenne/28.90.30
 *
 * The slugs are Finnish and stay fixed whatever UI language is selected, so a
 * link shared by a Finnish reader opens the same place for an English one.
 */
import { useCallback, useEffect, useState } from 'react';
import type { Kind, ViewId } from '../types';

export interface Route {
  year: number | null;
  kind: Kind;
  view: ViewId;
  nodeId: string;
}

const KIND_SLUG: Record<Kind, string> = { expenditure: 'menot', revenue: 'tulot' };
const VIEW_SLUG: Record<ViewId, string> = {
  budget: 'rakenne',
  org: 'hallinnonala',
  economic: 'menolaji',
};

const kindFromSlug = (slug: string): Kind =>
  slug === 'tulot' ? 'revenue' : 'expenditure';

const viewFromSlug = (slug: string): ViewId => {
  if (slug === 'hallinnonala') return 'org';
  if (slug === 'menolaji') return 'economic';
  return 'budget';
};

export function routeToHash(route: Route): string {
  const parts = [
    route.year ?? '',
    KIND_SLUG[route.kind],
    VIEW_SLUG[route.view],
  ];
  // Node ids may themselves contain slashes ("30/430/30.20.43"), which is fine:
  // everything after the third segment is the id.
  const tail = route.nodeId ? `/${route.nodeId}` : '';
  return `#/${parts.join('/')}${tail}`;
}

export function parseHash(hash: string): Route {
  const clean = hash.replace(/^#\/?/, '');
  const segments = clean.split('/');
  const yearRaw = segments[0] ?? '';
  const year = /^\d{4}$/.test(yearRaw) ? Number(yearRaw) : null;
  return {
    year,
    kind: kindFromSlug(segments[1] ?? ''),
    view: viewFromSlug(segments[2] ?? ''),
    nodeId: segments.slice(3).join('/'),
  };
}

export function useRoute(): [Route, (next: Partial<Route>, replace?: boolean) => void] {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));

  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = useCallback(
    (next: Partial<Route>, replace = false) => {
      const current = parseHash(window.location.hash);
      const merged: Route = { ...current, ...next };
      const hash = routeToHash(merged);
      if (hash === window.location.hash) return;
      if (replace) {
        history.replaceState(null, '', hash);
        setRoute(merged);
      } else {
        window.location.hash = hash;
      }
    },
    [],
  );

  return [route, navigate];
}
