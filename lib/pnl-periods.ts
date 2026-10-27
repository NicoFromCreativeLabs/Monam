import { CARGAS_SOCIALES_RATIO, type PnlBreakdown } from "@/lib/pnl-math";

// Pure helpers for the P&L's editable "Real" column and month close — no
// database access, shared by the server actions, the reporting snapshot and
// the P&L screen.

export type PnlField = keyof PnlBreakdown;

export const PNL_FIELDS: PnlField[] = [
  "serviciosTargeted", "serviciosSignature", "addOns", "retail", "paquetesVencidos", "depositosReservaciones",
  "descuentos", "reembolsos",
  "backbarTeorico", "insumosAddOns", "costoRetailVendido", "cortesias", "merma",
  "nominaBase", "cargasSociales", "comisionesServicio", "comisionesRetail",
  "renta", "mantenimiento",
  "comisionTerminal", "comisionStripe", "operacionLocal", "marketingLocal",
];

// Lines the P&L stores as negative numbers (costs, discounts, refunds). The
// screen lets the Owner type them as plain positive amounts.
export const PNL_COST_FIELDS = new Set<PnlField>([
  "descuentos", "reembolsos", "backbarTeorico", "insumosAddOns", "costoRetailVendido", "cortesias", "merma",
  "nominaBase", "cargasSociales", "comisionesServicio", "comisionesRetail", "renta", "mantenimiento",
  "comisionTerminal", "comisionStripe", "operacionLocal", "marketingLocal",
]);

export function emptyBreakdown(): PnlBreakdown {
  const out = {} as Record<PnlField, number>;
  for (const f of PNL_FIELDS) out[f] = 0;
  return out as PnlBreakdown;
}

export function sumBreakdowns(list: PnlBreakdown[]): PnlBreakdown {
  const out = emptyBreakdown();
  for (const b of list) for (const f of PNL_FIELDS) out[f] += b[f] ?? 0;
  return out;
}

// What the Owner types → what is stored. Costs are always stored negative.
export function storedFromTyped(field: PnlField, typed: number): number {
  return PNL_COST_FIELDS.has(field) ? -Math.abs(typed) : typed;
}
// What is stored → what the input shows.
export function typedFromStored(field: PnlField, stored: number): number {
  return PNL_COST_FIELDS.has(field) ? Math.abs(stored) : stored;
}

export function applyOverrides(base: PnlBreakdown, overrides: Record<string, number>): PnlBreakdown {
  const out = { ...base };
  for (const f of PNL_FIELDS) {
    const v = overrides[f];
    if (typeof v === "number" && Number.isFinite(v)) out[f] = v;
  }
  // cargasSociales is derived from nominaBase, not recorded on its own — a
  // hand-typed nominaBase with no explicit cargasSociales override must
  // recompute it, or the displayed value silently stays stale at 30% of the
  // old nominaBase.
  if (typeof overrides.nominaBase === "number" && typeof overrides.cargasSociales !== "number") {
    out.cargasSociales = Math.round(out.nominaBase * CARGAS_SOCIALES_RATIO);
  }
  return out;
}

// A snapshot read back from the database: keep only known numeric fields and
// default anything missing to 0, so an old snapshot never breaks a newer P&L.
export function normalizeSnapshot(raw: unknown): PnlBreakdown {
  const out = emptyBreakdown();
  if (raw && typeof raw === "object") {
    for (const f of PNL_FIELDS) {
      const v = (raw as Record<string, unknown>)[f];
      if (typeof v === "number" && Number.isFinite(v)) out[f] = v;
    }
  }
  return out;
}

export function monthKeyOf(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function isMonthKey(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function monthRange(key: string): { start: Date; end: Date } {
  const [y, m] = key.split("-").map(Number);
  return { start: new Date(y, m - 1, 1), end: new Date(y, m, 1) };
}

// The calendar month a date range covers, or null when the range is not
// exactly one month (a quarter, a year, or a month-to-date window that does
// not start on the 1st). Only month-aligned ranges can be edited or closed.
export function monthKeyOfRange(range: { start: Date; end: Date }): string | null {
  const { start, end } = range;
  if (start.getDate() !== 1 || start.getHours() !== 0 || start.getMinutes() !== 0) return null;
  const nextFirst = new Date(start.getFullYear(), start.getMonth() + 1, 1);
  if (end.getTime() <= start.getTime() || end.getTime() > nextFirst.getTime()) return null;
  return monthKeyOf(start);
}

// A month can only be closed once it is over — closing it earlier would
// freeze a month that is still receiving sales.
export function monthHasEnded(key: string, now = new Date()): boolean {
  return now.getTime() >= monthRange(key).end.getTime();
}

export function isFutureMonth(key: string, now = new Date()): boolean {
  return monthRange(key).start.getTime() > now.getTime();
}

export function nextMonthKey(key: string): string {
  return monthKeyOf(monthRange(key).end);
}

// Parses what the Owner typed in a cell ("1,200", "$1200", "(500)", "-50").
// Returns null when it is not a whole number of pesos.
export function parseMoneyInput(text: string): number | null {
  const cleaned = text.replace(/[$,\s]/g, "");
  const negative = /^\(.*\)$/.test(cleaned);
  const digits = cleaned.replace(/[()]/g, "");
  if (!/^-?\d+$/.test(digits)) return null;
  const n = Number(digits);
  return negative ? -Math.abs(n) : n;
}
