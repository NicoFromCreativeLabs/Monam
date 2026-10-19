"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireStaffRole } from "@/lib/auth/dal";
import { studioNow } from "@/lib/booking-time";
import { getTodayAppointments } from "@/lib/appointments";
import { flagForgottenShifts } from "@/lib/shift-alerts";
import {
  CLEAN_CHECKLIST,
  canCheckOut,
  cashDifference,
  expectedCash,
  frontDeskCheckOutCheck,
  isShiftStale,
} from "@/lib/shift-rules";

// Check-in / check-out. An esthetician checks in choosing the sede and the
// cabina (which decides the clients she sees) and checks out signing that she
// left the station clean. The front desk (vendedor) checks in choosing the sede
// and opening the cash register, and checks out with a checklist and the cash
// count.

const SHIFT_ROLES = ["ESTHETICIAN", "OWNER", "CLINIC_MANAGER"] as const;
const FRONT_DESK_SHIFT_ROLES = ["FRONT_DESK", "OWNER", "CLINIC_MANAGER"] as const;

export type ShiftResult = { error: string } | { ok: true };

// Someone has one open shift at a time. Say which one is in the way, since it
// may be the other kind (an Admin who tried the esthetician's check-in and is
// now trying the front desk's).
function ownShiftMessage(shift: {
  kind: "ESTHETICIAN" | "FRONT_DESK";
  room: { name: string } | null;
  location: { name: string };
}): string {
  return shift.kind === "ESTHETICIAN"
    ? `Ya tienes un turno abierto como esteticista (${shift.room?.name ?? shift.location.name}). Registra primero esa salida, en la vista Esteticista → Mi turno.`
    : `Ya tienes un turno abierto como vendedor en ${shift.location.name}. Registra primero esa salida, en la vista Vendedor → Mi turno.`;
}

