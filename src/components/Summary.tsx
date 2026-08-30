import { useMemo } from 'react';
import type { Lang, Strings } from '../i18n';
import type { Kind, RawView, YearData, YearSummary } from '../types';
import { change, integer, money, perCapita } from '../lib/format';
import { IconInfo, IconWarning } from './Icons';

/**
 * Revenue department 15 "Lainat" is the borrowing that balances the budget, and
 * is reported apart from ordinary revenue. Mirrors the constant in the build.
 */
const BORROWING_MAIN_CLASS = '15';

interface Props {
  t: Strings;
  lang: Lang;
  data: YearData;
  previous: YearSummary | undefined;
  onPick: (kind: Kind, nodeId: string) => void;
}

/**
 * Colour ramp for the composition bars. Distinct hues rather than a single-hue
 * ramp, because the segments are categories and not an ordered scale; the
 * lightness is held roughly constant so no segment shouts louder than the rest.
 */
const RAMP = [
  '#1b4fa0', '#2f7fb8', '#3aa08c', '#5a8f3c', '#9a8a24',
  '#b5722a', '#a95340', '#8f4576', '#5c4f9e', '#6d7280',
];

interface Segment {
  id: string;
  name: string;
  value: number;
  color: string;
}

function composition(
  view: RawView,
  maxSegments: number,
  otherLabel: string,
  exclude: string[] = [],
): Segment[] {
  const roots = view.roots
    .filter((id) => !exclude.includes(id))
    .map((id) => ({ id, node: view.nodes[id] }))
    .filter((entry) => entry.node && entry.node.a > 0)
    .sort((a, b) => b.node.a - a.node.a);

  const head = roots.slice(0, maxSegments);
  const tail = roots.slice(maxSegments);
  const segments: Segment[] = head.map((entry, i) => ({
    id: entry.id,
    name: entry.node.n,
    value: entry.node.a,
    color: RAMP[i % RAMP.length],
  }));
  if (tail.length) {
    segments.push({
      id: '',
      name: `${otherLabel} (${tail.length})`,
      value: tail.reduce((sum, entry) => sum + entry.node.a, 0),
      color: RAMP[RAMP.length - 1],
    });
  }
  return segments;
}

function FlowRow({
  label,
  total,
  segments,
  lang,
  onPick,
}: {
  label: string;
  total: number;
  segments: Segment[];
  lang: Lang;
  onPick: (id: string) => void;
}) {
  const sum = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  return (
    <div className="flowbar__row">
      <div className="flowbar__head">
        <b>{label}</b>
        <span>{money(total, lang)}</span>
      </div>
      <div className="flowbar__track">
        {segments.map((seg) => (
          <button
            key={seg.id || seg.name}
            type="button"
            className="flowbar__seg"
            style={{ width: `${(seg.value / sum) * 100}%`, background: seg.color }}
            title={`${seg.name} — ${money(seg.value, lang)} (${((seg.value / sum) * 100).toFixed(1)} %)`}
            aria-label={`${seg.name}, ${money(seg.value, lang)}`}
            onClick={() => seg.id && onPick(seg.id)}
            disabled={!seg.id}
          />
        ))}
      </div>
      <div className="flowbar__legend">
        {segments.slice(0, 7).map((seg) => (
          <span key={seg.id || seg.name}>
            <i className="swatch" style={{ background: seg.color }} />
            {seg.name}
          </span>
        ))}
      </div>
    </div>
  );
}

