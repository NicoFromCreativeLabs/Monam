"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireClient, requireStaffRole } from "@/lib/auth/dal";
import {
  insertAppointment,
  DEPOSIT_AMOUNT_MXN,
  type CreateAppointmentInput,
  type CreateAppointmentResult,
} from "@/lib/booking-core";

export type { CreateAppointmentInput, CreateAppointmentResult };

export async function createAppointmentAction(
  input: CreateAppointmentInput,
): Promise<CreateAppointmentResult> {
  const client = await requireClient();

  let depositId: string | undefined;
  if (input.durationTier === "Signature") {
    const deposit = await prisma.deposit.create({
      data: { clientId: client.id, amountMxn: DEPOSIT_AMOUNT_MXN, status: "HELD" },
    });
    depositId = deposit.id;
  }

  return insertAppointment({ ...input, clientId: client.id, depositId });
}

export interface CreateManualAppointmentInput extends CreateAppointmentInput {
  clientId: string;
}

// Front Desk / Owner / Clinic Manager entering a booking taken by phone,
// WhatsApp, Instagram DM, or a walk-in — the "one source of truth, zero
// double entry" constraint (spec, non-negotiable): it must land in the same
// calendar as a client's own online booking, not a side spreadsheet. No
// online deposit is collected here — a Signature walk-in's deposit, if any,
// is taken at the front desk directly, not through this flow.
export async function createManualAppointmentAction(
  input: CreateManualAppointmentInput,
): Promise<CreateAppointmentResult> {
  await requireStaffRole(["FRONT_DESK", "OWNER", "CLINIC_MANAGER"]);

  const client = await prisma.client.findUnique({ where: { id: input.clientId } });
  if (!client || client.anonymizedAt) return { error: "Clienta no encontrada." };

  return insertAppointment(input);
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

export type ReassignAppointmentResult = { error: string } | { ok: true };

// Admin calendar's "reassign/override" (spec §6.3) — moving an existing
// appointment to a different room, esthetician, and/or (for a Signature
// appointment) the shared device, same time slot. The EXCLUDE constraints
// are still what actually prevent a double-booking; a caught conflict here
// just gets attributed to whichever resource changed, so the flag on the
// calendar reads as a device conflict rather than a generic one.
export async function reassignAppointmentAction(
  appointmentId: string,
  roomId: string,
  estheticianId: string,
  deviceId: string | null,
): Promise<ReassignAppointmentResult> {
  await requireStaffRole(["FRONT_DESK", "OWNER", "CLINIC_MANAGER"]);

  const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!appointment) return { error: "Cita no encontrada." };
  if (appointment.status === "CANCELLED" || appointment.status === "COMPLETED") {
    return { error: "Esta cita ya no se puede reasignar." };
  }

  try {
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { roomId, estheticianId, deviceId },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    if (message.includes("no_device_overlap")) {
      return { error: "Ese dispositivo ya está en uso en ese horario — elige otro o deja sin dispositivo." };
    }
    return { error: "Ese horario ya no está disponible en la sala o con la esteticista elegida." };
  }

  revalidatePath("/admin/calendar");
  revalidatePath("/staff/check-in");
  revalidatePath("/staff");
  return { ok: true };
}
