import "server-only";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

// The actual booking engine, factored out of lib/actions/booking.ts so it
// has exactly one implementation reachable from every entry point — the
// client's own /my/book flow, staff's manual-entry flow, the WhatsApp bot
// (lib/whatsapp/conversation.ts), and the Stripe webhook's deposit
// confirmation — instead of three places each re-deriving "find a free
// room/esthetician/device and insert." Spec's "one source of truth, zero
// double entry" applies to the code path, not just the resulting calendar.

export const DEPOSIT_AMOUNT_MXN = 500;

// Admin-configurable in Settings → Reservas (lib/actions/settings.ts,
// components/panel/AdminSettingsView.tsx). Both fold into the appointment's
// own endAt — the EXCLUDE constraints on `appointments` key off that column,
// so padding it is what actually blocks the next booking from landing
// during cabin turnover, not a separate "buffer" row anyone could forget to
// check.
const DEFAULT_CLEANUP_BUFFER_MIN = 20;
const DEFAULT_ADDON_SAFETY_BUFFER_MIN = 10;

export async function getBookingBuffers(): Promise<{
  cleanupBufferMin: number;
  addonSafetyBufferMin: number;
}> {
  const rows = await prisma.setting.findMany({
    where: { key: { in: ["booking.cleanupBufferMinutes", "booking.addonBufferMinutes"] } },
  });
  const cleanup = rows.find((r) => r.key === "booking.cleanupBufferMinutes");
  const addon = rows.find((r) => r.key === "booking.addonBufferMinutes");
  return {
    cleanupBufferMin: typeof cleanup?.value === "number" ? cleanup.value : DEFAULT_CLEANUP_BUFFER_MIN,
    addonSafetyBufferMin: typeof addon?.value === "number" ? addon.value : DEFAULT_ADDON_SAFETY_BUFFER_MIN,
  };
}

// The client never picks a specific esthetician, room, or device (spec:
// deliberate, so a client can't be steered to one specific esteticista who
// might leave) — this assigns the first room+esthetician (and, for a
// Signature appointment, the shared device — spec §5.2: the LED panel is a
// portable, single-unit resource, not tied to one room) at the location
// with no real conflicting appointment in this window. The EXCLUDE
// constraints on `appointments` (btree_gist, prisma/schema.prisma) are the
// actual safety net against a race between two concurrent bookings; this
// query is just how a free slot gets *found*, not what makes it safe.
async function findAvailableAssignment(
  locationId: string,
  startAt: Date,
  endAt: Date,
  tier: "Targeted" | "Signature",
) {
  const [rooms, estheticians, devices] = await Promise.all([
    prisma.room.findMany({ where: { locationId } }),
    prisma.appUser.findMany({
      where: {
        role: "ESTHETICIAN",
        status: "ACTIVE",
        locationAssignments: { some: { locationId } },
      },
    }),
    prisma.device.findMany({ where: { locationId } }),
  ]);

  const overlapping = await prisma.appointment.findMany({
    where: {
      locationId,
      status: { notIn: ["CANCELLED", "NO_SHOW"] },
      startAt: { lt: endAt },
      endAt: { gt: startAt },
    },
    select: { roomId: true, estheticianId: true, deviceId: true },
  });
  const busyRooms = new Set(overlapping.map((a) => a.roomId));
  const busyEstheticians = new Set(overlapping.map((a) => a.estheticianId));
  const busyDevices = new Set(overlapping.map((a) => a.deviceId).filter(Boolean));

  const room = rooms.find((r) => !busyRooms.has(r.id));
  const esthetician = estheticians.find((e) => !busyEstheticians.has(e.id));
  if (!room || !esthetician) return null;

  // Targeted appointments don't use the shared device at all — only
  // Signature does. If every device is busy, the appointment still can't be
  // booked (same "no slot" outcome as a busy room/esthetician).
  if (tier !== "Signature" || devices.length === 0) {
    return { roomId: room.id, estheticianId: esthetician.id, deviceId: null as string | null };
  }
  const device = devices.find((d) => !busyDevices.has(d.id));
  if (!device) return null;
  return { roomId: room.id, estheticianId: esthetician.id, deviceId: device.id };
}

export interface CreateAppointmentInput {
  locationName: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  durationTier: "Targeted" | "Signature";
  protocolName: string | null; // the chosen Signature facial; null for Targeted (assigned on arrival)
  addOnIds?: string[]; // add-ons picked during booking — each one's extraMinutes pads the real slot
}

export type CreateAppointmentResult = { error: string } | { appointmentId: string };

