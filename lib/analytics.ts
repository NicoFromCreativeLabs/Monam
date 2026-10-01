import { PNL_LINES_BY_LOCATION, PANEL_KPI_BY_LOCATION, LOCATION_WEIGHT } from "@/lib/mock-data";

// Shared by Panel and every Análisis sub-page that scopes its numbers to
// whichever location(s) the "Local" filter has selected — one place for the
// PNL_LINES_BY_LOCATION sum and the PANEL_KPI_BY_LOCATION weighted-average
// logic, instead of each page re-deriving it.

export const INGRESO_NETO_LABELS = [
  "Servicios Targeted",
  "Servicios Signature",
  "Add-ons",
  "Retail",
  "Paquetes vencidos no usados",
  "− Descuentos",
  "− Reembolsos",
];

// The operational cost lines P&L tracks per location in
// PNL_LINES_BY_LOCATION. Nómina base, Cargas sociales, Renta, and
// Mantenimiento y servicios are deliberately NOT in that map — P&L computes
// those live from the real staff roster and Location.rentCost/
// maintenanceCost (see app/admin/analytics/pnl/page.tsx), so callers here
// must pass their scoped total in separately (liveCosts, as a negative
// number) rather than expect this map to have them.
export const OPERATIONAL_COST_LABELS = [
  "Backbar teórico",
  "Insumos de add-ons",
  "Costo retail vendido",
  "Cortesías",
  "Merma",
  "Comisiones de servicio",
  "Comisiones de retail",
  "Comisión de terminal",
  "Operación del local",
  "Marketing local",
];

export function sumScoped(labels: string[], selectedNames: string[]) {
  return selectedNames.reduce(
    (sum, name) => sum + labels.reduce((s, label) => s + (PNL_LINES_BY_LOCATION[name]?.[label] ?? 0), 0),
    0,
  );
}

export function ingresoNeto(selectedNames: string[]) {
  return sumScoped(INGRESO_NETO_LABELS, selectedNames);
}

// liveCosts: Nómina base + Cargas sociales + Renta + Mantenimiento y
// servicios, scoped to the same selectedNames, as a negative number (the
// caller computes this from useStaffRoster()/useLocations() — see Panel).
export function contribucionPct(selectedNames: string[], liveCosts: number) {
  const neto = ingresoNeto(selectedNames);
  if (!neto) return { pct: 0, ebitda: 0 };
  const ebitda = neto + sumScoped(OPERATIONAL_COST_LABELS, selectedNames) + liveCosts;
  return { pct: Math.round((ebitda / neto) * 100), ebitda };
}

// Weighted average across whichever location(s) are selected, using
// LOCATION_WEIGHT as each location's relative size — real per-location
// hour/visit counts aren't modeled for these KPIs, so a flat average would
// under-weight Roma Norte's actual larger footprint.
export function weightedAvgKpi(kpiId: string, field: "value" | "sub7d", selectedNames: string[]) {
  const rows = selectedNames
    .map((name) => ({ name, data: PANEL_KPI_BY_LOCATION[kpiId]?.[name] }))
    .filter((r): r is { name: string; data: NonNullable<(typeof r)["data"]> } => r.data !== undefined);
  const totalWeight = rows.reduce((s, r) => s + (LOCATION_WEIGHT[r.name] ?? 1), 0);
  if (!totalWeight) return 0;
  const weighted = rows.reduce((s, r) => s + (r.data[field] ?? 0) * (LOCATION_WEIGHT[r.name] ?? 1), 0);
  return Math.round(weighted / totalWeight);
}

export function scaledSparklineKpi(kpiId: string, selectedNames: string[]) {
  const base = PANEL_KPI_BY_LOCATION[kpiId]?.["Roma Norte"]?.sparkline ?? [];
  const target = weightedAvgKpi(kpiId, "value", selectedNames);
  const romaValue = PANEL_KPI_BY_LOCATION[kpiId]?.["Roma Norte"]?.value ?? target;
  if (!romaValue) return base;
  const ratio = target / romaValue;
  return base.map((v) => Math.round(v * ratio));
}

