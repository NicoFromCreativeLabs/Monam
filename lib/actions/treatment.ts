"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireStaffRole } from "@/lib/auth/dal";

const REVISIT_DAYS: Record<string, number> = {
  "2 semanas": 14,
  "4 semanas": 28,
  "6 semanas": 42,
};

async function requireTreatmentStaff() {
  return requireStaffRole(["ESTHETICIAN", "OWNER", "CLINIC_MANAGER"]);
}

export interface CompleteTreatmentInput {
  appointmentId: string;
  protocolName: string;
  usedProducts: { sku: string; amountMl: string }[];
  clinicalNotes: string;
  revisitInterval: string; // "2 semanas" | "4 semanas" | "6 semanas"
}

export type CompleteTreatmentResult = { error: string } | { treatmentRecordId: string };

// Writes the real TreatmentRecord that closes out a facial (spec §7.3):
// completes the appointment, logs backbar consumption as
// InventoryTransaction rows, and hands off to Front Desk via
// getPendingCheckouts() reading the newly COMPLETED appointment — no more
// in-memory PendingCheckoutsContext.
export async function completeTreatmentAction(
  input: CompleteTreatmentInput,
): Promise<CompleteTreatmentResult> {
  const user = await requireTreatmentStaff();

  const appointment = await prisma.appointment.findUnique({ where: { id: input.appointmentId } });
  if (!appointment) return { error: "Cita no encontrada." };

  const protocol = await prisma.protocol.findUnique({ where: { name: input.protocolName } });
  if (!protocol) return { error: "Protocolo no encontrado." };

  const record = await prisma.treatmentRecord.create({
    data: {
      appointmentId: appointment.id,
      protocolId: protocol.id,
      estheticianId: user.id,
      notes: input.clinicalNotes || null,
      recommendedRevisitDays: REVISIT_DAYS[input.revisitInterval] ?? null,
    },
  });

  await prisma.appointment.update({
    where: { id: appointment.id },
    data: { status: "COMPLETED", protocolId: protocol.id },
  });

  for (const used of input.usedProducts) {
    const amountMl = Number(used.amountMl);
    if (!used.sku || !amountMl) continue;
    const item = await prisma.inventoryItem.findFirst({
      where: { locationId: appointment.locationId, product: { sku: used.sku } },
    });
    if (!item) continue;
    await prisma.inventoryTransaction.create({
      data: {
        inventoryItemId: item.id,
        type: "BACKBAR_USAGE",
        qtyDelta: -amountMl,
        reason: `Tratamiento ${protocol.name}`,
      },
    });
    await prisma.inventoryItem.update({ where: { id: item.id }, data: { qty: { decrement: amountMl } } });
  }

  revalidatePath("/staff");
  revalidatePath("/staff/retail-tags");
  revalidatePath("/staff/checkout");
  revalidatePath("/admin/calendar");
  return { treatmentRecordId: record.id };
}

export type SaveRetailTagsResult = { error: string } | { ok: true };

// Re-savable: clears this treatment's existing tags and writes the new
// selection, so revisiting the page and changing a pick doesn't duplicate
// rows.
export async function saveRetailTagsAction(
  appointmentId: string,
  productSkus: string[],
): Promise<SaveRetailTagsResult> {
  await requireTreatmentStaff();

  const record = await prisma.treatmentRecord.findUnique({ where: { appointmentId } });
  if (!record) return { error: "Completa el tratamiento antes de recomendar productos." };

  const products = await prisma.product.findMany({ where: { sku: { in: productSkus } } });

  await prisma.retailRecommendationTag.deleteMany({ where: { treatmentRecordId: record.id } });
  if (products.length > 0) {
    await prisma.retailRecommendationTag.createMany({
      data: products.map((p) => ({ treatmentRecordId: record.id, productId: p.id })),
    });
  }

  revalidatePath("/staff/retail-tags");
  revalidatePath("/staff/checkout");
  return { ok: true };
}