export function Summary({ t, lang, data, previous, onPick }: Props) {
  const { totals } = data;
  const partial = !data.complete;

  const expenditureSegments = useMemo(
    () => composition(data.view.expenditure, 8, lang === 'en' ? 'Other' : lang === 'sv' ? 'Övriga' : 'Muut'),
    [data, lang],
  );
  // Borrowing (revenue department 15) is left out so the bar adds up to the
  // revenue headline, which also excludes it.
  const revenueSegments = useMemo(
    () =>
      composition(
        data.view.revenue,
        8,
        lang === 'en' ? 'Other' : lang === 'sv' ? 'Övriga' : 'Muut',
        [BORROWING_MAIN_CLASS],
      ),
    [data, lang],
  );

  const deficit = totals.balance.a < 0;
  const perHead = perCapita(totals.expenditure.a, data.population, lang);

  // Year-on-year comparisons only make sense between two complete years.
  const comparable = previous && previous.complete && data.complete;
  const spendChange = comparable ? change(previous.expenditure.a, totals.expenditure.a, lang) : null;
  const revenueChange = comparable ? change(previous.revenue.a, totals.revenue.a, lang) : null;

  return (
    <section className="hero" aria-labelledby="hero-title">
      <h1 className="hero__title" id="hero-title">
        {t.heroTitle(data.year)}
      </h1>
      <p className="hero__lede">{t.heroLede}</p>

      {partial && (
        <p className="notice" style={{ marginTop: '1rem' }}>
          <IconWarning />
          <span>
            <b>{t.partialYearTitle}.</b> {t.partialYear(data.year, data.monthsAvailable)}
          </span>
        </p>
      )}

      <div className="stat-grid">
        <div className="stat">
          <span className="stat__label">{t.expenditure}</span>
          <span className="stat__value stat__value--spend">{money(totals.expenditure.a, lang)}</span>
          <span className="stat__note">
            {spendChange ? (
              <>
                <span className={deltaClass(spendChange)}>{spendChange}</span> {t.vsPreviousYear}
              </>
            ) : (
              `${t.budgetInForce} ${money(totals.expenditure.b, lang)}`
            )}
          </span>
        </div>

        <div className="stat">
          {/* Named in full: the explorer's "revenue" side includes borrowing,
              this headline does not, and two different totals under one word
              would be the most confusing thing on the page. */}
          <span className="stat__label">{t.revenueExclBorrowing}</span>
          <span className="stat__value stat__value--revenue">{money(totals.revenue.a, lang)}</span>
          <span className="stat__note">
            {revenueChange ? (
              <>
                <span className={deltaClass(revenueChange, true)}>{revenueChange}</span>{' '}
                {t.vsPreviousYear}
              </>
            ) : (
              `${t.budgetInForce} ${money(totals.revenue.b, lang)}`
            )}
          </span>
        </div>

        <div className="stat">
          <span className="stat__label">{deficit ? t.deficit : t.surplus}</span>
          <span className="stat__value stat__value--gap">
            {money(Math.abs(totals.balance.a), lang)}
          </span>
          <span className="stat__note">
            {t.borrowing} {money(totals.borrowing.a, lang)}
          </span>
        </div>

        <div className="stat">
          <span className="stat__label">
            {t.perResident}
            <span
              title={
                lang === 'en'
                  ? 'Expenditure divided by the population at year end.'
                  : lang === 'sv'
                    ? 'Utgifterna delade med folkmängden vid årets slut.'
                    : 'Menot jaettuna vuoden lopun väkiluvulla.'
              }
            >
              <IconInfo size={13} />
            </span>
          </span>
          <span className="stat__value">{perHead ?? '—'}</span>
          <span className="stat__note">
            {data.population
              ? `${integer(data.population, lang)} ${
                  lang === 'en' ? 'residents' : lang === 'sv' ? 'invånare' : 'asukasta'
                }`
              : '—'}
          </span>
        </div>
      </div>

      <div className="flowbar">
        <FlowRow
          label={t.expenditure}
          total={totals.expenditure.a}
          segments={expenditureSegments}
          lang={lang}
          onPick={(id) => onPick('expenditure', id)}
        />
        <FlowRow
          label={t.revenueExclBorrowing}
          total={totals.revenue.a}
          segments={revenueSegments}
          lang={lang}
          onPick={(id) => onPick('revenue', id)}
        />
      </div>
    </section>
  );
}

/** Rising spending reads as a warning; rising revenue reads as good. */
function deltaClass(text: string, positiveIsGood = false): string {
  const up = text.startsWith('+');
  if (positiveIsGood) return up ? 'delta delta--down' : 'delta delta--up';
  return up ? 'delta delta--up' : 'delta delta--down';
}
