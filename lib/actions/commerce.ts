"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireStaffRole } from "@/lib/auth/dal";
import type { Role } from "@/lib/generated/prisma/client";

const FRONT_DESK_ROLES: Role[] = ["FRONT_DESK", "OWNER", "CLINIC_MANAGER"];
const MANAGER_ROLES: Role[] = ["OWNER", "CLINIC_MANAGER"];

const CHECKOUT_PATHS = [
  "/staff/checkout",
  "/staff",
  "/staff/check-in",
  "/admin/calendar",
  "/admin/sales",
  "/admin/commissions",
  "/admin/inventory",
  "/admin/control",
  "/admin",
];

function revalidateCheckout() {
  for (const path of CHECKOUT_PATHS) revalidatePath(path);
}

async function createAlert(text: string, severity: "INFO" | "WARNING", sourceType: string, sourceId?: string) {
  await prisma.alert.create({ data: { text, severity, sourceType, sourceId } });
}

// Anomalías (Control tab) is a dedicated AnomalyFlag table, separate from
// Alert (Panel's operational notification stream) — Descuento inusual,
// Reembolso inusual, Merma, and Comisión reasignada manualmente all land
// here, matching Control's own on-page description of where each comes from.
async function createAnomalyFlag(type: string, detail: string, relatedEntity?: string) {
  await prisma.anomalyFlag.create({ data: { type, detail, relatedEntity } });
}

async function getSettingNumber(key: string, fallback: number): Promise<number> {
  const row = await prisma.setting.findUnique({ where: { key } });
  if (!row) return fallback;
  const value = row.value as unknown;
  return typeof value === "number" ? value : fallback;
}

// ---------------------------------------------------------------------------
// Checkout — the "Cobrar" button in StaffCheckoutView. Two flows share this:
// a specific appointment's ticket (service + any recommended/added retail),
// or a walk-in retail-only sale with no appointment/client attached.
// ---------------------------------------------------------------------------

export interface RetailLineInput {
  sku: string;
  qty: number;
}

export interface CreateSaleInput {
  appointmentId?: string | null;
  locationName: string;
  retailItems: RetailLineInput[];
  reAddedAfterRemovalSkus: string[]; // re-added after the recommendation was removed — commission goes to whoever closes the sale, not the original tagger
  paymentMethod: "CASH" | "CARD" | "SPEI";
}

export type CreateSaleResult = { error: string } | { saleId: string; totalMxn: number };

