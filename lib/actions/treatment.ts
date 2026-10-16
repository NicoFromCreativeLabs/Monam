"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireStaffRole } from "@/lib/auth/dal";
import { allocateMl, type Allocation } from "@/lib/containers";

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
  // The add-ons actually performed: the ones booked ahead plus any added in
  // the cabin. Saved on the appointment so the checkout charges them.
  addOnIds?: string[];
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

  const addOnIds = [...new Set(input.addOnIds ?? [])];
  if (addOnIds.length > 2) return { error: "Máximo 2 add-ons por cita." };

  // Backbar: every product used comes out of an OPEN container — the cabina's
  // for shared products, the esthetician's own for individual ones. Nothing is
  // saved unless all of it can be covered, so the treatment is blocked until a
  // container is opened.
  const wanted = new Map<string, number>(); // sku -> ml
  for (const used of input.usedProducts) {
    const ml = Number(used.amountMl);
    if (!used.sku || !ml) continue;
    if (!Number.isInteger(ml) || ml <= 0) return { error: "Los ml usados deben ser un número entero." };
    wanted.set(used.sku, (wanted.get(used.sku) ?? 0) + ml);
  }
  const plan: { allocations: Allocation[] }[] = [];
  for (const [sku, ml] of wanted) {
    const item = await prisma.inventoryItem.findFirst({
      where: { locationId: appointment.locationId, product: { sku, ledger: "BACKBAR" } },
      include: { product: true },
    });
    if (!item) return { error: `Producto de backbar no encontrado (${sku}).` };
    const containers = await prisma.openContainer.findMany({
      where: {
        inventoryItemId: item.id,
        status: "OPEN",
        ...(item.scope === "COMMUNAL" ? { roomId: appointment.roomId } : { ownerUserId: user.id }),
      },
    });
    const allocations = allocateMl(containers, ml);
    if (!allocations) {
      return {
        error: `No hay un envase abierto de ${item.product.name} con ${ml} ml disponibles ${
          item.scope === "COMMUNAL" ? "en esta cabina" : "a tu nombre"
        }. Ábrelo en "Abrir producto" y vuelve a intentar.`,
      };
    }
    plan.push({ allocations });
  }

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

  // Sync the appointment's add-ons with what was really done: drop the ones
  // not performed, add the new ones at today's price, and keep the price a
  // booked add-on already had.
  if (input.addOnIds !== undefined) {
    const chosen = addOnIds.length ? await prisma.addOn.findMany({ where: { id: { in: addOnIds } } }) : [];
    const existing = await prisma.appointmentAddOn.findMany({ where: { appointmentId: appointment.id } });
    await prisma.$transaction([
      prisma.appointmentAddOn.deleteMany({
        where: { appointmentId: appointment.id, addOnId: { notIn: chosen.map((a) => a.id) } },
      }),
      ...chosen
        .filter((a) => !existing.some((e) => e.addOnId === a.id))
        .map((a) =>
          prisma.appointmentAddOn.create({
            data: { appointmentId: appointment.id, addOnId: a.id, priceMxn: a.priceMxn },
          }),
        ),
    ]);
  }

  // Take the ml out of the containers and keep who used how much.
  for (const step of plan) {
    for (const a of step.allocations) {
      await prisma.openContainer.update({
        where: { id: a.containerId },
        data: {
          remainingMl: a.remainingAfter,
          ...(a.remainingAfter === 0 ? { status: "FINISHED" as const, closedAt: new Date() } : {}),
        },
      });
      await prisma.containerUsage.create({
        data: { containerId: a.containerId, appointmentId: appointment.id, userId: user.id, ml: a.ml },
      });
    }
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