// Shared by insertAppointment and getAvailableSlots below so both ever
// derive the blocked window (duration + add-on minutes + buffers) the exact
// same way — a slot the schedule step shows as free has to mean the same
// thing as what insertAppointment itself will check moments later.
async function resolveBookingWindow(params: {
  locationName: string;
  date: string;
  durationTier: "Targeted" | "Signature";
  protocolName: string | null;
  addOnIds?: string[];
}) {
  const location = await prisma.location.findFirst({ where: { name: params.locationName } });
  if (!location) return null;

  const protocol = params.protocolName
    ? await prisma.protocol.findUnique({ where: { name: params.protocolName } })
    : null;

  const MAX_ADD_ONS = 2;
  const addOnIds = (params.addOnIds ?? []).slice(0, MAX_ADD_ONS);
  const addOns = addOnIds.length > 0 ? await prisma.addOn.findMany({ where: { id: { in: addOnIds } } }) : [];
  const addOnMinutes = addOns.reduce((sum, a) => sum + a.extraMinutes, 0);
  const { cleanupBufferMin, addonSafetyBufferMin } = await getBookingBuffers();

  const baseDurationMin = protocol?.durationMin ?? (params.durationTier === "Signature" ? 60 : 30);
  // The actual add-ons picked always pad the slot by their real minutes; the
  // addon safety buffer only applies on top when none were picked yet — it
  // covers a client who asks for one in person, so the next appointment
  // can't be booked flush against a slot that might still grow.
  const blockedDurationMin =
    baseDurationMin + addOnMinutes + cleanupBufferMin + (addOnMinutes === 0 ? addonSafetyBufferMin : 0);

  const [year, month, day] = params.date.split("-").map(Number);
  return {
    locationId: location.id,
    year,
    month,
    day,
    blockedDurationMin,
    addOns: addOns.map((a) => ({ id: a.id, priceMxn: a.priceMxn })),
  };
}

function slotWindow(window: { year: number; month: number; day: number; blockedDurationMin: number }, time: string) {
  const [hour, minute] = time.split(":").map(Number);
  const startAt = new Date(window.year, window.month - 1, window.day, hour, minute);
  const endAt = new Date(startAt.getTime() + window.blockedDurationMin * 60000);
  return { startAt, endAt };
}

// Drives the schedule step's grayed-out slots — for each candidate HH:MM
// time, whether findAvailableAssignment would actually find a free
// room+esthetician(+device for Signature). Same resolveBookingWindow/
// findAvailableAssignment insertAppointment uses, so "shown as available"
// can't drift from "actually bookable." One query round-trip per candidate
// slot — fine at this studio's scale (a handful of rooms/estheticians over
// a single day), not worth a bulkier batched query yet.
export async function getAvailableSlots(params: {
  locationName: string;
  date: string;
  durationTier: "Targeted" | "Signature";
  protocolName: string | null;
  addOnIds?: string[];
  times: string[];
}): Promise<Record<string, boolean>> {
  const window = await resolveBookingWindow(params);
  if (!window) return Object.fromEntries(params.times.map((t) => [t, false]));

  const entries = await Promise.all(
    params.times.map(async (time) => {
      const { startAt, endAt } = slotWindow(window, time);
      const assignment = await findAvailableAssignment(window.locationId, startAt, endAt, params.durationTier);
      return [time, assignment !== null] as const;
    }),
  );
  return Object.fromEntries(entries);
}

// Resolves location/protocol, finds a free room+esthetician+device, and
// inserts. The EXCLUDE constraint is still the real safety net against a
// race this (non-transactional) read misses; a caught insert error reads
// the same as "no slot found," just a hair later.
export async function insertAppointment(params: {
  clientId: string;
  locationName: string;
  date: string;
  time: string;
  durationTier: "Targeted" | "Signature";
  protocolName: string | null;
  addOnIds?: string[];
  depositId?: string;
}): Promise<CreateAppointmentResult> {
  const window = await resolveBookingWindow(params);
  if (!window) return { error: "Sucursal no encontrada." };
  const { startAt, endAt } = slotWindow(window, params.time);

  const assignment = await findAvailableAssignment(window.locationId, startAt, endAt, params.durationTier);
  if (!assignment) {
    return { error: "Ese horario ya no está disponible — elige otro." };
  }

  const protocol = params.protocolName
    ? await prisma.protocol.findUnique({ where: { name: params.protocolName } })
    : null;

  try {
    const appointment = await prisma.appointment.create({
      data: {
        clientId: params.clientId,
        locationId: window.locationId,
        roomId: assignment.roomId,
        estheticianId: assignment.estheticianId,
        deviceId: assignment.deviceId ?? undefined,
        protocolId: protocol?.id,
        durationTier: params.durationTier === "Signature" ? "SIGNATURE" : "TARGETED",
        startAt,
        endAt,
        status: "CONFIRMED",
        depositId: params.depositId,
        // What the client picked, at the price they were shown — the checkout
        // charges these.
        addOns: { create: window.addOns.map((a) => ({ addOnId: a.id, priceMxn: a.priceMxn })) },
      },
    });
    revalidatePath("/my/appointments");
    revalidatePath("/my");
    revalidatePath("/staff/check-in");
    revalidatePath("/staff");
    revalidatePath("/admin/calendar");
    return { appointmentId: appointment.id };
  } catch {
    if (params.depositId) await prisma.deposit.delete({ where: { id: params.depositId } }).catch(() => {});
    return { error: "Ese horario ya no está disponible — elige otro." };
  }
}

