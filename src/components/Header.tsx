import type { Lang, Strings } from '../i18n';
import { LANGS } from '../i18n';
import type { YearSummary } from '../types';
import {
  IconAuto,
  IconCoins,
  IconGlobe,
  IconMoon,
  IconSearch,
  IconSun,
} from './Icons';

interface Props {
  t: Strings;
  lang: Lang;
  onLang: (lang: Lang) => void;
  theme: 'light' | 'dark' | 'system';
  onTheme: () => void;
  years: YearSummary[];
  year: number;
  onYear: (year: number) => void;
  onSearch: () => void;
}

export function Header({
  t,
  lang,
  onLang,
  theme,
  onTheme,
  years,
  year,
  onYear,
  onSearch,
}: Props) {
  const ThemeIcon = theme === 'light' ? IconSun : theme === 'dark' ? IconMoon : IconAuto;
  const incompleteHint =
    lang === 'en'
      ? '* the year is still being booked'
      : lang === 'sv'
        ? '* året bokförs ännu'
        : '* vuosi on vielä kesken';

  return (
    <header className="app-header">
      <div className="page app-header__inner">
        <div className="brand">
          <IconCoins size={20} />
          <span className="brand__text">
            {t.brand} <span className="brand__sub">· {t.brandSub}</span>
          </span>
        </div>

        <div className="header-actions">
          <button type="button" className="btn" onClick={onSearch} aria-keyshortcuts="/">
            <IconSearch />
            <span className="hide-sm">{t.search}</span>
          </button>

          <label className="sr-only" htmlFor="year-select">
            {t.selectYear}
          </label>
          <select
            id="year-select"
            className="select"
            value={year}
            title={years.some((y) => !y.complete) ? incompleteHint : undefined}
            onChange={(event) => onYear(Number(event.target.value))}
          >
            {years.map((y) => (
              <option key={y.year} value={y.year}>
                {/* An asterisk marks a year still being booked; the hero
                    explains what that means in full. */}
                {y.year}
                {y.complete ? '' : ' *'}
              </option>
            ))}
          </select>

          <div className="lang-menu">
            <label className="sr-only" htmlFor="lang-select">
              {t.language}
            </label>
            <IconGlobe />
            <select
              id="lang-select"
              className="select select--bare"
              value={lang}
              onChange={(event) => onLang(event.target.value as Lang)}
            >
              {LANGS.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="btn btn--icon"
            onClick={onTheme}
            title={t.theme}
            aria-label={t.theme}
          >
            <ThemeIcon />
          </button>
        </div>
      </div>
    </header>
  );
}
