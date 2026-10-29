"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireStaffRole } from "@/lib/auth/dal";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { STRIPE_ENABLED } from "@/lib/feature-flags";
import {
  cancelPaymentIntent,
  createCounterPaymentIntent,
  getPaymentStatus,
  refundPayment,
} from "@/lib/payments/stripe";
import type { Role } from "@/lib/generated/prisma/client";
import { earnsCommission } from "@/lib/commission-policy";
import { evaluateCodeForTicket, type AppliedCode } from "@/lib/discount-codes-server";
import { getUsableAccountDiscounts } from "@/lib/client-discounts";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/resend";
import { buildWelcomeReceiptEmailHtml } from "@/lib/email/receipt";
import { RECEIPT_EMAIL_ENABLED } from "@/lib/feature-flags";
import { getReceiptData } from "@/lib/receipts";
import { signLinkToken } from "@/lib/signed-link-token";

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

// A discount on the whole ticket (before the deposit credit). Front Desk can
// apply one up to the approval threshold set in Configuración; above it a
// manager has to approve it first (approvalRequestId), and Owner / Clinic
// Manager can apply any discount directly. Always needs a reason.
export interface DiscountInput {
  kind: "PERCENT" | "AMOUNT";
  value: number; // % when PERCENT, pesos when AMOUNT
  reason: string;
  approvalRequestId?: string;
}

export interface CreateSaleInput {
  appointmentId?: string | null;
  // A client manually attached at a retail-only counter sale (no appointment)
  // — StaffCheckoutView's "Agregar clienta" modal. Ignored when appointmentId
  // is set: the appointment's own client is always the one of record then.
  clientId?: string | null;
  discount?: DiscountInput | null;
  // A discount code (typed or scanned from its QR). Pre-approved by whoever created it,
  // so it skips the approval threshold; it cannot be combined with a manual discount.
  discountCode?: string | null;
  locationName: string;
  retailItems: RetailLineInput[];
  reAddedAfterRemovalSkus: string[]; // re-added after the recommendation was removed — commission goes to whoever closes the sale, not the original tagger
  paymentMethod: "CASH" | "CARD" | "ONLINE";
  stripePaymentId?: string; // required for ONLINE — the succeeded PaymentIntent from startOnlineChargeAction
  // True only when clientId is an account StaffCheckoutView just created in
  // this same checkout (createCheckoutClientAction) — sends the welcome/
  // receipt/password-setup email once the sale below closes. The recipient
  // email always comes from the Client row looked up server-side by
  // clientId, never from this flag or any other client-supplied value.
  notifyNewClient?: boolean;
}

export type CreateSaleResult = { error: string } | { saleId: string; totalMxn: number };

// Prices are always re-derived server-side from real rows (the appointment's
// protocol, the location's InventoryItem.priceMxn, the deposit on file) —
// never from client-supplied numbers. Shared by createSaleAction and
// startOnlineChargeAction so the amount on a Stripe payment link is exactly
// what the Sale will record.
// Explicitly typed (not an inline literal) so callers can narrow the quote
// with `"error" in quote`.
function quoteError(error: string): { error: string } {
  return { error };
}

