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
}

export function ventasBrutas(b: PnlBreakdown) {
  return b.serviciosTargeted + b.serviciosSignature + b.addOns + b.retail;
}
export function ingresoNetoFromBreakdown(b: PnlBreakdown) {
  return ventasBrutas(b) + b.descuentos + b.reembolsos;
}
export function utilidadBruta(b: PnlBreakdown) {
  return ingresoNetoFromBreakdown(b) + b.backbarTeorico + b.costoRetailVendido + b.cortesias + b.merma;
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

export function ebitda(b: PnlBreakdown) {
  return (
    utilidadBruta(b) +
    b.nominaBase +
    b.cargasSociales +
    b.comisionesServicio +
    b.comisionesRetail +
    b.renta +
    b.mantenimiento
  );
}
