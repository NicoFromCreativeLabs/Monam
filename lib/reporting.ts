import "server-only";
import { prisma } from "@/lib/prisma";
import type { PnlBreakdown } from "@/lib/pnl-math";
import type { DateRange } from "@/lib/period-range";

export type { PnlBreakdown } from "@/lib/pnl-math";
export { PERIOD_OPTIONS, periodRange, compareRange, type Period, type CompareTo, type DateRange } from "@/lib/period-range";

const CARGAS_SOCIALES_RATIO = 0.3; // Cargas sociales as a share of Nómina base (IMSS/INFONAVIT/etc.)

// Every real source feeding the P&L, parameterized by location + date
// range — the single source both /admin/analytics/pnl and Panel's
// ingreso/contribución KPIs read from, so the two can never drift apart the
// way a page each deriving its own numbers would. Lines with no real data
// source yet (Comisión de terminal, Operación del local, Marketing local,
// Insumos de add-ons, Paquetes vencidos) are omitted here and read as $0 by
// callers — real expense categories nothing has been recorded against yet,
// not mocked-and-forgotten.
export async function getPnlBreakdown(locationIds: string[], range: DateRange): Promise<PnlBreakdown> {
  if (locationIds.length === 0) {
    return {
      serviciosTargeted: 0, serviciosSignature: 0, addOns: 0, retail: 0, descuentos: 0, reembolsos: 0,
      backbarTeorico: 0, costoRetailVendido: 0, cortesias: 0, merma: 0, nominaBase: 0, cargasSociales: 0,
      comisionesServicio: 0, comisionesRetail: 0, renta: 0, mantenimiento: 0,
    };
  }

  const saleWhere = { locationId: { in: locationIds }, createdAt: { gte: range.start, lt: range.end } };

  const [lineItems, sales, approvals, commissions, inventoryTxns, locations, activeStaff] = await Promise.all([
    prisma.saleLineItem.findMany({
      where: { sale: saleWhere },
      include: { protocol: true },
    }),
    prisma.sale.findMany({ where: saleWhere }),
    prisma.approvalRequest.findMany({
      where: { status: "APPROVED", decidedAt: { gte: range.start, lt: range.end }, type: { in: ["REFUND", "COMP"] } },
    }),
    prisma.commissionEntry.findMany({
      where: { createdAt: { gte: range.start, lt: range.end }, saleLineItem: { sale: saleWhere } },
    }),
    prisma.inventoryTransaction.findMany({
      where: { type: "ADJUSTMENT", qtyDelta: { lt: 0 }, createdAt: { gte: range.start, lt: range.end }, inventoryItem: { locationId: { in: locationIds } } },
      include: { inventoryItem: true },
    }),
    prisma.location.findMany({ where: { id: { in: locationIds } } }),
    prisma.appUser.findMany({
      where: { status: "ACTIVE", locationAssignments: { some: { locationId: { in: locationIds } } } },
    }),
  ]);

  const serviciosTargeted = lineItems
    .filter((l) => l.type === "SERVICE" && l.protocol?.tier === "TARGETED")
    .reduce((s, l) => s + l.priceMxn, 0);
  const serviciosSignature = lineItems
    .filter((l) => l.type === "SERVICE" && l.protocol?.tier === "SIGNATURE")
    .reduce((s, l) => s + l.priceMxn, 0);
  const addOns = lineItems.filter((l) => l.type === "ADD_ON").reduce((s, l) => s + l.priceMxn, 0);
  const retail = lineItems.filter((l) => l.type === "RETAIL").reduce((s, l) => s + l.priceMxn, 0);
  const backbarTeorico = -lineItems
    .filter((l) => l.type === "SERVICE" && l.protocol)
    .reduce((s, l) => s + l.protocol!.costMxn, 0);

  const descuentos = -sales.reduce((s, sale) => s + sale.discountMxn, 0);
  const reembolsos = -approvals.filter((a) => a.type === "REFUND").reduce((s, a) => s + (a.amountMxn ?? 0), 0);
  const cortesias = -approvals.filter((a) => a.type === "COMP").reduce((s, a) => s + (a.amountMxn ?? 0), 0);

  const retailProductIds = lineItems.filter((l) => l.type === "RETAIL" && l.productId).map((l) => l.productId!);
  const retailCostByProduct = retailProductIds.length
    ? await prisma.inventoryItem.findMany({
        where: { productId: { in: retailProductIds }, locationId: { in: locationIds } },
      })
    : [];
  const costByProductId = new Map(retailCostByProduct.map((i) => [i.productId, i.costMxn ?? 0]));
  const costoRetailVendido = -lineItems
    .filter((l) => l.type === "RETAIL" && l.productId)
    .reduce((s, l) => s + (costByProductId.get(l.productId!) ?? 0), 0);

  const merma = inventoryTxns.reduce((s, t) => s + Math.abs(t.qtyDelta) * (t.inventoryItem.costMxn ?? 0), 0) * -1;

  const nominaBase = -activeStaff.reduce((s, u) => s + (u.salaryMxn ?? 0), 0);
  const cargasSociales = Math.round(nominaBase * CARGAS_SOCIALES_RATIO);
  const comisionesServicio = -commissions
    .filter((c) => c.basis === "SERVICE" || c.basis === "ADD_ON")
    .reduce((s, c) => s + c.commissionMxn, 0);
  const comisionesRetail = -commissions.filter((c) => c.basis === "RETAIL").reduce((s, c) => s + c.commissionMxn, 0);

  const renta = -locations.reduce((s, l) => s + l.rentCostMxn, 0);
  const mantenimiento = -locations.reduce((s, l) => s + l.maintenanceCostMxn, 0);

  return {
    serviciosTargeted, serviciosSignature, addOns, retail, descuentos, reembolsos,
    backbarTeorico, costoRetailVendido, cortesias, merma, nominaBase, cargasSociales,
    comisionesServicio, comisionesRetail, renta, mantenimiento,
  };
}

