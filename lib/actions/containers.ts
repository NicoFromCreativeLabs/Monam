"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireStaffRole } from "@/lib/auth/dal";
import { containerLimit } from "@/lib/containers";

// Backbar containers. A product is used from an OPEN container: the
// esthetician opens one here (taking a sealed piece out of the stock), and the
// ml used in treatments are then taken from it. Shared products (COMMUNAL) have
// one open container per cabina; individual ones belong to one esthetician.

const STAFF_ROLES = ["ESTHETICIAN", "FRONT_DESK", "OWNER", "CLINIC_MANAGER"] as const;

export type ContainerResult = { error: string } | { ok: true; expiresOn: string };

export async function openContainerAction(input: {
  inventoryItemId: string;
  roomId?: string | null;
}): Promise<ContainerResult> {
  const user = await requireStaffRole([...STAFF_ROLES]);

  const item = await prisma.inventoryItem.findUnique({
    where: { id: input.inventoryItemId },
    include: { product: true, location: { include: { rooms: true } } },
  });
  if (!item || item.product.ledger !== "BACKBAR") return { error: "Producto de backbar no encontrado." };
  if (!item.contentMl || item.contentMl <= 0) {
    return { error: "Falta configurar los ml por envase de este producto en Inventario." };
  }
  if (!item.paoDays || item.paoDays <= 0) {
    return { error: "Falta configurar la duración tras abrir de este producto en Inventario." };
  }
  if (item.qty < 1) return { error: "No hay envases sellados en el backbar. Pide que muevan uno del almacén." };

  const communal = item.scope === "COMMUNAL";
  if (communal) {
    if (!input.roomId || !item.location.rooms.some((r) => r.id === input.roomId)) {
      return { error: "Elige la cabina donde se va a usar." };
    }
  }

  const alreadyOpen = await prisma.openContainer.findFirst({
    where: {
      inventoryItemId: item.id,
      status: "OPEN",
      ...(communal ? { roomId: input.roomId! } : { ownerUserId: user.id }),
    },
  });
  if (alreadyOpen) {
    return {
      error: communal
        ? "Esa cabina ya tiene un envase abierto de este producto. Termínalo antes de abrir otro."
        : "Ya tienes un envase abierto de este producto. Termínalo antes de abrir otro.",
    };
  }

  const now = new Date();
  const expiresOn = containerLimit(now, item.paoDays, item.expiresOn);
  await prisma.$transaction([
    prisma.openContainer.create({
      data: {
        inventoryItemId: item.id,
        scope: item.scope,
        roomId: communal ? input.roomId! : null,
        ownerUserId: communal ? null : user.id,
        openedByUserId: user.id,
        openedAt: now,
        contentMl: item.contentMl,
        remainingMl: item.contentMl,
        expiresOn,
      },
    }),
    prisma.inventoryItem.update({ where: { id: item.id }, data: { qty: { decrement: 1 } } }),
    prisma.inventoryTransaction.create({
      data: {
        inventoryItemId: item.id,
        type: "BACKBAR_USAGE",
        qtyDelta: -1,
        reason: "Apertura de envase",
      },
    }),
  ]);
  revalidatePath("/staff/open-product");
  revalidatePath("/admin/inventory");
  return { ok: true, expiresOn: expiresOn.toISOString() };
}

// The esthetician closes a container that is used up (or being set aside).
// What is left in it, if anything, is waste — tracked in the next phase.
export async function finishContainerAction(containerId: string): Promise<{ error?: string }> {
  await requireStaffRole([...STAFF_ROLES]);
  const container = await prisma.openContainer.findUnique({ where: { id: containerId } });
  if (!container || container.status !== "OPEN") return { error: "Ese envase ya no está abierto." };
  await prisma.openContainer.update({
    where: { id: containerId },
    data: { status: "FINISHED", closedAt: new Date() },
  });
  revalidatePath("/staff/open-product");
  revalidatePath("/admin/inventory");
  return {};
}
