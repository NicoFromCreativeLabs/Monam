import "server-only";
import { prisma } from "@/lib/prisma";
import { CARGAS_SOCIALES_RATIO, type PnlBreakdown } from "@/lib/pnl-math";
import { monthsInRange, type DateRange } from "@/lib/period-range";

export type { PnlBreakdown } from "@/lib/pnl-math";
export { PERIOD_OPTIONS, periodRange, compareRange, type Period, type CompareTo, type DateRange } from "@/lib/period-range";

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
      paquetesVencidos: 0, insumosAddOns: 0, comisionTerminal: 0, operacionLocal: 0, marketingLocal: 0,
      depositosReservaciones: 0, comisionStripe: 0,
    };
  }

  const saleWhere = { locationId: { in: locationIds }, createdAt: { gte: range.start, lt: range.end } };

  const [lineItems, sales, approvals, commissions, inventoryTxns, locations, activeStaff] = await Promise.all([
    prisma.saleLineItem.findMany({
      where: { sale: saleWhere },
      include: { protocol: true, addOn: true },
    }),
    prisma.sale.findMany({ where: saleWhere }),
    prisma.approvalRequest.findMany({
      where: {
        status: "APPROVED",
        decidedAt: { gte: range.start, lt: range.end },
        type: { in: ["REFUND", "COMP"] },
        // Tied to a sale: that sale's location. Not tied to one: counted everywhere, as before.
        OR: [{ sale: { is: { locationId: { in: locationIds } } } }, { saleId: null }],
      },
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

  // Insumos de add-ons: the product cost of every add-on sold in the period.
  const insumosAddOns = -lineItems
    .filter((l) => l.type === "ADD_ON")
    .reduce((s, l) => s + (l.addOn?.costMxn ?? 0), 0);

  // Deposits for reservations: collected in the period (and attached to an
  // appointment at one of these locations) minus those applied to charges in
  // the period. Net on purpose — a deposit that is later credited to a service
  // is already inside that service's price, so adding it in full would count
  // the money twice.
  const deposits = await prisma.deposit.findMany({
    where: {
      collectedAt: { gte: range.start, lt: range.end },
      status: { in: ["HELD", "CREDITED", "FORFEITED"] },
      appointment: { is: { locationId: { in: locationIds } } },
    },
    select: { amountMxn: true, provider: true },
  });
  const depositsCollected = deposits.reduce((s, d) => s + d.amountMxn, 0);
  const depositsApplied = -sales.reduce((s, sale) => s + sale.depositCreditMxn, 0);
  const depositosReservaciones = depositsCollected - depositsApplied;

  // Payment fees, with the rates set in Configuración (0 until set):
  //  - Comisión de terminal: % of what was paid on the card terminal.
  //  - Comisión de Stripe: % plus a fixed amount per payment, on online sales
  //    and on deposits paid through Stripe.
  const feeRows = await prisma.setting.findMany({
    where: { key: { in: ["pnl.terminalFeePct", "pnl.stripeFeePct", "pnl.stripeFixedFeeMxn"] } },
  });
  const feeNumber = (key: string) => {
    const v = feeRows.find((r) => r.key === key)?.value;
    return typeof v === "number" ? v : 0;
  };
  const cardPaid = sales.filter((sale) => sale.paymentMethod === "CARD").reduce((s, sale) => s + sale.totalMxn, 0);
  const comisionTerminal = -Math.round((cardPaid * feeNumber("pnl.terminalFeePct")) / 100);
  const onlineSales = sales.filter((sale) => sale.paymentMethod === "ONLINE");
  const stripeDeposits = deposits.filter((d) => d.provider === "STRIPE");
  const stripeBase = onlineSales.reduce((s, sale) => s + sale.totalMxn, 0) + stripeDeposits.reduce((s, d) => s + d.amountMxn, 0);
  const stripeCount = onlineSales.length + stripeDeposits.length;
  const comisionStripe = -Math.round(
    (stripeBase * feeNumber("pnl.stripeFeePct")) / 100 + stripeCount * feeNumber("pnl.stripeFixedFeeMxn"),
  );

  const merma = inventoryTxns.reduce((s, t) => s + Math.abs(t.qtyDelta) * (t.inventoryItem.costMxn ?? 0), 0) * -1;

  // Payroll, cargas sociales, rent and maintenance are recorded as flat
  // monthly amounts (on AppUser/Location), not as dated transactions, so
  // they're prorated by how many calendar months the range covers instead of
  // being added in once regardless of range length.
  const months = monthsInRange(range);
  const nominaBase = -Math.round(activeStaff.reduce((s, u) => s + (u.salaryMxn ?? 0), 0) * months);
  const cargasSociales = Math.round(nominaBase * CARGAS_SOCIALES_RATIO);
  const comisionesServicio = -commissions
    .filter((c) => c.basis === "SERVICE" || c.basis === "ADD_ON")
    .reduce((s, c) => s + c.commissionMxn, 0);
  const comisionesRetail = -commissions.filter((c) => c.basis === "RETAIL").reduce((s, c) => s + c.commissionMxn, 0);

  const renta = -Math.round(locations.reduce((s, l) => s + l.rentCostMxn, 0) * months);
  const mantenimiento = -Math.round(locations.reduce((s, l) => s + l.maintenanceCostMxn, 0) * months);

  return {
    serviciosTargeted, serviciosSignature, addOns, retail, descuentos, reembolsos,
    backbarTeorico, costoRetailVendido, cortesias, merma, nominaBase, cargasSociales,
    comisionesServicio, comisionesRetail, renta, mantenimiento,
    paquetesVencidos: 0, insumosAddOns, comisionTerminal, operacionLocal: 0, marketingLocal: 0,
    depositosReservaciones, comisionStripe,
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

// No-show rate over appointments whose time has already passed (booked-but-
// still-upcoming statuses don't belong in the denominator — they haven't
// had a chance to no-show yet).
const RESOLVED_STATUSES = ["COMPLETED", "NO_SHOW", "LATE", "IN_PROGRESS"] as ("COMPLETED" | "NO_SHOW" | "LATE" | "IN_PROGRESS")[];
export async function getNoShowPct(locationIds: string[], range: DateRange): Promise<number | null> {
  if (locationIds.length === 0) return null;
  const appointments = await prisma.appointment.findMany({
    where: { locationId: { in: locationIds }, startAt: { gte: range.start, lt: range.end }, status: { in: RESOLVED_STATUSES } },
    select: { status: true },
  });
  if (appointments.length === 0) return null;
  const noShows = appointments.filter((a) => a.status === "NO_SHOW").length;
  return Math.round((noShows / appointments.length) * 100);
}

// "Cancelaciones < 24h" needs to compare WHEN a booking was cancelled to its
// start time — Appointment only has a status, no cancelledAt timestamp, so
// there is nothing real to compute yet. Named no-op (reads "sin datos"),
// same as getRebookingPct above, until that column exists.
export async function getCancellationWithin24hPct(): Promise<number | null> {
  return null;
}

// Average weekly gap-hours between consecutive bookings in the same room
// (idle cabina time within the open window) — real schedule gaps, not a
// derived/projected figure. Only counts gaps between two real bookings, not
// the dead time before the first or after the last booking of the day.
export async function getDeadHoursPerWeek(locationIds: string[], range: DateRange): Promise<number | null> {
  if (locationIds.length === 0) return null;
  const appointments = await prisma.appointment.findMany({
    where: { locationId: { in: locationIds }, startAt: { gte: range.start, lt: range.end }, status: { notIn: ["CANCELLED"] } },
    select: { roomId: true, startAt: true, endAt: true },
    orderBy: { startAt: "asc" },
  });
  if (appointments.length < 2) return null;

  const byRoomDay = new Map<string, typeof appointments>();
  for (const a of appointments) {
    const key = `${a.roomId}:${a.startAt.toISOString().slice(0, 10)}`;
    const list = byRoomDay.get(key) ?? [];
    list.push(a);
    byRoomDay.set(key, list);
  }

  let gapMinutes = 0;
  for (const list of byRoomDay.values()) {
    for (let i = 1; i < list.length; i++) {
      const gap = (list[i].startAt.getTime() - list[i - 1].endAt.getTime()) / 60000;
      if (gap > 0) gapMinutes += gap;
    }
  }

  const weeks = Math.max(1 / 7, (range.end.getTime() - range.start.getTime()) / (7 * 24 * 60 * 60 * 1000));
  return Math.round((gapMinutes / 60 / weeks) * 10) / 10;
}

// ---------------------------------------------------------------------------
// Análisis · Capacidad detail cards — forward-looking (próximos 7 días,
// esta semana), so these read real Appointment/StaffShift rows directly
// instead of taking a Periodo range, same reasoning as getWeeklyRevenueTrend
// above: the card's own title already fixes its window.
// ---------------------------------------------------------------------------

export interface RoomOccupancyDay {
  day: string;
  roomsBooked: number; // booked minutes that day (ratio-compatible with roomsTotal, not a literal room count)
  roomsTotal: number; // available minutes that day
}

export async function getRoomOccupancyNext7Days(locationIds: string[]): Promise<RoomOccupancyDay[]> {
  const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  if (locationIds.length === 0) return [];
  const rooms = await prisma.room.count({ where: { locationId: { in: locationIds } } });
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  const appointments = await prisma.appointment.findMany({
    where: { locationId: { in: locationIds }, startAt: { gte: start, lt: end }, status: { notIn: ["CANCELLED"] } },
    select: { startAt: true, endAt: true },
  });
  const openHoursPerDay = 8; // 9:00-17:00, matches CALENDAR_HOURS
  const availableMinutes = Math.max(1, rooms * openHoursPerDay * 60);

  const days: RoomOccupancyDay[] = [];
  for (let i = 0; i < 7; i++) {
    const dayStart = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    const bookedMinutes = appointments
      .filter((a) => a.startAt >= dayStart && a.startAt < dayEnd)
      .reduce((s, a) => s + (a.endAt.getTime() - a.startAt.getTime()) / 60000, 0);
    days.push({ day: DAY_LABELS[dayStart.getDay()], roomsBooked: Math.round(bookedMinutes), roomsTotal: availableMinutes });
  }
  return days;
}

export interface EstheticianOccupancy {
  name: string;
  location: string;
  hoursBooked: number;
  hoursAvailable: number;
}

// "Available" hours come from real clocked StaffShift rows (check-in to
// check-out, or to now for a still-open shift), not an assumed 40h/week —
// a part-timer or a studio that just opened reads its real hours, including
// zero, rather than a number nobody configured.
export async function getEstheticianOccupancyThisWeek(locationIds: string[]): Promise<EstheticianOccupancy[]> {
  if (locationIds.length === 0) return [];
  const now = new Date();
  const dow = now.getDay(); // 0 = Sunday
  const diffToMonday = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday);
  const nextMonday = new Date(monday.getTime() + 7 * 24 * 60 * 60 * 1000);

  const staff = await prisma.appUser.findMany({
    where: { status: "ACTIVE", role: "ESTHETICIAN", locationAssignments: { some: { locationId: { in: locationIds } } } },
    include: { locationAssignments: { include: { location: true } } },
  });
  if (staff.length === 0) return [];
  const staffIds = staff.map((s) => s.id);

  const [appointments, shifts] = await Promise.all([
    prisma.appointment.findMany({
      where: { estheticianId: { in: staffIds }, startAt: { gte: monday, lt: nextMonday }, status: { notIn: ["CANCELLED", "NO_SHOW"] } },
      select: { estheticianId: true, startAt: true, endAt: true },
    }),
    prisma.staffShift.findMany({
      where: { userId: { in: staffIds }, kind: "ESTHETICIAN", checkInAt: { gte: monday, lt: nextMonday } },
      select: { userId: true, checkInAt: true, checkOutAt: true },
    }),
  ]);

  return staff
    .map((s) => {
      const hoursBooked = appointments
        .filter((a) => a.estheticianId === s.id)
        .reduce((sum, a) => sum + (a.endAt.getTime() - a.startAt.getTime()) / 3600000, 0);
      const hoursAvailable = shifts
        .filter((sh) => sh.userId === s.id)
        .reduce((sum, sh) => {
          const end = sh.checkOutAt ?? new Date(Math.min(now.getTime(), nextMonday.getTime()));
          return sum + Math.max(0, (end.getTime() - sh.checkInAt.getTime()) / 3600000);
        }, 0);
      const locationNames = s.locationAssignments.map((a) => a.location.name);
      const location = locationNames.length > 1 ? "Ambas" : (locationNames[0] ?? "—");
      return {
        name: s.name,
        location,
        hoursBooked: Math.round(hoursBooked * 10) / 10,
        hoursAvailable: Math.round(hoursAvailable * 10) / 10,
      };
    })
    .filter((e) => e.hoursAvailable > 0 || e.hoursBooked > 0);
}

// ---------------------------------------------------------------------------
// Análisis · Ventas detail — revenue by category, 8-week trend, and
// protocol-level revenue/margin, plus the Nivel 2 mix/ticket KPIs. All real
// Sale/SaleLineItem aggregation (replacing the mocked category/trend/
// protocol cards and nivel2 KPIs that used to live on this page).
// ---------------------------------------------------------------------------

export interface VentasCategoryRevenue {
  category: string;
  amount: number;
}
export interface VentasWeeklyPoint {
  week: string;
  revenue: number;
}
export interface VentasProtocolRow {
  protocol: string;
  tier: string;
  timesPerformed: number;
  revenue: number;
  cost: number;
}
export interface VentasNivel2 {
  servicioPct: number;
  retailPct: number;
  paquetesPct: number;
  addOnsPct: number;
  targetedPct: number;
  signaturePct: number;
  descuentosPct: number;
  ticketPorVisita: number | null;
}
export interface VentasDetail {
  revenueByCategory: VentasCategoryRevenue[];
  protocolPerformance: VentasProtocolRow[];
  nivel2: VentasNivel2;
}

export async function getVentasDetail(locationIds: string[], range: DateRange): Promise<VentasDetail> {
  const empty: VentasDetail = {
    revenueByCategory: [
      { category: "Servicios — Targeted", amount: 0 },
      { category: "Servicios — Signature", amount: 0 },
      { category: "Retail", amount: 0 },
      { category: "Paquetes", amount: 0 },
    ],
    protocolPerformance: [],
    nivel2: {
      servicioPct: 0, retailPct: 0, paquetesPct: 0, addOnsPct: 0,
      targetedPct: 0, signaturePct: 0, descuentosPct: 0, ticketPorVisita: null,
    },
  };
  if (locationIds.length === 0) return empty;

  const saleWhere = { locationId: { in: locationIds }, createdAt: { gte: range.start, lt: range.end } };
  const [lineItems, sales] = await Promise.all([
    prisma.saleLineItem.findMany({ where: { sale: saleWhere }, include: { protocol: true } }),
    prisma.sale.findMany({ where: saleWhere }),
  ]);

  const serviciosTargeted = lineItems
    .filter((l) => l.type === "SERVICE" && l.protocol?.tier === "TARGETED")
    .reduce((s, l) => s + l.priceMxn, 0);
  const serviciosSignature = lineItems
    .filter((l) => l.type === "SERVICE" && l.protocol?.tier === "SIGNATURE")
    .reduce((s, l) => s + l.priceMxn, 0);
  const addOns = lineItems.filter((l) => l.type === "ADD_ON").reduce((s, l) => s + l.priceMxn, 0);
  const retail = lineItems.filter((l) => l.type === "RETAIL").reduce((s, l) => s + l.priceMxn, 0);
  const paquetes = lineItems.filter((l) => l.type === "PACKAGE").reduce((s, l) => s + l.priceMxn, 0);

  const revenueByCategory: VentasCategoryRevenue[] = [
    { category: "Servicios — Targeted", amount: serviciosTargeted },
    { category: "Servicios — Signature", amount: serviciosSignature },
    { category: "Retail", amount: retail },
    { category: "Paquetes", amount: paquetes },
  ];

  const byProtocol = new Map<string, VentasProtocolRow>();
  for (const li of lineItems) {
    if (li.type !== "SERVICE" || !li.protocol) continue;
    const row = byProtocol.get(li.protocol.id) ?? {
      protocol: li.protocol.name,
      tier: li.protocol.tier === "TARGETED" ? "Targeted" : "Signature",
      timesPerformed: 0,
      revenue: 0,
      cost: 0,
    };
    row.timesPerformed += 1;
    row.revenue += li.priceMxn;
    row.cost += li.protocol.costMxn;
    byProtocol.set(li.protocol.id, row);
  }
  const protocolPerformance = [...byProtocol.values()].sort((a, b) => b.revenue - a.revenue);

  const servicio = serviciosTargeted + serviciosSignature;
  const mezclaTotal = servicio + retail + paquetes + addOns;
  const descuentos = sales.reduce((s, sale) => s + sale.discountMxn, 0);
  const subtotalBruto = sales.reduce((s, sale) => s + sale.subtotalMxn, 0);
  const ticketPorVisita = sales.length
    ? Math.round(sales.reduce((s, sale) => s + sale.totalMxn, 0) / sales.length)
    : null;

  const nivel2: VentasNivel2 = {
    servicioPct: mezclaTotal ? Math.round((servicio / mezclaTotal) * 100) : 0,
    retailPct: mezclaTotal ? Math.round((retail / mezclaTotal) * 100) : 0,
    paquetesPct: mezclaTotal ? Math.round((paquetes / mezclaTotal) * 100) : 0,
    addOnsPct: mezclaTotal ? Math.round((addOns / mezclaTotal) * 100) : 0,
    targetedPct: servicio ? Math.round((serviciosTargeted / servicio) * 100) : 0,
    signaturePct: servicio ? Math.round((serviciosSignature / servicio) * 100) : 0,
    descuentosPct: subtotalBruto ? Math.round((descuentos / subtotalBruto) * 1000) / 10 : 0,
    ticketPorVisita,
  };

  return { revenueByCategory, protocolPerformance, nivel2 };
}

// Weekly revenue trend always covers the 8 most recent calendar weeks ending
// today, independent of the Periodo filter (matching the card's own "últimas
// 8 semanas" title) — a single query bucketed in JS rather than 8 round trips.
export async function getWeeklyRevenueTrend(locationIds: string[]): Promise<VentasWeeklyPoint[]> {
  if (locationIds.length === 0) return Array.from({ length: 8 }, (_, i) => ({ week: `Sem ${i + 1}`, revenue: 0 }));
  const now = new Date();
  const start = new Date(now.getTime() - 8 * 7 * 24 * 60 * 60 * 1000);
  const sales = await prisma.sale.findMany({
    where: { locationId: { in: locationIds }, createdAt: { gte: start, lt: now } },
    select: { totalMxn: true, createdAt: true },
  });
  const buckets = Array.from({ length: 8 }, () => 0);
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  for (const s of sales) {
    const idx = Math.min(7, Math.floor((s.createdAt.getTime() - start.getTime()) / weekMs));
    buckets[idx] += s.totalMxn;
  }
  return buckets.map((revenue, i) => ({ week: `Sem ${i + 1}`, revenue }));
}

// ---------------------------------------------------------------------------
// Análisis · Clientas detail — real Client/Appointment/ClientSkinId/
// PackagePurchase aggregation. Client has no locationId of its own, so
// "belongs to this location" means "had at least one non-cancelled
// appointment here in the window" — there is no other real way to scope a
// client list by location.
// ---------------------------------------------------------------------------

export interface ClientasDetail {
  newPct: number | null;
  returningPct: number | null;
  visitsPerMonth: number | null;
  skinIdCompletePct: number | null;
  outstandingPrepaidLiabilityMxn: number;
}

export async function getClientasDetail(locationIds: string[], range: DateRange): Promise<ClientasDetail> {
  const empty: ClientasDetail = { newPct: null, returningPct: null, visitsPerMonth: null, skinIdCompletePct: null, outstandingPrepaidLiabilityMxn: 0 };
  if (locationIds.length === 0) return empty;

  const appointments = await prisma.appointment.findMany({
    where: { locationId: { in: locationIds }, startAt: { gte: range.start, lt: range.end }, status: { notIn: ["CANCELLED"] } },
    select: { clientId: true, status: true },
  });
  const clientIds = [...new Set(appointments.map((a) => a.clientId))];

  // Prepaid-package liability isn't location-scoped (PackagePurchase has no
  // locationId), so it's computed once, globally, regardless of Local.
  const activePurchases = await prisma.packagePurchase.findMany({
    where: { OR: [{ expiresOn: null }, { expiresOn: { gt: new Date() } }] },
    include: { packageOption: true },
  });
  const outstandingPrepaidLiabilityMxn = activePurchases.reduce((sum, p) => {
    const remaining = Math.max(0, p.packageOption.sessions - p.sessionsUsed);
    const perSession = p.packageOption.sessions > 0 ? p.packageOption.priceMxn / p.packageOption.sessions : 0;
    return sum + Math.round(remaining * perSession);
  }, 0);

  if (clientIds.length === 0) return { ...empty, outstandingPrepaidLiabilityMxn };

  // "Nueva" = this client's very first-ever (non-cancelled) appointment at
  // one of these locations falls inside this range; "recurrente" = she had
  // one before it.
  const firstAppointments = await prisma.appointment.groupBy({
    by: ["clientId"],
    where: { clientId: { in: clientIds }, locationId: { in: locationIds }, status: { notIn: ["CANCELLED"] } },
    _min: { startAt: true },
  });
  const firstByClient = new Map(firstAppointments.map((f) => [f.clientId, f._min.startAt]));
  const newCount = clientIds.filter((id) => {
    const first = firstByClient.get(id);
    return first !== null && first !== undefined && first >= range.start && first < range.end;
  }).length;
  const newPct = Math.round((newCount / clientIds.length) * 100);

  const completed = appointments.filter((a) => a.status === "COMPLETED").length;
  const months = Math.max(1 / 30, monthsInRange(range));
  const visitsPerMonth = Math.round((completed / clientIds.length / months) * 10) / 10;

  const skinIdCount = await prisma.clientSkinId.count({ where: { clientId: { in: clientIds }, skinType: { not: null } } });
  const skinIdCompletePct = Math.round((skinIdCount / clientIds.length) * 100);

  return { newPct, returningPct: 100 - newPct, visitsPerMonth, skinIdCompletePct, outstandingPrepaidLiabilityMxn };
}

// ---------------------------------------------------------------------------
// Análisis · Retail detail — real SaleLineItem/RetailRecommendationTag/
// InventoryItem aggregation.
// ---------------------------------------------------------------------------

export interface RetailDetail {
  unidadesPorTicket: number | null;
  conversionProtocoloProducto: number | null; // % of same-day esthetician product tags that were actually bought
  sellThroughPct: number | null; // units sold in range ÷ (units sold + units still in stock)
  skusConInventario: number;
  retailMarginPct: number | null; // real transactional margin: (revenue − COGS) ÷ revenue, not a catalog average
}

export async function getRetailDetail(locationIds: string[], range: DateRange): Promise<RetailDetail> {
  const empty: RetailDetail = {
    unidadesPorTicket: null, conversionProtocoloProducto: null, sellThroughPct: null, skusConInventario: 0, retailMarginPct: null,
  };
  if (locationIds.length === 0) return empty;

  const saleWhere = { locationId: { in: locationIds }, createdAt: { gte: range.start, lt: range.end } };
  const retailLines = await prisma.saleLineItem.findMany({ where: { type: "RETAIL", sale: saleWhere }, select: { saleId: true, priceMxn: true, productId: true } });

  const unidadesPorTicket = retailLines.length
    ? Math.round((retailLines.length / new Set(retailLines.map((l) => l.saleId)).size) * 10) / 10
    : null;

  const revenue = retailLines.reduce((s, l) => s + l.priceMxn, 0);
  const productIds = [...new Set(retailLines.map((l) => l.productId).filter((id): id is string => !!id))];
  const inventoryItems = await prisma.inventoryItem.findMany({ where: { locationId: { in: locationIds }, productId: { in: productIds } } });
  const costByProduct = new Map(inventoryItems.map((i) => [i.productId, i.costMxn ?? 0]));
  const cogs = retailLines.reduce((s, l) => s + (l.productId ? (costByProduct.get(l.productId) ?? 0) : 0), 0);
  const retailMarginPct = revenue ? Math.round((1 - cogs / revenue) * 100) : null;

  const tags = await prisma.retailRecommendationTag.findMany({
    where: { taggedAt: { gte: range.start, lt: range.end }, treatmentRecord: { appointment: { locationId: { in: locationIds } } } },
    include: { saleLineItems: { select: { id: true } } },
  });
  const conversionProtocoloProducto = tags.length
    ? Math.round((tags.filter((t) => t.saleLineItems.length > 0).length / tags.length) * 100)
    : null;

  const retailInventoryAll = await prisma.inventoryItem.findMany({
    where: { locationId: { in: locationIds }, product: { ledger: "RETAIL" } },
    select: { qty: true, productId: true },
  });
  const skusConInventario = new Set(retailInventoryAll.map((i) => i.productId)).size;
  const unitsInStock = retailInventoryAll.reduce((s, i) => s + i.qty, 0);
  const unitsSold = retailLines.length;
  const sellThroughPct = unitsSold + unitsInStock > 0 ? Math.round((unitsSold / (unitsSold + unitsInStock)) * 100) : null;

  return { unidadesPorTicket, conversionProtocoloProducto, sellThroughPct, skusConInventario, retailMarginPct };
}

// ---------------------------------------------------------------------------
// Análisis · Equipo detail — real CommissionEntry aggregation, per person.
// ---------------------------------------------------------------------------

export interface EquipoCommissionRow {
  name: string;
  role: string;
  service: number;
  retail: number;
  total: number;
}

export async function getEquipoCommissions(locationIds: string[], range: DateRange): Promise<EquipoCommissionRow[]> {
  if (locationIds.length === 0) return [];
  const entries = await prisma.commissionEntry.findMany({
    where: { createdAt: { gte: range.start, lt: range.end }, sale: { is: { locationId: { in: locationIds } } } },
    include: { user: true },
  });
  const ROLE_LABEL: Record<string, string> = { OWNER: "Admin", FRONT_DESK: "Recepción", ESTHETICIAN: "Esteticista", CLINIC_MANAGER: "Gerente de clínica" };
  const byUser = new Map<string, EquipoCommissionRow>();
  for (const e of entries) {
    const row = byUser.get(e.userId) ?? { name: e.user.name, role: ROLE_LABEL[e.user.role] ?? e.user.role, service: 0, retail: 0, total: 0 };
    if (e.basis === "RETAIL") row.retail += e.commissionMxn;
    else row.service += e.commissionMxn;
    row.total += e.commissionMxn;
    byUser.set(e.userId, row);
  }
  return [...byUser.values()].sort((a, b) => b.total - a.total);
}
