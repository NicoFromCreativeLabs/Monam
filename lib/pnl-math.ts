// Pure math over a PnlBreakdown — no DB access, safe to import from client
// components (unlike lib/reporting.ts, which is server-only). Kept in sync
// with lib/reporting.ts's own copy of this math by both referencing this
// file as the single source of truth.
export interface PnlBreakdown {
  serviciosTargeted: number;
  serviciosSignature: number;
  addOns: number;
  retail: number;
  descuentos: number;
  reembolsos: number;
  backbarTeorico: number;
  costoRetailVendido: number;
  cortesias: number;
  merma: number;
  nominaBase: number;
  cargasSociales: number;
  comisionesServicio: number;
  comisionesRetail: number;
  renta: number;
  mantenimiento: number;
  // Lines with no data source in the system: always typed in by hand (0 until then).
  paquetesVencidos: number;
  insumosAddOns: number;
  comisionTerminal: number;
  operacionLocal: number;
  marketingLocal: number;
  // Deposits collected in the period minus those applied to charges (net, so a
  // deposit later credited to a service is not counted twice).
  depositosReservaciones: number;
  // Stripe's fee on online sales and deposits.
  comisionStripe: number;
}

export function ventasBrutas(b: PnlBreakdown) {
  return b.serviciosTargeted + b.serviciosSignature + b.addOns + b.retail + b.paquetesVencidos + b.depositosReservaciones;
}
export function ingresoNetoFromBreakdown(b: PnlBreakdown) {
  return ventasBrutas(b) + b.descuentos + b.reembolsos;
}
export function utilidadBruta(b: PnlBreakdown) {
  return (
    ingresoNetoFromBreakdown(b) + b.backbarTeorico + b.insumosAddOns + b.costoRetailVendido + b.cortesias + b.merma
  );
}
// Shared by every Análisis nivel1 KPI that reads the real reporting
// snapshot — diff display with a graceful "no real baseline yet" state,
// rather than a derived/projected number.
export function formatRealDelta(
  value: number | null,
  baseline: number | null,
  compareLabel: string,
  unit: "pts" | "$" | "%",
): { label: string; tone: "positive" | "negative" | "neutral" } {
  if (value === null || baseline === null) return { label: "Sin datos previos", tone: "neutral" };
  const diff = value - baseline;
  if (diff === 0) return { label: `Sin cambio vs. ${compareLabel}`, tone: "neutral" };
  const tone = diff > 0 ? "positive" : "negative";
  const arrow = diff > 0 ? "▲" : "▼";
  const abs = Math.abs(diff);
  if (unit === "$") return { label: `${arrow} ${abs.toLocaleString()} MXN vs. ${compareLabel}`, tone };
  if (unit === "pts") return { label: `${arrow} ${abs} ${abs === 1 ? "pt" : "pts"} vs. ${compareLabel}`, tone };
  return { label: `${arrow} ${abs}% vs. ${compareLabel}`, tone };
}

// Below this, "% of ingreso neto" is meaningless — a near-zero denominator
// turns any nonzero numerator into an absurd percentage (e.g. a real
// -$107,209 MXN EBITDA — rent, payroll, etc. are never zero — divided by
// $11 of leftover test-override revenue reads as -974,627%). No single
// floor is "correct"; this one clears a single Targeted service ($850 MXN)
// without hiding a genuinely small but real month. Shared by the Admin
// Panel's "Contribución" KPI and the P&L table's own "% Ing." column —
// previously each screen reimplemented this with no guard at all.
const MIN_INGRESO_NETO_FOR_PCT = 1000;

// Cargas sociales as a share of Nómina base (IMSS/INFONAVIT/etc.) — the one
// fixed cost derived from another rather than recorded directly, so both
// lib/reporting.ts's computed value and lib/pnl-periods.ts's override
// recompute use this instead of letting a hand-typed nominaBase silently
// leave cargasSociales stale.
export const CARGAS_SOCIALES_RATIO = 0.3;

export function pctOfIngresoNeto(amount: number, ingresoNeto: number): number | null {
  if (Math.abs(ingresoNeto) < MIN_INGRESO_NETO_FOR_PCT) return null;
  return Math.round((amount / ingresoNeto) * 100);
}

export function ebitda(b: PnlBreakdown) {
  return (
    utilidadBruta(b) +
    b.nominaBase +
    b.cargasSociales +
    b.comisionesServicio +
    b.comisionesRetail +
    b.renta +
    b.mantenimiento +
    b.comisionTerminal +
    b.comisionStripe +
    b.operacionLocal +
    b.marketingLocal
  );
}