// All prices/attribution are re-derived server-side from real rows (the
// appointment's protocol, the location's InventoryItem.priceMxn, the
// treatment's RetailRecommendationTag) rather than trusting client-supplied
// numbers — this handles real money.
export async function createSaleAction(input: CreateSaleInput): Promise<CreateSaleResult> {
  const staff = await requireStaffRole(FRONT_DESK_ROLES);

  const location = await prisma.location.findFirst({ where: { name: input.locationName } });
  if (!location) return { error: "Sucursal no encontrada." };

  let appointment: Awaited<ReturnType<typeof loadAppointmentForCheckout>> = null;
  if (input.appointmentId) {
    appointment = await loadAppointmentForCheckout(input.appointmentId);
    if (!appointment) return { error: "Cita no encontrada." };
    if (appointment.sale) return { error: "Esta cita ya fue cobrada." };
    if (!appointment.treatmentRecord) return { error: "El tratamiento no se ha completado." };
  }

  const skus = input.retailItems.filter((r) => r.qty > 0).map((r) => r.sku);
  const inventoryItems = skus.length
    ? await prisma.inventoryItem.findMany({
        where: { locationId: location.id, product: { sku: { in: skus }, isActive: true } },
        include: { product: true },
      })
    : [];
  const itemBySku = new Map(inventoryItems.map((i) => [i.product.sku, i]));

  for (const line of input.retailItems) {
    if (line.qty <= 0) continue;
    const item = itemBySku.get(line.sku);
    if (!item || item.qty < line.qty) {
      return { error: `Sin existencia suficiente de ${line.sku}.` };
    }
  }

  const tagByProductId = new Map(
    (appointment?.treatmentRecord?.retailTags ?? []).map((t) => [t.productId, t]),
  );

  const servicePrice = appointment?.protocol?.priceMxn ?? 0;
  const retailTotal = input.retailItems.reduce((sum, line) => {
    const item = itemBySku.get(line.sku);
    return sum + (item?.priceMxn ?? 0) * line.qty;
  }, 0);
  const subtotal = servicePrice + retailTotal;
  const depositCreditMxn =
    appointment?.deposit && appointment.deposit.status === "HELD" ? -appointment.deposit.amountMxn : 0;
  const totalMxn = Math.max(0, subtotal + depositCreditMxn);

  const commissionRules = await prisma.commissionRule.findMany({ where: { isActive: true } });
  function findRule(basis: "SERVICE" | "ADD_ON" | "RETAIL" | "PACKAGE", role: Role) {
    return (
      commissionRules.find((r) => r.basis === basis && r.role === role) ??
      commissionRules.find((r) => r.basis === basis && r.role === null)
    );
  }

  const sale = await prisma.$transaction(async (tx) => {
    const created = await tx.sale.create({
      data: {
        location: { connect: { id: location.id } },
        closedBy: { connect: { id: staff.id } },
        ...(appointment?.clientId ? { client: { connect: { id: appointment.clientId } } } : {}),
        ...(appointment?.id ? { appointment: { connect: { id: appointment.id } } } : {}),
        subtotalMxn: subtotal,
        depositCreditMxn,
        totalMxn,
        paymentMethod: input.paymentMethod,
      },
    });

    if (appointment?.protocol && appointment.treatmentRecord) {
      const lineItem = await tx.saleLineItem.create({
        data: {
          saleId: created.id,
          type: "SERVICE",
          protocolId: appointment.protocol.id,
          performedByUserId: appointment.treatmentRecord.estheticianId,
          priceMxn: servicePrice,
        },
      });
      const esthetician = await tx.appUser.findUnique({
        where: { id: appointment.treatmentRecord.estheticianId },
      });
      const rule = esthetician && findRule("SERVICE", esthetician.role);
      if (rule && esthetician) {
        const commissionMxn = Math.round((servicePrice * rule.rateOrAmount) / 100);
        await tx.commissionEntry.create({
          data: {
            userId: esthetician.id,
            saleLineItemId: lineItem.id,
            saleId: created.id,
            basis: "SERVICE",
            baseAmountMxn: servicePrice,
            ratePct: rule.rateOrAmount,
            commissionMxn,
          },
        });
      }
    }

    for (const line of input.retailItems) {
      if (line.qty <= 0) continue;
      const item = itemBySku.get(line.sku)!;
      const tag = tagByProductId.get(item.productId);
      const wasReAdded = input.reAddedAfterRemovalSkus.includes(line.sku);

      for (let i = 0; i < line.qty; i++) {
        const lineItem = await tx.saleLineItem.create({
          data: {
            saleId: created.id,
            type: "RETAIL",
            productId: item.productId,
            recommendationTagId: tag?.id,
            priceMxn: item.priceMxn ?? 0,
          },
        });

        await tx.inventoryTransaction.create({
          data: {
            inventoryItemId: item.id,
            type: "SALE_DEDUCTION",
            qtyDelta: -1,
            reason: `Venta ${created.id}`,
          },
        });

        // Default attribution: same-day tag match → tagging esthetician;
        // otherwise whoever closed the sale (spec §5.4). A re-add after the
        // recommendation was removed always goes to the closer, recorded as
        // an explicit override rather than the silent default.
        const taggerId = tag?.treatmentRecord.estheticianId;
        const sameDay = tag
          ? tag.taggedAt.toDateString() === created.createdAt.toDateString()
          : false;
        const attributedId = wasReAdded ? staff.id : sameDay && taggerId ? taggerId : staff.id;
        const attributedUser = await tx.appUser.findUnique({ where: { id: attributedId } });
        const rule = attributedUser && findRule("RETAIL", attributedUser.role);
        if (rule && attributedUser) {
          const commissionMxn = Math.round(((item.priceMxn ?? 0) * rule.rateOrAmount) / 100);
          await tx.commissionEntry.create({
            data: {
              userId: attributedUser.id,
              saleLineItemId: lineItem.id,
              saleId: created.id,
              basis: "RETAIL",
              baseAmountMxn: item.priceMxn ?? 0,
              ratePct: rule.rateOrAmount,
              commissionMxn,
              isOverride: wasReAdded && !!taggerId,
              overriddenFromUserId: wasReAdded ? taggerId : null,
              overrideReason: wasReAdded
                ? "Producto re-agregado al ticket tras quitar la recomendación original."
                : null,
            },
          });
        }

        await tx.inventoryItem.update({ where: { id: item.id }, data: { qty: { decrement: 1 } } });
        itemBySku.set(line.sku, { ...item, qty: item.qty - 1 });
      }
    }

    if (appointment?.deposit && depositCreditMxn !== 0) {
      await tx.deposit.update({
        where: { id: appointment.deposit.id },
        data: { status: "CREDITED", creditedSaleId: created.id },
      });
    }

    const openSession = await tx.cashRegisterSession.findFirst({
      where: { locationId: location.id, status: "OPEN" },
    });
    if (openSession) {
      await tx.sale.update({ where: { id: created.id }, data: { cashRegisterSessionId: openSession.id } });
    }

    return created;
  });

  if (input.reAddedAfterRemovalSkus.length > 0) {
    await createAnomalyFlag(
      "Comisión reasignada manualmente",
      `Venta ${sale.id} — producto re-agregado al ticket tras quitar la recomendación.`,
      sale.id,
    );
  }

  revalidateCheckout();
  return { saleId: sale.id, totalMxn };
}

