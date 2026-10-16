"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireClientOrPreview, requireStaffRole } from "@/lib/auth/dal";
import { isDepositRequired } from "@/lib/deposit-settings";
import {
  insertAppointment,
  createPendingDepositCheckout,
  getAvailableSlots,
  type CreateAppointmentInput,
  type CreateAppointmentResult,
} from "@/lib/booking-core";

export type { CreateAppointmentInput, CreateAppointmentResult };

// Backs the schedule step's grayed-out slots — public booking-availability
// info, not client-specific, so no auth gate beyond "is this app running."
export async function getAvailableSlotsAction(input: {
  locationName: string;
  date: string;
  durationTier: "Targeted" | "Signature";
  protocolName: string | null;
  addOnIds?: string[];
  times: string[];
}): Promise<Record<string, boolean>> {
  return getAvailableSlots(input);
}

// Books straight through only for appointment types that don't need a
// deposit (Configuración → Depósitos). A type that does need one goes through
// createClientDepositCheckoutAction instead, so this refuses it here too —
// otherwise calling the action directly would skip the deposit.
export async function createAppointmentAction(
  input: CreateAppointmentInput,
): Promise<CreateAppointmentResult> {
  const { client } = await requireClientOrPreview();
  if (await isDepositRequired(input.durationTier)) {
    return { error: "Este tipo de cita requiere depósito. Reserva de nuevo y paga el depósito para confirmarla." };
  }
  return insertAppointment({ ...input, clientId: client.id });
}

// Signature's real deposit path: creates a Stripe Checkout Session instead
// of a bare deposit row — the appointment itself isn't written until the
// Stripe webhook confirms payment (confirmDepositAndBook in booking-core),
// same flow the WhatsApp bot already uses. If Stripe isn't configured,
// callers should fall back to showing that as an error, not silently
// booking for free.
export async function createClientDepositCheckoutAction(
  input: CreateAppointmentInput,
): Promise<{ checkoutUrl: string } | { error: string }> {
  const { client } = await requireClientOrPreview();
  const origin = (await headers()).get("origin") ?? "";

  return createPendingDepositCheckout(
    { ...input, clientId: client.id },
    {
      successUrl: `${origin}/my/appointments?depositoConfirmado=1`,
      cancelUrl: `${origin}/my/book`,
    },
  );
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
  const { client } = await requireClientOrPreview();
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