export async function checkInAction(input: { locationId: string; roomId: string }): Promise<ShiftResult> {
  const user = await requireStaffRole([...SHIFT_ROLES], { allowWithoutShift: true });

  const room = await prisma.room.findUnique({ where: { id: input.roomId }, include: { location: true } });
  if (!room || room.locationId !== input.locationId) return { error: "Elige una sede y una cabina válidas." };
  if (!room.location.isActive) return { error: "Esa sede no está activa." };

  const open = await prisma.staffShift.findMany({
    where: { checkOutAt: null, autoClosed: false, OR: [{ userId: user.id }, { roomId: room.id }] },
    include: { user: { select: { name: true } }, room: true, location: true },
  });
  const now = new Date();

  // Shifts left open from an earlier day (hers or the cabina's) are closed as
  // forgotten so they stop holding the cabina.
  const stale = open.filter((s) => isShiftStale(s.checkInAt, now));
  if (stale.length > 0) {
    await flagForgottenShifts(stale.map((s) => s.id));
    await prisma.staffShift.updateMany({
      where: { id: { in: stale.map((s) => s.id) } },
      data: { autoClosed: true },
    });
  }
  const live = open.filter((s) => !isShiftStale(s.checkInAt, now));
  const mine = live.find((s) => s.userId === user.id);
  if (mine) return { error: ownShiftMessage(mine) };
  const taken = live.find((s) => s.roomId === room.id);
  if (taken) return { error: `${room.name} ya está ocupada por ${taken.user.name}. Elige otra cabina.` };

  try {
    await prisma.staffShift.create({
      data: { userId: user.id, kind: "ESTHETICIAN", locationId: room.locationId, roomId: room.id },
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
  const user = await requireStaffRole([...SHIFT_ROLES], { allowWithoutShift: true });

  if (!canCheckOut({ checklist: input.checklist, cleanSignoff: input.cleanSignoff })) {
    return { error: `Confirma los ${CLEAN_CHECKLIST.length} puntos y firma que dejaste tu estación limpia.` };
  }

  const open = await prisma.staffShift.findMany({
    where: { userId: user.id, kind: "ESTHETICIAN", checkOutAt: null, autoClosed: false },
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

// ---------------------------------------------------------------------------
// Front desk
// ---------------------------------------------------------------------------

const MAX_FLOAT_MXN = 100000;

export async function frontDeskCheckInAction(input: {
  locationId: string;
  openingFloatMxn: number;
}): Promise<ShiftResult> {
  const user = await requireStaffRole([...FRONT_DESK_SHIFT_ROLES], { allowWithoutShift: true });

  const location = await prisma.location.findUnique({ where: { id: input.locationId } });
  if (!location || !location.isActive) return { error: "Elige una sede válida." };

  const now = new Date();
  const myOpen = await prisma.staffShift.findMany({
    where: { userId: user.id, checkOutAt: null, autoClosed: false },
    include: { room: true, location: true },
  });
  const stale = myOpen.filter((s) => isShiftStale(s.checkInAt, now));
  if (stale.length > 0) {
    await flagForgottenShifts(stale.map((s) => s.id));
    await prisma.staffShift.updateMany({ where: { id: { in: stale.map((s) => s.id) } }, data: { autoClosed: true } });
  }
  const mineNow = myOpen.find((s) => !isShiftStale(s.checkInAt, now));
  if (mineNow) return { error: ownShiftMessage(mineNow) };

  // The cash register: one open per sede. One left open from an earlier day is
  // closed without a count (it was forgotten); one from today is shared.
  const sessions = await prisma.cashRegisterSession.findMany({ where: { locationId: location.id, status: "OPEN" } });
  const today = studioNow(now).date;
  for (const s of sessions.filter((x) => studioNow(x.openedAt).date < today)) {
    await prisma.cashRegisterSession.update({ where: { id: s.id }, data: { status: "CLOSED", closedAt: now } });
  }
  let session = sessions.find((x) => studioNow(x.openedAt).date >= today) ?? null;

  if (!session) {
    const float = Math.round(input.openingFloatMxn);
    if (!Number.isFinite(float) || float < 0 || float > MAX_FLOAT_MXN) {
      return { error: "Ingresa el efectivo con el que abres la caja (fondo)." };
    }
    session = await prisma.cashRegisterSession.create({
      data: { locationId: location.id, openedByUserId: user.id, openingFloatMxn: float },
    });
  }

  try {
    await prisma.staffShift.create({
      data: { userId: user.id, kind: "FRONT_DESK", locationId: location.id, cashSessionId: session.id },
    });
  } catch {
    return { error: "Ya registraste tu entrada hoy." };
  }
  revalidatePath("/staff", "layout");
  revalidatePath("/admin/sales");
  return { ok: true };
}

export type FrontDeskCheckOutResult = { error: string } | { ok: true; cashDifferenceMxn: number | null };

export async function frontDeskCheckOutAction(input: {
  checklist: boolean[];
  signed: boolean;
  countedCashMxn: number | null;
  note?: string;
}): Promise<FrontDeskCheckOutResult> {
  const user = await requireStaffRole([...FRONT_DESK_SHIFT_ROLES], { allowWithoutShift: true });

  const open = await prisma.staffShift.findMany({
    where: { userId: user.id, kind: "FRONT_DESK", checkOutAt: null, autoClosed: false },
    orderBy: { checkInAt: "desc" },
  });
  const shift = open.find((s) => !isShiftStale(s.checkInAt));
  if (!shift) return { error: "No tienes una entrada abierta hoy." };

  // The last person out of the sede closes the caja and counts the cash.
  const others = shift.cashSessionId
    ? await prisma.staffShift.count({
        where: { cashSessionId: shift.cashSessionId, checkOutAt: null, autoClosed: false, id: { not: shift.id } },
      })
    : 0;
  const closesCaja = !!shift.cashSessionId && others === 0;

  // Today's treatments finished but not yet charged at this sede.
  const pendingCharges = (await getTodayAppointments(shift.locationId)).filter(
    (a) => a.treatmentFinished && !a.checkedOut,
  ).length;

  const note = input.note?.trim().slice(0, 500) ?? "";
  const check = frontDeskCheckOutCheck({
    checklist: input.checklist,
    signed: input.signed,
    closesCaja,
    countedMxn: input.countedCashMxn,
    pendingCharges,
    note,
  });
  if (!check.ok) return { error: check.reason };

  let counted: number | null = null;
  let expected: number | null = null;
  if (closesCaja && shift.cashSessionId) {
    const session = await prisma.cashRegisterSession.findUnique({
      where: { id: shift.cashSessionId },
      include: { sales: { select: { totalMxn: true, paymentMethod: true } } },
    });
    if (session) {
      const cashSales = session.sales.filter((s) => s.paymentMethod === "CASH").reduce((sum, s) => sum + s.totalMxn, 0);
      expected = expectedCash(session.openingFloatMxn, cashSales);
      counted = Math.round(input.countedCashMxn ?? 0);
      await prisma.cashRegisterSession.update({
        where: { id: session.id },
        data: { status: "CLOSED", closedAt: new Date(), closingCountedMxn: counted },
      });
    }
  }

  await prisma.staffShift.update({
    where: { id: shift.id },
    data: {
      checkOutAt: new Date(),
      cleanSignoff: true,
      checkOutNote: note || null,
      cashCountedMxn: counted,
      cashExpectedMxn: expected,
    },
  });

  // A count that does not match goes to Control for review.
  const difference = counted !== null && expected !== null ? cashDifference(counted, expected) : null;
  if (difference !== null && difference !== 0) {
    await prisma.anomalyFlag.create({
      data: {
        type: "Diferencia de caja",
        detail: `${user.name}: contó $${counted} y se esperaban $${expected} (${difference > 0 ? "sobran" : "faltan"} $${Math.abs(difference)}).`,
        relatedEntity: shift.cashSessionId,
      },
    });
  }

  revalidatePath("/staff", "layout");
  revalidatePath("/admin/sales");
  revalidatePath("/admin/control");
  return { ok: true, cashDifferenceMxn: difference };
}