async function loadAppointmentForCheckout(appointmentId: string) {
  return prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      client: true,
      protocol: true,
      deposit: true,
      sale: true,
      treatmentRecord: { include: { retailTags: { include: { treatmentRecord: true } } } },
    },
  });
}

// ---------------------------------------------------------------------------
// Cash register ("Corte de caja")
// ---------------------------------------------------------------------------

export async function openCashRegisterSessionAction(locationName: string, openingFloatMxn: number) {
  const staff = await requireStaffRole(FRONT_DESK_ROLES);
  const location = await prisma.location.findFirst({ where: { name: locationName } });
  if (!location) return { error: "Sucursal no encontrada." };

  const existing = await prisma.cashRegisterSession.findFirst({
    where: { locationId: location.id, status: "OPEN" },
  });
  if (existing) return { error: "Ya hay una caja abierta para esta sucursal." };

  const session = await prisma.cashRegisterSession.create({
    data: { locationId: location.id, openedByUserId: staff.id, openingFloatMxn },
  });
  revalidatePath("/admin/sales");
  return { sessionId: session.id };
}

export async function closeCashRegisterSessionAction(sessionId: string, closingCountedMxn: number) {
  await requireStaffRole(FRONT_DESK_ROLES);
  await prisma.cashRegisterSession.update({
    where: { id: sessionId },
    data: { status: "CLOSED", closedAt: new Date(), closingCountedMxn },
  });
  revalidatePath("/admin/sales");
}

// ---------------------------------------------------------------------------
// Approvals (discount / refund / comp / inventory adjustment)
// ---------------------------------------------------------------------------

export interface RequestApprovalInput {
  type: "DISCOUNT" | "REFUND" | "COMP" | "INVENTORY_ADJUSTMENT";
  clientId?: string | null;
  saleId?: string | null;
  amountMxn: number;
  reason: string;
}

export async function requestApprovalAction(input: RequestApprovalInput) {
  const staff = await requireStaffRole(FRONT_DESK_ROLES);
  const request = await prisma.approvalRequest.create({
    data: {
      type: input.type,
      requestedByUserId: staff.id,
      clientId: input.clientId ?? null,
      saleId: input.saleId ?? null,
      amountMxn: input.amountMxn,
      reason: input.reason,
    },
  });
  revalidatePath("/admin/control");
  revalidatePath("/admin");
  return { requestId: request.id };
}