// ---------------------------------------------------------------------------
// Periodo / Comparar con — same "make the chip real, not just the label"
// fix already applied to "Local", extended to the other two filters
// (Periodo already had precedent: PeriodContext.tsx was lifted to shared
// state specifically because leaving it decorative read as broken once
// P&L's own title started reading the selected period; "Comparar con" is
// getting the same treatment now that every page's numbers are genuinely
// dynamic). There's no real historical time series anywhere in this mock,
// so every period/comparison figure here is *derived* from the one signal
// that already exists — each KPI's own "▲ 6% vs. mes anterior"-style
// deltaLabel — rather than a second set of hand-authored numbers.
// ---------------------------------------------------------------------------

export type Period = "Mes en curso" | "Mes anterior" | "Trimestre en curso" | "Año en curso";
export type CompareTo = "Mes anterior" | "Mismo mes año anterior" | "Objetivo";
export type KpiKind = "flow" | "rate";

interface ParsedDelta {
  direction: -1 | 0 | 1;
  magnitude: number;
  unit: "%" | "pts" | "abs";
}

// Reads the existing "▲ 6% vs. mes anterior" / "▼ 1 pt vs. mes anterior" /
// "− sin cambio vs. mes anterior" text already stored on every KPI.
export function parseDeltaLabel(label: string): ParsedDelta {
  if (label.includes("sin cambio")) return { direction: 0, magnitude: 0, unit: "abs" };
  const direction = label.startsWith("▲") ? 1 : label.startsWith("▼") ? -1 : 0;
  const match = label.match(/([\d.]+)\s*(%|pts?)?/);
  const magnitude = match ? parseFloat(match[1]) : 0;
  const unit: ParsedDelta["unit"] = match?.[2]?.startsWith("%") ? "%" : match?.[2]?.startsWith("pt") ? "pts" : "abs";
  return { direction, magnitude, unit };
}

// The implied month-over-month growth rate behind a KPI's own deltaLabel,
// expressed as a fraction of the current value (e.g. "▲ 6%" → 0.06).
export function impliedMonthlyRate(current: number, deltaLabel: string): number {
  const d = parseDeltaLabel(deltaLabel);
  if (d.unit === "%") return (d.direction * d.magnitude) / 100;
  if (current === 0) return 0;
  const prior = current - d.direction * d.magnitude;
  return prior !== 0 ? (current - prior) / prior : 0;
}

// A flat, independent year-over-year assumption for "Mismo mes año
// anterior" — deliberately NOT the monthly rate compounded 12x (a ~6%/mo
// pace compounded would imply an implausible ~2x YoY jump). Rate/percentage
// KPIs move much less year-over-year than $ totals do, hence the 0.35 damp.
const YOY_FLOW_RATE = 0.18;
const YOY_RATE_DAMPING = 0.35;

function periodMonths(period: Period): number {
  return period === "Trimestre en curso" ? 3 : period === "Año en curso" ? 12 : 1;
}

// Value at a single month `monthsAgo` months before the current month,
// projected backward from the implied monthly rate.
function monthValueAt(current: number, r: number, monthsAgo: number): number {
  return current / Math.pow(1 + r, monthsAgo);
}

// Sum of `windowMonths` consecutive months, the most recent of which is
// `monthsAgo` months before the current month (monthsAgo=0 → window ends at
// the current month, i.e. includes it).
function windowSum(current: number, r: number, monthsAgo: number, windowMonths: number): number {
  if (Math.abs(r) < 0.0001) return Math.round(current * windowMonths);
  let sum = 0;
  for (let i = 0; i < windowMonths; i++) sum += monthValueAt(current, r, monthsAgo + i);
  return Math.round(sum);
}