// ---------------------------------------------------------------------------
// Rate metrics — computed as a real level over a real date range, never
// derived/projected. With almost no transaction history yet, most of these
// read 0 outside "Mes en curso" — that's correct, not a bug.
// ---------------------------------------------------------------------------

export async function getOccupancyPct(locationIds: string[], range: DateRange): Promise<number | null> {
  if (locationIds.length === 0) return null;
  const [rooms, appointments] = await Promise.all([
    prisma.room.count({ where: { locationId: { in: locationIds } } }),
    prisma.appointment.findMany({
      where: { locationId: { in: locationIds }, startAt: { gte: range.start, lt: range.end }, status: { notIn: ["CANCELLED", "NO_SHOW"] } },
    }),
  ]);
  if (rooms === 0) return null;
  const bookedMinutes = appointments.reduce((s, a) => s + (a.endAt.getTime() - a.startAt.getTime()) / 60000, 0);
  const openHoursPerDay = 8; // 9:00-17:00, matches CALENDAR_HOURS
  const days = Math.max(1, Math.round((range.end.getTime() - range.start.getTime()) / 86400000));
  const availableMinutes = rooms * openHoursPerDay * 60 * days;
  if (availableMinutes === 0) return null;
  return Math.round((bookedMinutes / availableMinutes) * 100);
}

export async function getAttachRetailPct(locationIds: string[], range: DateRange): Promise<number | null> {
  if (locationIds.length === 0) return null;
  const sales = await prisma.sale.findMany({
    where: { locationId: { in: locationIds }, createdAt: { gte: range.start, lt: range.end }, appointmentId: { not: null } },
    include: { lineItems: true },
  });
  if (sales.length === 0) return null;
  const withRetail = sales.filter((s) => s.lineItems.some((l) => l.type === "RETAIL")).length;
  return Math.round((withRetail / sales.length) * 100);
}

export async function getIngresoHoraEsteticista(locationIds: string[], range: DateRange): Promise<number | null> {
  if (locationIds.length === 0) return null;
  const lineItems = await prisma.saleLineItem.findMany({
    where: {
      type: { in: ["SERVICE", "ADD_ON"] },
      sale: { locationId: { in: locationIds }, createdAt: { gte: range.start, lt: range.end } },
    },
  });
  if (lineItems.length === 0) return null;
  const revenue = lineItems.reduce((s, l) => s + l.priceMxn, 0);
  const appointments = await prisma.appointment.findMany({
    where: { locationId: { in: locationIds }, startAt: { gte: range.start, lt: range.end }, status: { notIn: ["CANCELLED", "NO_SHOW"] } },
  });
  const hours = appointments.reduce((s, a) => s + (a.endAt.getTime() - a.startAt.getTime()) / 3600000, 0);
  if (hours === 0) return null;
  return Math.round(revenue / hours);
}

// Rebooking and 90-day retention both need months of real appointment
// history to mean anything — with the system just launched, they always
// read "sin datos" rather than a misleading 0%. Kept here as named no-ops
// (not silently dropped) so wiring them up later is a one-function change.
export async function getRebookingPct(): Promise<number | null> {
  return null;
}
export async function getRetention90dPct(): Promise<number | null> {
  return null;
}