async function quoteSale(
  input: Pick<
    CreateSaleInput,
    "appointmentId" | "clientId" | "locationName" | "retailItems" | "discount" | "discountCode"
  >,
) {
  const location = await prisma.location.findFirst({ where: { name: input.locationName } });
  if (!location) return quoteError("Sucursal no encontrada.");

  let appointment: Awaited<ReturnType<typeof loadAppointmentForCheckout>> = null;
  if (input.appointmentId) {
    appointment = await loadAppointmentForCheckout(input.appointmentId);
    if (!appointment) return quoteError("Cita no encontrada.");
    if (appointment.sale) return quoteError("Esta cita ya fue cobrada.");
    if (!appointment.treatmentRecord) return quoteError("El tratamiento no se ha completado.");
  }
  // An appointment's own client always wins — a manually-attached clientId
  // only matters for the retail-only (no appointment) counter-sale path.
  const resolvedClientId = appointment?.clientId ?? input.clientId ?? null;

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
      return quoteError(`Sin existencia suficiente de ${line.sku}.`);
    }
  }

  // An appointment booked with a package session has no service charge.
  const servicePrice = appointment?.packageRedemption ? 0 : (appointment?.protocol?.priceMxn ?? 0);
  const retailTotal = input.retailItems.reduce((sum, line) => {
    const item = itemBySku.get(line.sku);
    return sum + (item?.priceMxn ?? 0) * line.qty;
  }, 0);
  // Add-ons the client picked when booking, at the price they were shown.
  const addOnsTotal = (appointment?.addOns ?? []).reduce((sum, a) => sum + a.priceMxn, 0);
  const subtotal = servicePrice + addOnsTotal + retailTotal;
  const depositCreditMxn =
    appointment?.deposit && appointment.deposit.status === "HELD" ? -appointment.deposit.amountMxn : 0;

  let discountMxn = 0;
  if (input.discount) {
    const d = input.discount;
    if (!Number.isFinite(d.value) || d.value <= 0) return quoteError("El descuento debe ser mayor a 0.");
    if (d.reason.trim().length < 3) return quoteError("Escribe el motivo del descuento.");
    if (d.kind === "PERCENT" && d.value > 100) return quoteError("El descuento no puede pasar de 100%.");
    discountMxn = d.kind === "PERCENT" ? Math.round((subtotal * d.value) / 100) : Math.round(d.value);
    if (discountMxn > subtotal) return quoteError("El descuento no puede ser mayor al total.");
  }
  let appliedCode: AppliedCode | null = null;
  if (input.discountCode?.trim()) {
    if (input.discount) return quoteError("Usa un código o un descuento manual, no los dos.");
    const evaluated = await evaluateCodeForTicket(input.discountCode, {
      clientId: resolvedClientId,
      servicePrice,
      addOns: (appointment?.addOns ?? []).map((a) => ({ addOnId: a.addOnId, price: a.priceMxn })),
      retail: input.retailItems
        .filter((r) => r.qty > 0)
        .map((r) => ({ sku: r.sku, price: itemBySku.get(r.sku)?.priceMxn ?? 0, qty: r.qty })),
    });
    if ("error" in evaluated) return quoteError(evaluated.error);
    appliedCode = evaluated;
    discountMxn = Math.min(evaluated.amountMxn, subtotal);
  }
  const discountPct = subtotal > 0 ? (discountMxn / subtotal) * 100 : 0;
  const totalMxn = Math.max(0, subtotal - discountMxn + depositCreditMxn);

  return {
    location, appointment, resolvedClientId, itemBySku, servicePrice, subtotal, depositCreditMxn, totalMxn, discountMxn, discountPct, appliedCode,
  } as const;
}

// Who may apply this discount. Owner / Clinic Manager: any. Front Desk: up to
// the approval threshold, or any amount with a manager's approval of exactly
// this request (approved, not yet used on another sale).
async function authorizeDiscount(
  staff: { id: string; role: Role },
  discount: DiscountInput,
  discountPct: number,
): Promise<{ ok: true } | { error: string }> {
  if (MANAGER_ROLES.includes(staff.role)) return { ok: true };
  const threshold = await getSettingNumber("discount.approvalThresholdPct", 10);
  if (discountPct <= threshold) return { ok: true };
  if (!discount.approvalRequestId) {
    return { error: `Un descuento de más de ${threshold}% requiere la aprobación de un gerente.` };
  }
  const approval = await prisma.approvalRequest.findUnique({ where: { id: discount.approvalRequestId } });
  const valid =
    approval &&
    approval.type === "DISCOUNT" &&
    approval.status === "APPROVED" &&
    !approval.saleId &&
    approval.requestedByUserId === staff.id &&
    (approval.amountMxn ?? 0) + 0.5 >= discountPct;
  return valid ? { ok: true } : { error: "La aprobación del descuento no es válida o ya se usó." };
}