// Deposit-gated booking via a real processor (Stripe): unlike the web/staff
// flows above, the money has to actually clear *before* the slot is
// reserved — asking Stripe for a Checkout Session doesn't touch
// `appointments` at all yet. The full booking input rides along as Stripe
// Checkout Session metadata (small, a few short strings) instead of a new
// DB column, so confirmDepositAndBook() below can reconstruct and insert
// the appointment from nothing but the webhook payload.
export interface PendingBookingDraft extends CreateAppointmentInput {
  clientId: string;
}

export async function createPendingDepositCheckout(
  draft: PendingBookingDraft,
  urls: { successUrl: string; cancelUrl: string },
): Promise<{ checkoutUrl: string } | { error: string }> {
  const { STRIPE_ENABLED } = await import("@/lib/feature-flags");
  if (!STRIPE_ENABLED) return { error: "Stripe no está configurado todavía." };
  const { createDepositCheckout } = await import("@/lib/payments/stripe");

  const client = await prisma.client.findUnique({ where: { id: draft.clientId } });
  if (!client) return { error: "Clienta no encontrada." };

  const deposit = await prisma.deposit.create({
    data: {
      clientId: draft.clientId,
      amountMxn: DEPOSIT_AMOUNT_MXN,
      status: "PENDING_PAYMENT",
      provider: "STRIPE",
    },
  });

  try {
    const checkout = await createDepositCheckout({
      depositId: deposit.id,
      amountMxn: DEPOSIT_AMOUNT_MXN,
      clientName: client.name,
      clientEmail: client.email ?? undefined,
      description: `Depósito — cita ${draft.durationTier}, ${draft.date} ${draft.time}`,
      successUrl: urls.successUrl,
      cancelUrl: urls.cancelUrl,
      metadata: {
        locationName: draft.locationName,
        date: draft.date,
        time: draft.time,
        durationTier: draft.durationTier,
        protocolName: draft.protocolName ?? "",
        addOnIds: (draft.addOnIds ?? []).join(","),
        clientId: draft.clientId,
      },
    });
    await prisma.deposit.update({ where: { id: deposit.id }, data: { externalRef: checkout.sessionId } });
    return { checkoutUrl: checkout.checkoutUrl };
  } catch {
    await prisma.deposit.delete({ where: { id: deposit.id } }).catch(() => {});
    return { error: "No se pudo generar el link de pago — intenta de nuevo." };
  }
}

// Called by the Stripe webhook once a Checkout Session actually completes:
// marks the deposit collected, then — only now — runs the real booking
// engine. If the slot filled up while payment was in flight, the deposit
// stays HELD and un-linked to any appointment; Front Desk resolves that by
// hand (same as any other "paid but couldn't be seated" edge case a real
// front desk already has to handle), rather than silently refunding.
export async function confirmDepositAndBook(
  depositId: string,
  draft: CreateAppointmentInput,
  clientId: string,
): Promise<CreateAppointmentResult> {
  const deposit = await prisma.deposit.findUnique({ where: { id: depositId } });
  if (!deposit || deposit.status !== "PENDING_PAYMENT") {
    return { error: "Depósito no encontrado o ya procesado." };
  }
  await prisma.deposit.update({ where: { id: depositId }, data: { status: "HELD" } });
  return insertAppointment({ ...draft, clientId, depositId });
}

// WhatsApp's Cloud API sends `from` as digits only, no "+" and no spaces
// (e.g. "5215512345678"); every other Client.phone in the app today was
// typed by hand at signup and keeps whatever formatting the person used
// ("+52 55 1234 5678"). Matching on the exact string would silently create
// a duplicate Client for every WhatsApp booking. Compares the last 10
// digits (a Mexican mobile number without country code) instead of relying
// on Client.phone's exact formatting — a real fix would normalize phone
// storage everywhere, which is a bigger change than this integration.
function last10Digits(phone: string): string {
  return phone.replace(/\D/g, "").slice(-10);
}

// Matches the WhatsApp bot's incoming phone number to a Client the same way
// Client.phone already works as the primary identifier (spec §5.1) — reuses
// an existing record (e.g. one entered from a prior manual WhatsApp booking)
// rather than creating a duplicate, and creates a real row with no
// authUserId the first time someone books this way (spec explicitly allows
// a Client to exist before any login does).
export async function findClientByPhone(phone: string) {
  const suffix = last10Digits(phone);
  if (suffix.length < 10) return null;
  // Narrow with a substring match server-side (cheap even at the row counts
  // a two-location studio will ever have), then confirm the digit suffix
  // actually matches rather than just contains it somewhere else.
  const candidates = await prisma.client.findMany({
    where: { anonymizedAt: null, phone: { contains: suffix.slice(-7) } },
  });
  return candidates.find((c) => last10Digits(c.phone) === suffix) ?? null;
}

export async function findOrCreateClientByPhone(phone: string, name: string) {
  const existing = await findClientByPhone(phone);
  if (existing) return existing;
  return prisma.client.create({ data: { phone, name } });
}
