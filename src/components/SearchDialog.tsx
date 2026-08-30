import { useEffect, useMemo, useRef, useState } from 'react';
import type { Lang, Strings } from '../i18n';
import type { SearchEntry } from '../lib/tree';
import { searchEntries } from '../lib/tree';
import { money } from '../lib/format';
import { IconClose, IconSearch } from './Icons';

interface Props {
  t: Strings;
  lang: Lang;
  index: SearchEntry[];
  onPick: (entry: SearchEntry) => void;
  onClose: () => void;
}

/**
 * Search across every level of the current view, both sides of the budget.
 * The list is keyboard-first: arrows move, Enter opens, Escape closes.
 */
export function SearchDialog({ t, lang, index, onPick, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => searchEntries(index, query), [index, query]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    const item = listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`);
    item?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (event.key === 'Enter' && results[active]) {
      event.preventDefault();
      onPick(results[active]);
    }
  };

  return (
    <div
      className="search-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="search" role="dialog" aria-modal="true" aria-label={t.search}>
        <div className="search__field">
          <IconSearch size={18} />
          <input
            ref={inputRef}
            type="search"
            value={query}
            placeholder={t.searchPlaceholder}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
            aria-controls="search-results"
            aria-autocomplete="list"
            autoComplete="off"
            spellCheck={false}
          />
          <button type="button" className="btn btn--ghost btn--icon" onClick={onClose} aria-label={t.close}>
            <IconClose />
          </button>
        </div>

        <div className="search__results" id="search-results" role="listbox" ref={listRef}>
          {query.trim().length < 2 && <p className="search__empty">{t.searchStart}</p>}
          {query.trim().length >= 2 && !results.length && <p className="search__empty">{t.searchEmpty}</p>}
          {results.map((entry, i) => (
            <button
              key={`${entry.kind}-${entry.id}`}
              type="button"
              role="option"
              aria-selected={i === active}
              data-active={i === active}
              data-index={i}
              className="search__item"
              onMouseEnter={() => setActive(i)}
              onClick={() => onPick(entry)}
            >
              <span>
                {entry.name}
                <small>
                  {entry.code} · {entry.kind === 'revenue' ? t.revenue : t.expenditure}
                </small>
              </span>
              <span style={{ fontWeight: 620, whiteSpace: 'nowrap' }}>{money(entry.actual, lang)}</span>
            </button>
          ))}
        </div>

        <div className="search__hint">
          <span>
            <kbd>↑</kbd> <kbd>↓</kbd> {t.searchHintNav}
          </span>
          <span>
            <kbd>↵</kbd> {t.searchHintOpen}
          </span>
          <span>
            <kbd>Esc</kbd> {t.close.toLowerCase()}
          </span>
        </div>
      </div>
    </div>
  );
}