// Same price/attribution derivation as always — see quoteSale. For ONLINE
// payments the sale is only recorded once the Stripe Checkout session
// (started by startOnlineChargeAction) is verified paid for exactly this total.
export async function createSaleAction(input: CreateSaleInput): Promise<CreateSaleResult> {
  const staff = await requireStaffRole(FRONT_DESK_ROLES);

  const quote = await quoteSale(input);
  if ("error" in quote) return quote;
  const { location, appointment, resolvedClientId, itemBySku, servicePrice, subtotal, depositCreditMxn, totalMxn, discountMxn, discountPct, appliedCode } =
    quote;

  if (input.discount) {
    const auth = await authorizeDiscount(staff, input.discount, discountPct);
    if ("error" in auth) return auth;
  }

  if (input.paymentMethod === "ONLINE") {
    const verified = await verifyOnlinePayment(input.stripePaymentId, totalMxn);
    if ("error" in verified) return verified;
  }

  const tagByProductId = new Map(
    (appointment?.treatmentRecord?.retailTags ?? []).map((t) => [t.productId, t]),
  );

  const commissionRules = await prisma.commissionRule.findMany({ where: { isActive: true } });
  function findRule(basis: "SERVICE" | "ADD_ON" | "RETAIL" | "PACKAGE", role: Role) {
    // The esthetician earns commission only on the retail she recommended.
    if (!earnsCommission(basis, role)) return undefined;
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
        ...(resolvedClientId ? { client: { connect: { id: resolvedClientId } } } : {}),
        ...(appointment?.id ? { appointment: { connect: { id: appointment.id } } } : {}),
        subtotalMxn: subtotal,
        discountMxn,
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

    for (const booked of appointment?.addOns ?? []) {
      const addOnLine = await tx.saleLineItem.create({
        data: {
          saleId: created.id,
          type: "ADD_ON",
          addOnId: booked.addOnId,
          performedByUserId: appointment?.treatmentRecord?.estheticianId,
          priceMxn: booked.priceMxn,
        },
      });
      if (booked.priceMxn > 0 && appointment?.treatmentRecord) {
        const addOnEsthetician = await tx.appUser.findUnique({
          where: { id: appointment.treatmentRecord.estheticianId },
        });
        const addOnRule = addOnEsthetician && findRule("ADD_ON", addOnEsthetician.role);
        if (addOnRule && addOnEsthetician) {
          await tx.commissionEntry.create({
            data: {
              userId: addOnEsthetician.id,
              saleLineItemId: addOnLine.id,
              saleId: created.id,
              basis: "ADD_ON",
              baseAmountMxn: booked.priceMxn,
              ratePct: addOnRule.rateOrAmount,
              commissionMxn: Math.round((booked.priceMxn * addOnRule.rateOrAmount) / 100),
            },
          });
        }
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

    // A discount code: one redemption per sale, which is what its limits count.
    if (appliedCode) {
      await tx.discountRedemption.create({
        data: {
          codeId: appliedCode.codeId,
          saleId: created.id,
          clientId: resolvedClientId,
          amountMxn: discountMxn,
          redeemedByUserId: staff.id,
        },
      });
      // An account discount is spent: it cannot be used again by that account.
      if (appliedCode.claimId) {
        await tx.clientDiscount.update({
          where: { id: appliedCode.claimId },
          data: { redeemedAt: new Date(), saleId: created.id },
        });
      }
    }

    // Keep the paper trail for the discount: a manager-approved request is
    // tied to this sale; a direct one (within the threshold, or by a manager)
    // is recorded as an approved request of its own.
    if (discountMxn > 0 && input.discount) {
      if (input.discount.approvalRequestId) {
        await tx.approvalRequest.update({
          where: { id: input.discount.approvalRequestId },
          data: { saleId: created.id },
        });
      } else {
        await tx.approvalRequest.create({
          data: {
            type: "DISCOUNT",
            requestedByUserId: staff.id,
            approvedByUserId: staff.id,
            status: "APPROVED",
            decidedAt: new Date(),
            saleId: created.id,
            clientId: resolvedClientId,
            amountMxn: Math.ceil(discountPct),
            reason: input.discount.reason.trim(),
          },
        });
      }
    }

    // Marks the Stripe payment as spent — verifyOnlinePayment refuses a
    // payment that already closed a sale, so it can't be reused.
    if (input.paymentMethod === "ONLINE" && input.stripePaymentId) {
      await tx.auditLog.create({
        data: {
          actorUserId: staff.id,
          actorRole: staff.role,
          action: "STRIPE_COUNTER_SALE",
          entityType: "StripePaymentIntent",
          entityId: input.stripePaymentId,
          locationId: location.id,
          metadata: { saleId: created.id, totalMxn },
        },
      });
    }

    return created;
  });

  if (discountMxn > 0 && input.discount && !input.discount.approvalRequestId) {
    const anomalyPct = await getSettingNumber("anomaly.discountThresholdPct", 15);
    if (discountPct > anomalyPct) {
      await createAnomalyFlag(
        "Descuento inusual",
        `${Math.round(discountPct)}% aplicado en la venta ${sale.id} por ${staff.name} (umbral: ${anomalyPct}%)`,
        sale.id,
      );
    }
  }

  if (input.reAddedAfterRemovalSkus.length > 0) {
    await createAnomalyFlag(
      "Comisión reasignada manualmente",
      `Venta ${sale.id} — producto re-agregado al ticket tras quitar la recomendación.`,
      sale.id,
    );
  }

  revalidateCheckout();

  // Best-effort — the sale above already succeeded; a broken email must
  // never surface as a checkout error. Awaited (not fire-and-forget) only so
  // ordering stays deterministic in tests/logs, not because the UI waits on it.
  if (input.notifyNewClient && resolvedClientId) {
    await sendWelcomeReceiptEmail(resolvedClientId, sale.id).catch((e) => {
      console.error("Welcome receipt email failed:", e);
    });
  }

  return { saleId: sale.id, totalMxn };
}

// The email for a client StaffCheckoutView just created at the counter
// (createCheckoutClientAction): her first sale's ticket, folded into the
// same message as her account-setup link (see lib/email/receipt.ts for why
// one email, not two). Looks the client's email up fresh here — never trusts
// a client-supplied address — and no-ops quietly if RECEIPT_EMAIL_ENABLED is
// off or she has no email on file.
async function sendWelcomeReceiptEmail(clientId: string, saleId: string): Promise<void> {
  if (!RECEIPT_EMAIL_ENABLED) return;
  const data = await getReceiptData(saleId);
  if (!data?.clientEmail) return;

  const admin = createAdminClient();
  const { data: link, error } = await admin.auth.admin.generateLink({ type: "recovery", email: data.clientEmail });
  if (error || !link) {
    console.error("generateLink failed for welcome receipt email:", error);
    return;
  }

  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://monam.mx").replace(/\/+$/, "");
  const passwordSetupUrl = `${base}/auth/confirm?token_hash=${link.properties.hashed_token}&type=recovery&next=/auth/update-password`;
  const pdfUrl = `${base}/api/receipts/${saleId}/pdf?token=${signLinkToken("receipt", saleId)}`;
  const deleteAccountUrl = `${base}/eliminar-cuenta?clientId=${clientId}&token=${signLinkToken("delete-account", clientId)}`;

  const html = buildWelcomeReceiptEmailHtml({
    clientName: data.clientName,
    locationName: data.locationName,
    dateLabel: data.dateLabel,
    lines: data.lines,
    discountMxn: data.discountMxn,
    totalMxn: data.totalMxn,
    passwordSetupUrl,
    pdfUrl,
    deleteAccountUrl,
  });

  const result = await sendEmail({ to: data.clientEmail, subject: "Tu ticket y tu cuenta MONÂM", html });
  if (!result.ok) console.error("sendEmail failed for welcome receipt email:", result.error);
}

async function verifyOnlinePayment(
  paymentId: string | undefined,
  totalMxn: number,
): Promise<{ ok: true } | { error: string }> {
  if (!STRIPE_ENABLED) return { error: "Stripe no está configurado. Cobra en efectivo o con tarjeta." };
  if (!paymentId) return { error: "Genera primero el cobro con Stripe." };

  const alreadyUsed = await prisma.auditLog.findFirst({
    where: { action: "STRIPE_COUNTER_SALE", entityId: paymentId },
  });
  if (alreadyUsed) return { error: "Este pago ya se registró en otra venta." };

  const status = await getPaymentStatus(paymentId);
  if (status.kind !== "counter") return { error: "El pago no corresponde a una venta de mostrador." };
  if (!status.paid) return { error: "El pago todavía no se ha completado." };
  if (status.amountMxn !== totalMxn) {
    return { error: "El monto pagado no coincide con el total de la venta. Revisa en Stripe." };
  }
  return { ok: true };
}

export type StartOnlineChargeResult =
  | { error: string }
  | { paymentId: string; payUrl: string; qrDataUrl: string; totalMxn: number };

// "En línea (Stripe)" at the counter: creates a PaymentIntent for exactly the
// server-derived total and returns a QR to our own branded page (/pagar/<id>),
// where the client pays on their phone. (Tap to Pay itself needs a native
// iOS/Android app or a Stripe card reader — it can't run in a web app.) The
// Sale is recorded afterwards by createSaleAction once the payment is verified.
export async function startOnlineChargeAction(
  input: Pick<CreateSaleInput, "appointmentId" | "clientId" | "locationName" | "retailItems" | "discount">,
): Promise<StartOnlineChargeResult> {
  const staff = await requireStaffRole(FRONT_DESK_ROLES);
  if (!STRIPE_ENABLED) return { error: "Stripe no está configurado. Cobra en efectivo o con tarjeta." };
  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    return { error: "Falta la llave pública de Stripe (NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)." };
  }

  const quote = await quoteSale(input);
  if ("error" in quote) return quote;
  if (quote.totalMxn <= 0) return { error: "No hay nada que cobrar." };
  if (input.discount) {
    const auth = await authorizeDiscount(staff, input.discount, quote.discountPct);
    if ("error" in auth) return auth;
  }

  const origin = (await headers()).get("origin") ?? "";
  try {
    const { paymentId } = await createCounterPaymentIntent({
      amountMxn: quote.totalMxn,
      description: `Monâm Skin Studio — ${quote.location.name}`,
      metadata: { locationName: quote.location.name, appointmentId: input.appointmentId ?? "" },
    });
    const payUrl = `${origin}/pagar/${paymentId}`;
    const qrDataUrl = await QRCode.toDataURL(payUrl, { width: 320, margin: 1 });
    return { paymentId, payUrl, qrDataUrl, totalMxn: quote.totalMxn };
  } catch {
    return { error: "No se pudo generar el cobro. Intenta de nuevo." };
  }
}