// The absolute value a KPI would show for a given Periodo, extrapolated
// from its current-month value and its own implied monthly rate. "flow"
// KPIs ($ totals, counts) sum across the period as a window of months;
// "rate" KPIs (%, $/hour, ratios) stay level for longer periods — a
// quarter's occupancy rate isn't the current month's rate ×3 — only
// "Mes anterior" moves a rate KPI.
export function periodValue(
  current: number,
  deltaLabel: string,
  period: Period,
  kind: KpiKind = "flow",
): number {
  if (period === "Mes en curso") return current;
  const r = impliedMonthlyRate(current, deltaLabel);
  if (kind === "rate") return period === "Mes anterior" ? Math.round(monthValueAt(current, r, 1)) : current;
  if (period === "Mes anterior") return Math.round(monthValueAt(current, r, 1));
  return windowSum(current, r, 0, periodMonths(period));
}

// The baseline a KPI is measured against for "Comparar con", kept in the
// SAME units as periodValue's output for the given Periodo — e.g. with
// Periodo=Trimestre, "Mes anterior" here means the prior quarter (not a
// single prior month), so the delta never compares a 3-month sum against a
// 1-month figure.
export function compareBaseline(
  current: number,
  deltaLabel: string,
  period: Period,
  compareTo: CompareTo,
  kind: KpiKind = "flow",
  targetValue?: number,
): number {
  const r = impliedMonthlyRate(current, deltaLabel);
  const months = periodMonths(period);

  if (compareTo === "Objetivo") {
    if (targetValue === undefined) return current;
    return kind === "rate" ? Math.round(targetValue) : Math.round(targetValue * months);
  }
  if (compareTo === "Mismo mes año anterior") {
    const rate = kind === "rate" ? YOY_FLOW_RATE * YOY_RATE_DAMPING : YOY_FLOW_RATE;
    const displayed = periodValue(current, deltaLabel, period, kind);
    return kind === "rate" ? displayed / (1 + rate) : Math.round(displayed / (1 + rate));
  }
  // "Mes anterior" — the prior window immediately before the displayed one.
  if (kind === "rate") return Math.round(monthValueAt(current, r, 1));
  return windowSum(current, r, months, months);
}

// current / progressPct → the numeric target implied by a KpiDef's own
// progressPct (already stored per KPI), so "Objetivo" comparisons don't
// need a second hand-authored number.
export function impliedTarget(current: number, progressPct: number): number {
  return progressPct ? current / (progressPct / 100) : current;
}

export interface FormattedDelta {
  label: string;
  tone: "positive" | "negative" | "neutral";
}

// Renders a "▲ 6% vs. X" / "▲ 3 pts vs. X" style label from a live value and
// baseline, formatted the same way the original static deltaLabels were.
export function formatDelta(
  value: number,
  baseline: number,
  compareToLabel: string,
  unit: "%" | "pts" | "abs" = "%",
  higherIsBetter = true,
): FormattedDelta {
  const diff = value - baseline;
  const flat = unit === "pts" || unit === "abs" ? Math.abs(diff) < 0.5 : baseline === 0 || Math.abs(diff / baseline) < 0.005;
  if (flat) return { label: `− sin cambio vs. ${compareToLabel}`, tone: "neutral" };

  const up = diff > 0;
  const tone: FormattedDelta["tone"] = up === higherIsBetter ? "positive" : "negative";
  const arrow = up ? "▲" : "▼";

  if (unit === "%") {
    const pct = baseline !== 0 ? Math.abs(Math.round((diff / baseline) * 100)) : 0;
    return { label: `${arrow} ${pct}% vs. ${compareToLabel}`, tone };
  }
  if (unit === "pts") {
    const pts = Math.abs(Math.round(diff * 10) / 10);
    return { label: `${arrow} ${pts} ${pts === 1 ? "pt" : "pts"} vs. ${compareToLabel}`, tone };
  }
  return { label: `${arrow} ${Math.abs(Math.round(diff))} vs. ${compareToLabel}`, tone };
}

export const COMPARE_TO_LABEL: Record<CompareTo, string> = {
  "Mes anterior": "mes anterior",
  "Mismo mes año anterior": "mismo mes año anterior",
  Objetivo: "objetivo",
};
