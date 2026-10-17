"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireStaffRole } from "@/lib/auth/dal";
import { CLEAN_CHECKLIST, canCheckOut, isShiftStale } from "@/lib/shift-rules";

// Esthetician check-in / check-out. The cabina chosen at check-in decides which
// clients she sees that day; the check-out is her signature that she left the
// station clean.

const SHIFT_ROLES = ["ESTHETICIAN", "OWNER", "CLINIC_MANAGER"] as const;

export type ShiftResult = { error: string } | { ok: true };

export async function checkInAction(input: { locationId: string; roomId: string }): Promise<ShiftResult> {
  const user = await requireStaffRole([...SHIFT_ROLES]);

  const room = await prisma.room.findUnique({ where: { id: input.roomId }, include: { location: true } });
  if (!room || room.locationId !== input.locationId) return { error: "Elige una sede y una cabina válidas." };
  if (!room.location.isActive) return { error: "Esa sede no está activa." };

  const open = await prisma.staffShift.findMany({
    where: { checkOutAt: null, autoClosed: false, OR: [{ userId: user.id }, { roomId: room.id }] },
    include: { user: { select: { name: true } } },
  });
  const now = new Date();

  // Shifts left open from an earlier day (hers or the cabina's) are closed as
  // forgotten so they stop holding the cabina.
  const stale = open.filter((s) => isShiftStale(s.checkInAt, now));
  if (stale.length > 0) {
    await prisma.staffShift.updateMany({
      where: { id: { in: stale.map((s) => s.id) } },
      data: { autoClosed: true },
    });
  }
  const live = open.filter((s) => !isShiftStale(s.checkInAt, now));
  if (live.some((s) => s.userId === user.id)) return { error: "Ya registraste tu entrada hoy." };
  const taken = live.find((s) => s.roomId === room.id);
  if (taken) return { error: `${room.name} ya está ocupada por ${taken.user.name}. Elige otra cabina.` };

  try {
    await prisma.staffShift.create({
      data: { userId: user.id, locationId: room.locationId, roomId: room.id },
    });
  } catch {
    // The partial unique indexes caught a simultaneous check-in.
    return { error: "Esa cabina acaba de ser tomada. Elige otra." };
  }
  revalidatePath("/staff", "layout");
  return { ok: true };
}

export async function checkOutAction(input: {
  checklist: boolean[];
  cleanSignoff: boolean;
  note?: string;
}): Promise<ShiftResult> {
  const user = await requireStaffRole([...SHIFT_ROLES]);

  if (!canCheckOut({ checklist: input.checklist, cleanSignoff: input.cleanSignoff })) {
    return { error: `Confirma los ${CLEAN_CHECKLIST.length} puntos y firma que dejaste tu estación limpia.` };
  }

  const open = await prisma.staffShift.findMany({
    where: { userId: user.id, checkOutAt: null, autoClosed: false },
    orderBy: { checkInAt: "desc" },
  });
  const shift = open.find((s) => !isShiftStale(s.checkInAt));
  if (!shift) return { error: "No tienes una entrada abierta hoy." };

  const note = input.note?.trim().slice(0, 500) || null;
  await prisma.staffShift.update({
    where: { id: shift.id },
    data: { checkOutAt: new Date(), cleanSignoff: true, checkOutNote: note },
  });
  revalidatePath("/staff", "layout");
  return { ok: true };
}
