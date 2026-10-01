"use server";

import { prisma } from "@/lib/prisma";
import {
  periodRange,
  compareRange,
  getPnlBreakdown,
  getOccupancyPct,
  getAttachRetailPct,
  getIngresoHoraEsteticista,
  getRebookingPct,
  getRetention90dPct,
  type Period,
  type CompareTo,
} from "@/lib/reporting";
import type { PnlBreakdown } from "@/lib/pnl-math";

export interface ReportingRates {
  ocupacion: number | null;
  attachRetail: number | null;
  ingresoHoraEsteticista: number | null;
  rebooking: number | null;
  retencion90d: number | null;
}

export interface ReportingSnapshot {
  pnl: PnlBreakdown;
  pnlBaseline: PnlBreakdown | null;
  pnlMesAnterior: PnlBreakdown;
  rates: ReportingRates;
  ratesBaseline: ReportingRates | null;
  kpiTargets: Record<string, { value: number; unit: string }>;
}

async function computeRates(locationIds: string[], range: { start: Date; end: Date }): Promise<ReportingRates> {
  const [ocupacion, attachRetail, ingresoHoraEsteticista, rebooking, retencion90d] = await Promise.all([
    getOccupancyPct(locationIds, range),
    getAttachRetailPct(locationIds, range),
    getIngresoHoraEsteticista(locationIds, range),
    getRebookingPct(),
    getRetention90dPct(),
  ]);
  return { ocupacion, attachRetail, ingresoHoraEsteticista, rebooking, retencion90d };
}

// Single real-data snapshot every reporting page (Panel, the 5 Análisis
// pages, P&L) reads from — one call per [Local, Periodo, Comparar con]
// combination, computed directly from Sale/SaleLineItem/CommissionEntry/
// Appointment rows rather than derived/projected from a label. Re-fetched
// client-side (startTransition) whenever any of those three filters change;
// Objetivo doesn't need a baseline fetch, it reads real KpiTarget rows.
export async function getReportingSnapshotAction(
  selectedNames: string[],
  period: Period,
  compareTo: CompareTo,
): Promise<ReportingSnapshot> {
  const locations = await prisma.location.findMany({ where: { name: { in: selectedNames } } });
  const locationIds = locations.map((l) => l.id);

  const range = periodRange(period);
  const [pnl, rates, kpiTargetRows] = await Promise.all([
    getPnlBreakdown(locationIds, range),
    computeRates(locationIds, range),
    prisma.kpiTarget.findMany(),
  ]);

  let pnlBaseline: PnlBreakdown | null = null;
  let ratesBaseline: ReportingRates | null = null;
  if (compareTo !== "Objetivo") {
    const baselineRange = compareRange(compareTo, period);
    [pnlBaseline, ratesBaseline] = await Promise.all([
      getPnlBreakdown(locationIds, baselineRange),
      computeRates(locationIds, baselineRange),
    ]);
  }

  // P&L's "Mes ant." column is fixed to the previous month regardless of
  // which "Comparar con" is selected — reuse pnlBaseline when it's already
  // that exact range, otherwise fetch it separately.
  const pnlMesAnterior =
    compareTo === "Mes anterior" && pnlBaseline
      ? pnlBaseline
      : await getPnlBreakdown(locationIds, compareRange("Mes anterior", period));

  const kpiTargets: Record<string, { value: number; unit: string }> = {};
  for (const k of kpiTargetRows) kpiTargets[k.kpi] = { value: k.targetValue, unit: k.targetUnit };

  return { pnl, pnlBaseline, pnlMesAnterior, rates, ratesBaseline, kpiTargets };
}