export async function checkOnlineChargeAction(
  paymentId: string,
): Promise<{ paid: boolean; expired: boolean } | { error: string }> {
  await requireStaffRole(FRONT_DESK_ROLES);
  if (!STRIPE_ENABLED) return { error: "Stripe no está configurado." };
  try {
    const { paid, canceled } = await getPaymentStatus(paymentId);
    return { paid, expired: canceled };
  } catch {
    return { error: "No se pudo consultar el pago." };
  }
}

export async function cancelOnlineChargeAction(paymentId: string): Promise<void> {
  await requireStaffRole(FRONT_DESK_ROLES);
  if (!STRIPE_ENABLED) return;
  // An already-paid or already-canceled intent can't be canceled — nothing to do.
  await cancelPaymentIntent(paymentId).catch(() => {});
}

async function loadAppointmentForCheckout(appointmentId: string) {
  return prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      client: true,
      protocol: true,
      deposit: true,
      sale: true,
      addOns: true,
      packageRedemption: true,
      treatmentRecord: { include: { retailTags: { include: { treatmentRecord: true } } } },
    },
  });
}

// The vendedor types or scans a discount code: what it would take off this
// ticket, worked out on the server (never from the browser's numbers).
export type DiscountCodePreview =
  | { ok: true; code: string; name: string; summary: string; discountMxn: number }
  | { ok: false; error: string };

