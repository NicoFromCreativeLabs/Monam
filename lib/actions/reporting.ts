"use server";

import { prisma } from "@/lib/prisma";
import {
  periodRange,
  compareRange,
  getOccupancyPct,
  getAttachRetailPct,
  getIngresoHoraEsteticista,
  getRebookingPct,
  getRetention90dPct,
  getNoShowPct,
  getCancellationWithin24hPct,
  getDeadHoursPerWeek,
  getRoomOccupancyNext7Days,
  getEstheticianOccupancyThisWeek,
  getVentasDetail,
  getWeeklyRevenueTrend,
  getClientasDetail,
  getRetailDetail,
  getEquipoCommissions,
  type Period,
  type CompareTo,
  type VentasDetail,
  type VentasWeeklyPoint,
  type RoomOccupancyDay,
  type EstheticianOccupancy,
  type ClientasDetail,
  type RetailDetail,
  type EquipoCommissionRow,
} from "@/lib/reporting";
import type { PnlBreakdown } from "@/lib/pnl-math";
import { getAdjustedPnl, type PnlAdjustState } from "@/lib/pnl-adjustments";

export interface ReportingRates {
  ocupacion: number | null;
  attachRetail: number | null;
  ingresoHoraEsteticista: number | null;
  rebooking: number | null;
  retencion90d: number | null;
  noShow: number | null;
  cancellationWithin24h: number | null;
  deadHoursPerWeek: number | null;
}

export interface ReportingSnapshot {
  pnl: PnlBreakdown;
  pnlState: PnlAdjustState; // whether the P&L month is editable / closed
  pnlBaseline: PnlBreakdown | null;
  pnlMesAnterior: PnlBreakdown;
  rates: ReportingRates;
  ratesBaseline: ReportingRates | null;
  kpiTargets: Record<string, { value: number; unit: string }>;
  ventas: VentasDetail;
  ventasBaseline: VentasDetail["nivel2"] | null;
  ventasWeeklyTrend: VentasWeeklyPoint[];
  roomOccupancyNext7Days: RoomOccupancyDay[];
  estheticianOccupancyThisWeek: EstheticianOccupancy[];
  clientas: ClientasDetail;
  clientasBaseline: ClientasDetail | null;
  retail: RetailDetail;
  retailBaseline: RetailDetail | null;
  equipoCommissions: EquipoCommissionRow[];
}

async function computeRates(locationIds: string[], range: { start: Date; end: Date }): Promise<ReportingRates> {
  const [ocupacion, attachRetail, ingresoHoraEsteticista, rebooking, retencion90d, noShow, cancellationWithin24h, deadHoursPerWeek] =
    await Promise.all([
      getOccupancyPct(locationIds, range),
      getAttachRetailPct(locationIds, range),
      getIngresoHoraEsteticista(locationIds, range),
      getRebookingPct(),
      getRetention90dPct(),
      getNoShowPct(locationIds, range),
      getCancellationWithin24hPct(),
      getDeadHoursPerWeek(locationIds, range),
    ]);
  return { ocupacion, attachRetail, ingresoHoraEsteticista, rebooking, retencion90d, noShow, cancellationWithin24h, deadHoursPerWeek };
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
  const [
    { pnl, state: pnlState }, rates, kpiTargetRows, ventas, ventasWeeklyTrend,
    roomOccupancyNext7Days, estheticianOccupancyThisWeek, clientas, retail, equipoCommissions,
  ] = await Promise.all([
    getAdjustedPnl(locationIds, range),
    computeRates(locationIds, range),
    prisma.kpiTarget.findMany(),
    getVentasDetail(locationIds, range),
    getWeeklyRevenueTrend(locationIds),
    getRoomOccupancyNext7Days(locationIds),
    getEstheticianOccupancyThisWeek(locationIds),
    getClientasDetail(locationIds, range),
    getRetailDetail(locationIds, range),
    getEquipoCommissions(locationIds, range),
  ]);

  let pnlBaseline: PnlBreakdown | null = null;
  let ratesBaseline: ReportingRates | null = null;
  let ventasBaseline: VentasDetail["nivel2"] | null = null;
  let clientasBaseline: ClientasDetail | null = null;
  let retailBaseline: RetailDetail | null = null;
  if (compareTo !== "Objetivo") {
    const baselineRange = compareRange(compareTo, period);
    [pnlBaseline, ratesBaseline, ventasBaseline, clientasBaseline, retailBaseline] = await Promise.all([
      getAdjustedPnl(locationIds, baselineRange).then((r) => r.pnl),
      computeRates(locationIds, baselineRange),
      getVentasDetail(locationIds, baselineRange).then((v) => v.nivel2),
      getClientasDetail(locationIds, baselineRange),
      getRetailDetail(locationIds, baselineRange),
    ]);
  }

  // P&L's "Mes ant." column is fixed to the previous month regardless of
  // which "Comparar con" is selected — reuse pnlBaseline when it's already
  // that exact range, otherwise fetch it separately.
  const pnlMesAnterior =
    compareTo === "Mes anterior" && pnlBaseline
      ? pnlBaseline
      : (await getAdjustedPnl(locationIds, compareRange("Mes anterior", period))).pnl;

  const kpiTargets: Record<string, { value: number; unit: string }> = {};
  for (const k of kpiTargetRows) kpiTargets[k.kpi] = { value: k.targetValue, unit: k.targetUnit };

  return {
    pnl, pnlState, pnlBaseline, pnlMesAnterior, rates, ratesBaseline, kpiTargets,
    ventas, ventasBaseline, ventasWeeklyTrend, roomOccupancyNext7Days, estheticianOccupancyThisWeek,
    clientas, clientasBaseline, retail, retailBaseline, equipoCommissions,
  };
}