export async function decideApprovalAction(id: string, status: "APPROVED" | "REJECTED") {
  const manager = await requireStaffRole(MANAGER_ROLES);
  const request = await prisma.approvalRequest.update({
    where: { id },
    data: { status, approvedByUserId: manager.id, decidedAt: new Date() },
    include: { requestedBy: true, client: true },
  });

  if (status === "APPROVED") {
    const amount = request.amountMxn ?? 0;
    if (request.type === "DISCOUNT") {
      const thresholdPct = await getSettingNumber("anomaly.discountThresholdPct", 15);
      if (amount > thresholdPct) {
        await createAnomalyFlag(
          "Descuento inusual",
          `${amount}% aplicado a ${request.client?.name ?? "clienta"} — solicitó ${request.requestedBy.name} (umbral: ${thresholdPct}%)`,
          request.id,
        );
      }
    } else if (request.type === "REFUND") {
      const thresholdMxn = await getSettingNumber("anomaly.refundThresholdMxn", 1500);
      if (amount > thresholdMxn) {
        await createAnomalyFlag(
          "Reembolso inusual",
          `$${amount.toLocaleString()} MXN a ${request.client?.name ?? "clienta"} — solicitó ${request.requestedBy.name}${request.reason ? ` (${request.reason})` : ""} (umbral: $${thresholdMxn.toLocaleString()} MXN)`,
          request.id,
        );
      }
    }
  }

  revalidatePath("/admin/control");
  revalidatePath("/admin");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Inventory
// ---------------------------------------------------------------------------

export type LedgerName = "RETAIL" | "BACKBAR" | "WAREHOUSE";

export interface AdjustInventoryInput {
  inventoryItemId: string;
  qtyDelta: number;
  reason: string;
}

// Direct adjustment for small day-to-day counts (spill, breakage, a recount)
// — logged as an InventoryTransaction either way. Large corrections should
// go through requestApprovalAction(INVENTORY_ADJUSTMENT) instead; this
// action doesn't gate on size itself; Settings' threshold is enforced by
// whichever UI path the adjustment comes from.
export async function adjustInventoryAction(input: AdjustInventoryInput) {
  await requireStaffRole(FRONT_DESK_ROLES);
  const item = await prisma.inventoryItem.findUnique({ where: { id: input.inventoryItemId } });
  if (!item) return { error: "Producto no encontrado." };

  await prisma.$transaction([
    prisma.inventoryTransaction.create({
      data: {
        inventoryItemId: item.id,
        type: "ADJUSTMENT",
        qtyDelta: input.qtyDelta,
        reason: input.reason,
      },
    }),
    prisma.inventoryItem.update({
      where: { id: item.id },
      data: { qty: { increment: input.qtyDelta } },
    }),
  ]);

  if (input.qtyDelta < 0) {
    await createAnomalyFlag(
      "Merma",
      `${item.id} — ${Math.abs(input.qtyDelta)} unidades — ${input.reason}`,
      item.id,
    );
  }

  revalidatePath("/admin/inventory");
  revalidatePath("/staff/inventory");
  return { ok: true };
}

export interface UpdateInventoryItemInput {
  inventoryItemId: string;
  par: number;
  priceMxn?: number;
  costMxn?: number;
  expiresOn?: string;
  openedOn?: string;
  paoDays?: number;
}

// Metadata edits (par, price, cost, dates) — not a qty change, so no
// InventoryTransaction row; adjustInventoryAction covers qty deltas.
export async function updateInventoryItemAction(input: UpdateInventoryItemInput) {
  await requireStaffRole(FRONT_DESK_ROLES);
  await prisma.inventoryItem.update({
    where: { id: input.inventoryItemId },
    data: {
      par: input.par,
      priceMxn: input.priceMxn,
      costMxn: input.costMxn,
      expiresOn: input.expiresOn ? new Date(input.expiresOn) : undefined,
      openedOn: input.openedOn ? new Date(input.openedOn) : undefined,
      paoDays: input.paoDays,
    },
  });
  revalidatePath("/admin/inventory");
  revalidatePath("/staff/inventory");
  return { ok: true };
}

export interface ReceiveInventoryInput {
  productName: string;
  sku: string;
  ledger: LedgerName;
  locationName: string;
  qty: number;
  par: number;
  priceMxn?: number;
  costMxn?: number;
  expiresOn?: string;
  openedOn?: string;
  paoDays?: number;
}

// Creates the Product if it's new (first ledger it's ever been received
// into) and upserts the per-location InventoryItem row, logging a RECEIVE
// transaction. Covers both "Agregar producto" and restocking an existing
// SKU from the admin/staff inventory pages.
export async function receiveInventoryAction(input: ReceiveInventoryInput) {
  await requireStaffRole(FRONT_DESK_ROLES);

  const location = await prisma.location.findFirst({ where: { name: input.locationName } });
  if (!location) return { error: "Sucursal no encontrada." };

  const product = await prisma.product.upsert({
    where: { sku: input.sku },
    create: { sku: input.sku, name: input.productName, ledger: input.ledger },
    update: { name: input.productName },
  });

  const existing = await prisma.inventoryItem.findUnique({
    where: { productId_locationId: { productId: product.id, locationId: location.id } },
  });

  const item = await prisma.inventoryItem.upsert({
    where: { productId_locationId: { productId: product.id, locationId: location.id } },
    create: {
      productId: product.id,
      locationId: location.id,
      qty: input.qty,
      par: input.par,
      priceMxn: input.priceMxn,
      costMxn: input.costMxn,
      expiresOn: input.expiresOn ? new Date(input.expiresOn) : undefined,
      openedOn: input.openedOn ? new Date(input.openedOn) : undefined,
      paoDays: input.paoDays,
    },
    update: {
      par: input.par,
      priceMxn: input.priceMxn,
      costMxn: input.costMxn,
      expiresOn: input.expiresOn ? new Date(input.expiresOn) : undefined,
      openedOn: input.openedOn ? new Date(input.openedOn) : undefined,
      paoDays: input.paoDays,
      qty: { increment: input.qty },
    },
  });

  await prisma.inventoryTransaction.create({
    data: {
      inventoryItemId: item.id,
      type: "RECEIVE",
      qtyDelta: existing ? input.qty : item.qty,
      reason: existing ? "Restock" : "Alta de producto",
    },
  });

  revalidatePath("/admin/inventory");
  revalidatePath("/staff/inventory");
  revalidatePath("/staff/checkout");
  return { ok: true, inventoryItemId: item.id };
}

// A product's ledger is a field on Product, not InventoryItem — correcting
// a mis-categorized product (spec §5.3: ledgers are never one shared stock
// line) just flips that field; the same InventoryItem row (qty, par, cost…)
// carries over untouched, it isn't a transfer between two stock lines.
export async function moveInventoryLedgerAction(inventoryItemId: string, toLedger: LedgerName) {
  await requireStaffRole(FRONT_DESK_ROLES);
  const item = await prisma.inventoryItem.findUnique({ where: { id: inventoryItemId } });
  if (!item) return { error: "Producto no encontrado." };

  const product = await prisma.product.update({ where: { id: item.productId }, data: { ledger: toLedger } });

  revalidatePath("/admin/inventory");
  revalidatePath("/staff/inventory");
  return { ok: true, productId: product.id };
}

export async function removeInventoryItemAction(inventoryItemId: string) {
  await requireStaffRole(MANAGER_ROLES);
  await prisma.inventoryItem.delete({ where: { id: inventoryItemId } });
  revalidatePath("/admin/inventory");
  revalidatePath("/staff/inventory");
}

// ---------------------------------------------------------------------------
// Alerts (Panel's operational notification stream) and AnomalyFlag (Control
// > Anomalías review queue) are two separate real tables now.
// ---------------------------------------------------------------------------

export async function markAlertReadAction(id: string) {
  await requireStaffRole(FRONT_DESK_ROLES);
  await prisma.alert.update({ where: { id }, data: { readAt: new Date() } });
  revalidatePath("/admin");
}

export async function resolveAnomalyAction(id: string) {
  await requireStaffRole(MANAGER_ROLES);
  await prisma.anomalyFlag.update({ where: { id }, data: { status: "RESOLVED", resolvedAt: new Date() } });
  revalidatePath("/admin/control");
}

// Staff removing a recommended retail item from a ticket at checkout — a
// heads-up for Admin to review attribution, distinct from the definitive
// AnomalyFlag written if the same product gets re-added afterward.
export async function flagRetailRemovalAction(text: string) {
  await requireStaffRole(FRONT_DESK_ROLES);
  await createAlert(text, "WARNING", "RETAIL_REMOVAL");
  revalidatePath("/admin");
}