export async function previewDiscountCodeAction(input: {
  code: string;
  appointmentId?: string | null;
  clientId?: string | null;
  locationName: string;
  retailItems: RetailLineInput[];
}): Promise<DiscountCodePreview> {
  await requireStaffRole(FRONT_DESK_ROLES);
  const quote = await quoteSale({
    appointmentId: input.appointmentId ?? null,
    clientId: input.clientId ?? null,
    locationName: input.locationName,
    retailItems: input.retailItems,
    discount: null,
    discountCode: input.code,
  });
  if ("error" in quote) return { ok: false, error: quote.error };
  if (!quote.appliedCode) return { ok: false, error: "Escribe o escanea el código." };
  return {
    ok: true,
    code: quote.appliedCode.code,
    name: quote.appliedCode.name,
    summary: quote.appliedCode.summary,
    discountMxn: quote.discountMxn,
  };
}

// A retail-only counter sale has no appointment to read a client off — this
// is StaffCheckoutView's "Agregar clienta" modal looking one up by id (from
// the location's client list) so her account discounts can be shown and her
// purchase recorded against her, same as an appointment checkout already does.
export interface CheckoutClientInfo {
  id: string;
  name: string;
  discounts: { code: string; name: string; summary: string }[];
}

export async function getCheckoutClientAction(
  clientId: string,
): Promise<CheckoutClientInfo | { error: string }> {
  await requireStaffRole(FRONT_DESK_ROLES);
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client || client.anonymizedAt) return { error: "Clienta no encontrada." };

  const discounts = await getUsableAccountDiscounts(client.id);
  return {
    id: client.id,
    name: client.name,
    discounts: discounts.map((d) => ({ code: d.code, name: d.name, summary: d.summary })),
  };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface CreateCheckoutClientInput {
  name: string;
  email: string;
  phone?: string; // optional — StaffCheckoutView's "no la encontramos" sub-form, email-only is fine
}

// "No la encontramos" in the Agregar clienta modal: creates a real Client +
// a Supabase Auth user with no password yet (same pattern as inviteStaffAction),
// so the purchase about to be rung up can be attached to a real account
// instead of staying untraceable. Front Desk never sets or sees a password —
// createSaleAction sends the account-setup link (folded into the receipt
// email) once the sale closes, see notifyNewClient below.
export async function createCheckoutClientAction(
  input: CreateCheckoutClientInput,
): Promise<CheckoutClientInfo | { error: string }> {
  await requireStaffRole(FRONT_DESK_ROLES);

  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const phoneDigits = (input.phone ?? "").trim();
  if (!name) return { error: "Escribe su nombre." };
  if (!EMAIL_RE.test(email)) return { error: "Escribe un correo válido." };
  if (phoneDigits && phoneDigits.replace(/\D/g, "").length < 10) {
    return { error: "El teléfono debe tener al menos 10 dígitos (o déjalo en blanco)." };
  }

  const existingByEmail = await prisma.client.findFirst({ where: { email, anonymizedAt: null } });
  if (existingByEmail) return { error: "Ya existe una cuenta con este correo. Búscala por nombre o teléfono." };
  if (phoneDigits) {
    const existingByPhone = await prisma.client.findUnique({ where: { phone: phoneDigits } });
    if (existingByPhone) return { error: "Ya existe una cuenta con este teléfono. Búscala por nombre o teléfono." };
  }

  const admin = createAdminClient();
  let userId = await findAuthUserIdByEmail(admin, email);
  if (userId) {
    const alreadyClient = await prisma.client.findFirst({ where: { authUserId: userId } });
    if (alreadyClient) return { error: "Ya existe una cuenta con este correo. Búscala por nombre o teléfono." };
    // Email belongs to a login with no Client row yet (e.g. staff-only) — reuse it.
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { name },
    });
    if (error || !data.user) return { error: error?.message ?? "No se pudo crear la cuenta." };
    userId = data.user.id;
  }

  const client = await prisma.client.create({
    data: { authUserId: userId, name, email, phone: phoneDigits || null },
  });

  return { id: client.id, name: client.name, discounts: [] };
}

// Supabase has no get-user-by-email on the admin API, so page through
// listUsers — same approach as inviteStaffAction (lib/actions/staff.ts),
// duplicated locally rather than shared since it's a few lines either way.
async function findAuthUserIdByEmail(
  admin: ReturnType<typeof createAdminClient>,
  email: string,
): Promise<string | null> {
  const perPage = 200;
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) return null;
    const match = data.users.find((u) => u.email?.toLowerCase() === email);
    if (match) return match.id;
    if (data.users.length < perPage) return null;
  }
  return null;
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

