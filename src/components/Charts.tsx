import { useId } from 'react';
import type { Lang, Strings } from '../i18n';
import { euros, money } from '../lib/format';
import { cumulative } from '../lib/tree';

const PAD = { top: 8, right: 4, bottom: 16, left: 4 };

/**
 * Outturn per month.
 *
 * Central government spending is not a smooth line — transfers to the wellbeing
 * services counties land at the start of a month, EU payments arrive in bursts —
 * so the shape of the year is worth showing rather than only the total.
 */
export function MonthlyBars({
  values,
  monthsAvailable,
  lang,
  t,
}: {
  values: number[];
  monthsAvailable: number;
  lang: Lang;
  t: Strings;
}) {
  const width = 280;
  const height = 72;
  const inner = { w: width - PAD.left - PAD.right, h: height - PAD.top - PAD.bottom };
  const max = Math.max(...values.map(Math.abs), 1);
  const slot = inner.w / 12;
  const barWidth = Math.max(3, slot - 3);

  return (
    <figure>
      <svg
        className="chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${t.monthlyOutturn}: ${values
          .slice(0, monthsAvailable)
          .map((v, i) => `${t.months[i]} ${money(v, lang)}`)
          .join(', ')}`}
      >
        <line
          className="grid"
          x1={PAD.left}
          x2={width - PAD.right}
          y1={PAD.top + inner.h}
          y2={PAD.top + inner.h}
        />
        {values.map((value, i) => {
          const magnitude = (Math.abs(value) / max) * inner.h;
          const negative = value < 0;
          return (
            <rect
              key={i}
              className={i < monthsAvailable ? 'bar-actual' : 'bar-muted'}
              x={PAD.left + i * slot + (slot - barWidth) / 2}
              y={negative ? PAD.top + inner.h : PAD.top + inner.h - magnitude}
              width={barWidth}
              height={Math.max(1, magnitude)}
              rx={1.5}
              opacity={negative ? 0.45 : 1}
            >
              <title>{`${t.months[i]}: ${euros(value, lang)}`}</title>
            </rect>
          );
        })}
        {t.monthsShort.map((label, i) => (
          <text
            key={i}
            x={PAD.left + i * slot + slot / 2}
            y={height - 4}
            textAnchor="middle"
            opacity={i % 2 === 0 ? 1 : 0.55}
          >
            {label}
          </text>
        ))}
      </svg>
    </figure>
  );
}

/**
 * The year's accumulation against the appropriation in force. The dashed line
 * is the budget; where the solid line crosses it, the item overran.
 */
export function CumulativeLine({
  values,
  budget,
  monthsAvailable,
  lang,
  t,
}: {
  values: number[];
  budget: number;
  monthsAvailable: number;
  lang: Lang;
  t: Strings;
}) {
  const gradientId = useId();
  const width = 280;
  const height = 86;
  const inner = { w: width - PAD.left - PAD.right, h: height - PAD.top - PAD.bottom };

  const running = cumulative(values).slice(0, Math.max(1, monthsAvailable));
  const peak = Math.max(...running.map(Math.abs), Math.abs(budget), 1);
  const x = (i: number) => PAD.left + (i / 11) * inner.w;
  const y = (v: number) => PAD.top + inner.h - (Math.abs(v) / peak) * inner.h;

  const line = running.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const area = `${line} L${x(running.length - 1).toFixed(1)} ${PAD.top + inner.h} L${x(0).toFixed(1)} ${
    PAD.top + inner.h
  } Z`;

  const final = running[running.length - 1] ?? 0;

  return (
    <figure>
      <svg
        className="chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${t.cumulativeOutturn}: ${money(final, lang)}${
          budget ? `, ${t.budgetInForce} ${money(budget, lang)}` : ''
        }`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <line
          className="grid"
          x1={PAD.left}
          x2={width - PAD.right}
          y1={PAD.top + inner.h}
          y2={PAD.top + inner.h}
        />
        {budget !== 0 && (
          <>
            <path className="line-budget" d={`M${PAD.left} ${y(budget)} H${width - PAD.right}`} />
            <text x={width - PAD.right} y={y(budget) - 4} textAnchor="end">
              {t.budgeted}
            </text>
          </>
        )}
        <path d={area} className="area-actual" />
        <path d={line} className="line-actual" />
        <circle cx={x(running.length - 1)} cy={y(final)} r="2.8" fill="var(--accent)" />
        {[0, 5, 11].map((i) => (
          <text key={i} x={x(i)} y={height - 4} textAnchor={i === 0 ? 'start' : i === 11 ? 'end' : 'middle'}>
            {t.monthsShort[i]}
          </text>
        ))}
      </svg>
    </figure>
  );
}

/** Actual outturn year by year, with the appropriation shown as a tick. */
export function YearTrend({
  years,
  actual,
  budget,
  currentYear,
  lang,
  t,
}: {
  years: number[];
  actual: (number | null)[];
  budget: (number | null)[];
  currentYear: number;
  lang: Lang;
  t: Strings;
}) {
  const width = 280;
  const height = 96;
  const pad = { top: 10, right: 4, bottom: 18, left: 4 };
  const inner = { w: width - pad.left - pad.right, h: height - pad.top - pad.bottom };

  const present = actual.map((v, i) => ({ v, b: budget[i], year: years[i] })).filter((d) => d.v !== null);
  if (present.length < 2) return <p className="empty">{t.noTrend}</p>;

  const peak = Math.max(
    ...present.map((d) => Math.abs(d.v ?? 0)),
    ...present.map((d) => Math.abs(d.b ?? 0)),
    1,
  );
  const slot = inner.w / present.length;
  const barWidth = Math.max(4, slot - 5);

  return (
    <figure>
      <svg
        className="chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${t.multiYear}: ${present
          .map((d) => `${d.year} ${money(d.v ?? 0, lang)}`)
          .join(', ')}`}
      >
        <line
          className="grid"
          x1={pad.left}
          x2={width - pad.right}
          y1={pad.top + inner.h}
          y2={pad.top + inner.h}
        />
        {present.map((d, i) => {
          const h = (Math.abs(d.v ?? 0) / peak) * inner.h;
          const bx = pad.left + i * slot + (slot - barWidth) / 2;
          const budgetY = d.b ? pad.top + inner.h - (Math.abs(d.b) / peak) * inner.h : null;
          const isCurrent = d.year === currentYear;
          return (
            <g key={d.year}>
              <rect
                className={isCurrent ? 'bar-actual' : 'bar-muted'}
                x={bx}
                y={pad.top + inner.h - h}
                width={barWidth}
                height={Math.max(1, h)}
                rx={1.5}
                opacity={isCurrent ? 1 : 0.55}
              >
                <title>{`${d.year}: ${euros(d.v ?? 0, lang)}`}</title>
              </rect>
              {budgetY !== null && (
                <line
                  x1={bx - 1}
                  x2={bx + barWidth + 1}
                  y1={budgetY}
                  y2={budgetY}
                  stroke="var(--ink-3)"
                  strokeWidth="1.5"
                />
              )}
            </g>
          );
        })}
        {present.map((d, i) =>
          i === 0 || i === present.length - 1 || present.length <= 6 ? (
            <text
              key={d.year}
              x={pad.left + i * slot + slot / 2}
              y={height - 5}
              textAnchor="middle"
              fontWeight={d.year === currentYear ? 700 : 400}
            >
              {String(d.year).slice(2)}
            </text>
          ) : null,
        )}
      </svg>
    </figure>
  );
}
