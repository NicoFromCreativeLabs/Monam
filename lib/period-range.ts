// Pure date-range math — no DB access, safe to import from tests or client
// components (unlike lib/reporting.ts, which is server-only).
export const PERIOD_OPTIONS = ["Mes en curso", "Mes anterior", "Trimestre en curso", "Año en curso"] as const;
export type Period = (typeof PERIOD_OPTIONS)[number];
export type CompareTo = "Mes anterior" | "Mismo mes año anterior" | "Objetivo";

export interface DateRange {
  start: Date;
  end: Date;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function startOfQuarter(d: Date) {
  return new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1);
}
function startOfYear(d: Date) {
  return new Date(d.getFullYear(), 0, 1);
}
function addMonths(d: Date, months: number) {
  return new Date(d.getFullYear(), d.getMonth() + months, d.getDate());
}
function addYears(d: Date, years: number) {
  return new Date(d.getFullYear() + years, d.getMonth(), d.getDate());
}

// The real date range a Periodo selection covers, always ending "now" (not
// end-of-period) — "Mes en curso" is month-to-date, not the whole month.
export function periodRange(period: Period, now = new Date()): DateRange {
  if (period === "Mes anterior") return { start: startOfMonth(addMonths(now, -1)), end: startOfMonth(now) };
  if (period === "Trimestre en curso") return { start: startOfQuarter(now), end: now };
  if (period === "Año en curso") return { start: startOfYear(now), end: now };
  return { start: startOfMonth(now), end: now };
}

// The equivalent-length range immediately before the Periodo's own range
// (for "Mes anterior" as a comparison, not as the Periodo itself) or the
// same range shifted back one year (for "Mismo mes año anterior").
export function compareRange(
  compareTo: "Mes anterior" | "Mismo mes año anterior",
  period: Period,
  now = new Date(),
): DateRange {
  const current = periodRange(period, now);
  if (compareTo === "Mismo mes año anterior") {
    return { start: addYears(current.start, -1), end: addYears(current.end, -1) };
  }
  const spanMs = current.end.getTime() - current.start.getTime();
  return { start: new Date(current.start.getTime() - spanMs), end: current.start };
}