export async function decideApprovalAction(
  id: string,
  status: "APPROVED" | "REJECTED",
): Promise<{ ok: true } | { ok: false; error: string }> {
  const manager = await requireStaffRole(MANAGER_ROLES);

  // An approved refund is only approved once the money can really go back: a
  // failed Stripe refund leaves the request pending.
  if (status === "APPROVED") {
    const pending = await prisma.approvalRequest.findUnique({ where: { id } });
    if (pending?.type === "REFUND" && pending.status === "PENDING") {
      const done = await executeRefund(pending.saleId, pending.amountMxn ?? 0, id);
      if ("error" in done) return { ok: false, error: done.error };
    }
  }

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

// Front Desk polls this while a discount waits for a manager's decision.
export async function getApprovalStatusAction(id: string): Promise<"PENDING" | "APPROVED" | "REJECTED" | null> {
  await requireStaffRole(FRONT_DESK_ROLES);
  const request = await prisma.approvalRequest.findUnique({ where: { id }, select: { status: true } });
  return request?.status ?? null;
}

// ---------------------------------------------------------------------------
// Refunds
// ---------------------------------------------------------------------------

// What can still be refunded on a sale: its total minus refunds already
// approved (and, when asked, those waiting for approval).
async function refundableMxn(saleId: string, excludeRequestId?: string, includePending = false) {
  const sale = await prisma.sale.findUnique({ where: { id: saleId } });
  if (!sale) return null;
  const others = await prisma.approvalRequest.findMany({
    where: {
      saleId,
      type: "REFUND",
      status: includePending ? { in: ["APPROVED", "PENDING"] } : "APPROVED",
      ...(excludeRequestId ? { id: { not: excludeRequestId } } : {}),
    },
    select: { amountMxn: true },
  });
  return { sale, remaining: sale.totalMxn - others.reduce((s, r) => s + (r.amountMxn ?? 0), 0) };
}

// Sends the money back. Online payments are refunded through Stripe; cash and
// card-terminal payments have to be handed back by the staff, so there is
// nothing to execute, only to record.
async function executeRefund(
  saleId: string | null,
  amountMxn: number,
  requestId?: string,
): Promise<{ ok: true; viaStripe: boolean } | { error: string }> {
  if (!saleId) return { error: "El reembolso no está ligado a una venta." };
  const info = await refundableMxn(saleId, requestId);
  if (!info) return { error: "Venta no encontrada." };
  if (!Number.isInteger(amountMxn) || amountMxn <= 0) return { error: "El monto debe ser un número entero mayor a 0." };
  if (amountMxn > info.remaining) {
    return { error: `Solo se pueden reembolsar $${info.remaining.toLocaleString()} MXN de esta venta.` };
  }

  if (info.sale.paymentMethod === "ONLINE" && STRIPE_ENABLED) {
    const payment = await prisma.auditLog.findFirst({
      where: { action: "STRIPE_COUNTER_SALE", metadata: { path: ["saleId"], equals: saleId } },
    });
    if (payment?.entityId) {
      try {
        await refundPayment(payment.entityId, amountMxn);
        return { ok: true, viaStripe: true };
      } catch {
        return { error: "Stripe no pudo procesar el reembolso. Revisa el pago en el Dashboard de Stripe." };
      }
    }
  }
  return { ok: true, viaStripe: false };
}

export type RefundResult =
  | { error: string }
  | { status: "PENDING" }
  | { status: "REFUNDED"; viaStripe: boolean; amountMxn: number };

// Front Desk asks; a manager approves in Aprobaciones. Owner / Clinic Manager
// refund directly (and it is recorded like any approved request).
export async function requestRefundAction(input: {
  saleId: string;
  amountMxn: number;
  reason: string;
}): Promise<RefundResult> {
  const staff = await requireStaffRole(FRONT_DESK_ROLES);
  if (input.reason.trim().length < 3) return { error: "Escribe el motivo del reembolso." };
  if (!Number.isInteger(input.amountMxn) || input.amountMxn <= 0) {
    return { error: "El monto debe ser un número entero mayor a 0." };
  }
  const info = await refundableMxn(input.saleId, undefined, true);
  if (!info) return { error: "Venta no encontrada." };
  if (input.amountMxn > info.remaining) {
    return { error: `Solo se pueden reembolsar $${Math.max(0, info.remaining).toLocaleString()} MXN de esta venta.` };
  }

  const base = {
    type: "REFUND" as const,
    requestedByUserId: staff.id,
    saleId: input.saleId,
    clientId: info.sale.clientId,
    amountMxn: input.amountMxn,
    reason: input.reason.trim(),
  };

  if (!MANAGER_ROLES.includes(staff.role)) {
    await prisma.approvalRequest.create({ data: base });
    revalidatePath("/admin/control");
    revalidatePath("/admin");
    revalidatePath("/staff/refunds");
    return { status: "PENDING" };
  }

  const done = await executeRefund(input.saleId, input.amountMxn);
  if ("error" in done) return done;
  await prisma.approvalRequest.create({
    data: { ...base, approvedByUserId: staff.id, status: "APPROVED", decidedAt: new Date() },
  });
  const thresholdMxn = await getSettingNumber("anomaly.refundThresholdMxn", 1500);
  if (input.amountMxn > thresholdMxn) {
    await createAnomalyFlag(
      "Reembolso inusual",
      `$${input.amountMxn.toLocaleString()} MXN en la venta ${input.saleId} — lo hizo ${staff.name} (umbral: $${thresholdMxn.toLocaleString()} MXN)`,
      input.saleId,
    );
  }
  revalidateCheckout();
  revalidatePath("/staff/refunds");
  return { status: "REFUNDED", viaStripe: done.viaStripe, amountMxn: input.amountMxn };
}

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
  contentMl?: number; // backbar: ml in one container
  scope?: "COMMUNAL" | "INDIVIDUAL"; // backbar: one open container per cabina, or per esthetician
  brand?: string; // lives on Product too; an empty string clears it
  category?: string; // lives on Product too; an empty string clears it
  sku?: string; // lives on Product, not InventoryItem — a correction, not a rename-to-merge (spec §5.3 never-merge still applies, so this never changes which ledger row the SKU belongs to)
}

