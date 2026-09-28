"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireClient, requireStaffRole } from "@/lib/auth/dal";

const DEPOSIT_AMOUNT_MXN = 500;

// The client never picks a specific esthetician, room, or device (spec:
// deliberate, so a client can't be steered to one specific esteticista who
// might leave) — this assigns the first room+esthetician at the location
// with no real conflicting appointment in this window. The EXCLUDE
// constraints on `appointments` (btree_gist, prisma/schema.prisma) are the
// actual safety net against a race between two concurrent bookings; this
// query is just how a free slot gets *found*, not what makes it safe.
async function findAvailableAssignment(locationId: string, startAt: Date, endAt: Date) {
  const [rooms, estheticians] = await Promise.all([
    prisma.room.findMany({ where: { locationId } }),
    prisma.appUser.findMany({
      where: {
        role: "ESTHETICIAN",
        status: "ACTIVE",
        locationAssignments: { some: { locationId } },
      },
    }),
  ]);

  const overlapping = await prisma.appointment.findMany({
    where: {
      locationId,
      status: { notIn: ["CANCELLED", "NO_SHOW"] },
      startAt: { lt: endAt },
      endAt: { gt: startAt },
    },
    select: { roomId: true, estheticianId: true },
  });
  const busyRooms = new Set(overlapping.map((a) => a.roomId));
  const busyEstheticians = new Set(overlapping.map((a) => a.estheticianId));

  const room = rooms.find((r) => !busyRooms.has(r.id));
  const esthetician = estheticians.find((e) => !busyEstheticians.has(e.id));
  if (!room || !esthetician) return null;
  return { roomId: room.id, estheticianId: esthetician.id };
}

export interface CreateAppointmentInput {
  locationName: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  durationTier: "Targeted" | "Signature";
  protocolName: string | null; // the chosen Signature facial; null for Targeted (assigned on arrival)
}

export type CreateAppointmentResult = { error: string } | { appointmentId: string };

export async function createAppointmentAction(
  input: CreateAppointmentInput,
): Promise<CreateAppointmentResult> {
  const client = await requireClient();

  const location = await prisma.location.findFirst({ where: { name: input.locationName } });
  if (!location) return { error: "Sucursal no encontrada." };

  const [hour, minute] = input.time.split(":").map(Number);
  const [year, month, day] = input.date.split("-").map(Number);
  const startAt = new Date(year, month - 1, day, hour, minute);
  const durationMin = input.durationTier === "Signature" ? 60 : 30;
  const endAt = new Date(startAt.getTime() + durationMin * 60000);

  const protocol = input.protocolName
    ? await prisma.protocol.findUnique({ where: { name: input.protocolName } })
    : null;

  const assignment = await findAvailableAssignment(location.id, startAt, endAt);
  if (!assignment) {
    return { error: "Ese horario ya no está disponible — elige otro." };
  }

  let depositId: string | undefined;
  if (input.durationTier === "Signature") {
    const deposit = await prisma.deposit.create({
      data: { clientId: client.id, amountMxn: DEPOSIT_AMOUNT_MXN, status: "HELD" },
    });
    depositId = deposit.id;
  }

  try {
    const appointment = await prisma.appointment.create({
      data: {
        clientId: client.id,
        locationId: location.id,
        roomId: assignment.roomId,
        estheticianId: assignment.estheticianId,
        protocolId: protocol?.id,
        durationTier: input.durationTier === "Signature" ? "SIGNATURE" : "TARGETED",
        startAt,
        endAt,
        status: "CONFIRMED",
        depositId,
      },
    });
    revalidatePath("/my/appointments");
    revalidatePath("/my");
    revalidatePath("/staff/check-in");
    revalidatePath("/staff");
    revalidatePath("/admin/calendar");
    return { appointmentId: appointment.id };
  } catch {
    // The EXCLUDE constraint caught a race that findAvailableAssignment's
    // own (non-transactional) read missed — same outcome as never finding
    // a free slot, just a hair later.
    if (depositId) await prisma.deposit.delete({ where: { id: depositId } }).catch(() => {});
    return { error: "Ese horario ya no está disponible — elige otro." };
  }
}

// Client self-service cancel — also used by "Reagendar" (cancel, then the
// client rebooks from scratch via /my/book, same as before this phase).
export async function cancelAppointmentAction(appointmentId: string) {
  const client = await requireClient();
  const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!appointment || appointment.clientId !== client.id) {
    throw new Error("No se encontró la cita.");
  }
  await prisma.appointment.update({ where: { id: appointmentId }, data: { status: "CANCELLED" } });
  revalidatePath("/my/appointments");
  revalidatePath("/my");
}

// Front Desk "Registrar llegada" — moves a booked/waiting appointment to
// REGISTERED (spec §7.3: confirm Skin ID/consents complete before
// proceeding, handled by the page itself, not this action).
export async function checkInAction(appointmentId: string) {
  await requireStaffRole(["FRONT_DESK", "OWNER", "CLINIC_MANAGER"]);
  await prisma.appointment.update({ where: { id: appointmentId }, data: { status: "REGISTERED" } });
  revalidatePath("/staff/check-in");
  revalidatePath("/staff");
  revalidatePath("/admin/calendar");
}