// Metadata edits (par, price, cost, dates, SKU) — not a qty change, so no
// InventoryTransaction row; adjustInventoryAction covers qty deltas.
export async function updateInventoryItemAction(
  input: UpdateInventoryItemInput,
): Promise<{ ok: true } | { error: string }> {
  await requireStaffRole(FRONT_DESK_ROLES);

  if (input.sku !== undefined) {
    const item = await prisma.inventoryItem.findUnique({
      where: { id: input.inventoryItemId },
      select: { productId: true },
    });
    if (!item) return { error: "Producto no encontrado." };
    const sku = input.sku.trim();
    if (sku) {
      try {
        await prisma.product.update({ where: { id: item.productId }, data: { sku } });
      } catch {
        return { error: "Ese SKU ya está en uso por otro producto." };
      }
    }
  }

  if (input.brand !== undefined) {
    const owner = await prisma.inventoryItem.findUnique({
      where: { id: input.inventoryItemId },
      select: { productId: true },
    });
    if (!owner) return { error: "Producto no encontrado." };
    await prisma.product.update({ where: { id: owner.productId }, data: { brand: input.brand.trim() || null } });
  }

  if (input.category !== undefined) {
    const owner = await prisma.inventoryItem.findUnique({
      where: { id: input.inventoryItemId },
      select: { productId: true },
    });
    if (!owner) return { error: "Producto no encontrado." };
    await prisma.product.update({ where: { id: owner.productId }, data: { category: input.category.trim() || null } });
  }

  await prisma.inventoryItem.update({
    where: { id: input.inventoryItemId },
    data: {
      par: input.par,
      priceMxn: input.priceMxn,
      costMxn: input.costMxn,
      expiresOn: input.expiresOn ? new Date(input.expiresOn) : undefined,
      openedOn: input.openedOn ? new Date(input.openedOn) : undefined,
      paoDays: input.paoDays,
      contentMl: input.contentMl,
      scope: input.scope,
    },
  });
  revalidatePath("/admin/inventory");
  revalidatePath("/staff/inventory");
  return { ok: true };
}

export interface ReceiveInventoryInput {
  productName: string;
  brand?: string;
  category?: string;
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
  contentMl?: number;
  scope?: "COMMUNAL" | "INDIVIDUAL";
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
    create: {
      sku: input.sku,
      name: input.productName,
      ledger: input.ledger,
      brand: input.brand?.trim() || undefined,
      category: input.category?.trim() || undefined,
    },
    update: {
      name: input.productName,
      ...(input.brand?.trim() ? { brand: input.brand.trim() } : {}),
      ...(input.category?.trim() ? { category: input.category.trim() } : {}),
    },
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
      contentMl: input.contentMl,
      scope: input.scope,
    },
    update: {
      par: input.par,
      priceMxn: input.priceMxn,
      costMxn: input.costMxn,
      expiresOn: input.expiresOn ? new Date(input.expiresOn) : undefined,
      openedOn: input.openedOn ? new Date(input.openedOn) : undefined,
      paoDays: input.paoDays,
      contentMl: input.contentMl,
      scope: input.scope,
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
// Only the optional columns the file actually had, so a plain recount never
// blanks out values set earlier.
function importExtras(row: ImportInventoryRow) {
  return {
    ...(row.contentMl !== undefined ? { contentMl: row.contentMl } : {}),
    ...(row.scope !== undefined ? { scope: row.scope } : {}),
    ...(row.paoDays !== undefined ? { paoDays: row.paoDays } : {}),
    ...(row.costMxn !== undefined ? { costMxn: row.costMxn } : {}),
    ...(row.priceMxn !== undefined ? { priceMxn: row.priceMxn } : {}),
    ...(row.expiresOn ? { expiresOn: new Date(row.expiresOn) } : {}),
  };
}

export interface ImportInventoryRow {
  sku: string;
  product: string;
  brand?: string;
  category?: string;
  ledger: LedgerName;
  locationName: string;
  qty: number;
  par: number;
  // Optional extra columns (backbar): filled in by the person doing the inventory.
  contentMl?: number;
  scope?: "COMMUNAL" | "INDIVIDUAL";
  paoDays?: number;
  costMxn?: number;
  priceMxn?: number; // retail sale price
  expiresOn?: string;
}

// Bulk "actualizar todo el inventario" from the round-trip CSV (same shape
// as exportTodos in AdminInventoryView): SKU, Producto, Ledger, Ubicacion,
// Cantidad, Par. Unlike receiveInventoryAction (a restock, which adds to
// qty), this SETS qty/par to the file's values — a recount overwrites the
// count, it doesn't add to it. Logs one ADJUSTMENT transaction per row that
// actually changed qty, so Anomalías/Control still sees real deltas.
export async function importInventoryCsvAction(rows: ImportInventoryRow[]) {
  await requireStaffRole(FRONT_DESK_ROLES);

  const results = { updated: 0, created: 0, skipped: 0 };

  for (const row of rows) {
    if (!row.sku || !row.product || !row.locationName) {
      results.skipped++;
      continue;
    }
    const location = await prisma.location.findFirst({ where: { name: row.locationName } });
    if (!location) {
      results.skipped++;
      continue;
    }

    const product = await prisma.product.upsert({
      where: { sku: row.sku },
      create: {
        sku: row.sku,
        name: row.product,
        ledger: row.ledger,
        brand: row.brand || undefined,
        category: row.category || undefined,
      },
      update: {
        name: row.product,
        ...(row.brand ? { brand: row.brand } : {}),
        ...(row.category ? { category: row.category } : {}),
      },
    });

    const existing = await prisma.inventoryItem.findUnique({
      where: { productId_locationId: { productId: product.id, locationId: location.id } },
    });

    const item = await prisma.inventoryItem.upsert({
      where: { productId_locationId: { productId: product.id, locationId: location.id } },
      create: { productId: product.id, locationId: location.id, qty: row.qty, par: row.par, ...importExtras(row) },
      update: { qty: row.qty, par: row.par, ...importExtras(row) },
    });

    const qtyDelta = row.qty - (existing?.qty ?? 0);
    if (qtyDelta !== 0) {
      await prisma.inventoryTransaction.create({
        data: {
          inventoryItemId: item.id,
          type: "ADJUSTMENT",
          qtyDelta,
          reason: "Importación CSV — actualización de inventario",
        },
      });
    }
    if (existing) results.updated++;
    else results.created++;
  }

  revalidatePath("/admin/inventory");
  revalidatePath("/staff/inventory");
  revalidatePath("/staff/checkout");
  return { ok: true, ...results };
}

export async function moveInventoryLedgerAction(inventoryItemId: string, toLedger: LedgerName) {
  await requireStaffRole(FRONT_DESK_ROLES);
  const item = await prisma.inventoryItem.findUnique({ where: { id: inventoryItemId } });
  if (!item) return { error: "Producto no encontrado." };

  const product = await prisma.product.update({ where: { id: item.productId }, data: { ledger: toLedger } });

  revalidatePath("/admin/inventory");
  revalidatePath("/staff/inventory");
  return { ok: true, productId: product.id };
}

// Takes a product out of this location's inventory. The product itself stays in
// the catalog (past sales and recommendations still point at it), it just stops
// being stocked here — adding the same SKU again brings it back. The stock
// movements and containers of that stock line go with it. Not while an opened
// container is still in use.
export async function removeInventoryItemAction(
  inventoryItemId: string,
): Promise<{ error: string } | { ok: true }> {
  await requireStaffRole(MANAGER_ROLES);

  const item = await prisma.inventoryItem.findUnique({ where: { id: inventoryItemId } });
  if (!item) return { ok: true };

  const open = await prisma.openContainer.count({ where: { inventoryItemId, status: "OPEN" } });
  if (open > 0) {
    return { error: "Tiene envases abiertos. Termínalos o tíralos antes de eliminar el producto." };
  }

  try {
    await prisma.$transaction([
      prisma.containerUsage.deleteMany({ where: { container: { inventoryItemId } } }),
      prisma.openContainer.deleteMany({ where: { inventoryItemId } }),
      prisma.inventoryTransaction.deleteMany({ where: { inventoryItemId } }),
      prisma.inventoryItem.delete({ where: { id: inventoryItemId } }),
    ]);
  } catch {
    return { error: "No se pudo eliminar el producto. Intenta de nuevo." };
  }

  revalidatePath("/admin/inventory");
  revalidatePath("/staff/inventory");
  revalidatePath("/staff/checkout");
  return { ok: true };
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
