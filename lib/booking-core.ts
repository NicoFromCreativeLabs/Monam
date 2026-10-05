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
}

export type CreateAppointmentResult = { error: string } | { appointmentId: string };

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
  depositId?: string;
}): Promise<CreateAppointmentResult> {
  const location = await prisma.location.findFirst({ where: { name: params.locationName } });
  if (!location) return { error: "Sucursal no encontrada." };

  const [hour, minute] = params.time.split(":").map(Number);
  const [year, month, day] = params.date.split("-").map(Number);
  const startAt = new Date(year, month - 1, day, hour, minute);
  const durationMin = params.durationTier === "Signature" ? 60 : 30;
  const endAt = new Date(startAt.getTime() + durationMin * 60000);

  const protocol = params.protocolName
    ? await prisma.protocol.findUnique({ where: { name: params.protocolName } })
    : null;

  const assignment = await findAvailableAssignment(location.id, startAt, endAt, params.durationTier);
  if (!assignment) {
    return { error: "Ese horario ya no está disponible — elige otro." };
  }

  try {
    const appointment = await prisma.appointment.create({
      data: {
        clientId: params.clientId,
        locationId: location.id,
        roomId: assignment.roomId,
        estheticianId: assignment.estheticianId,
        deviceId: assignment.deviceId ?? undefined,
        protocolId: protocol?.id,
        durationTier: params.durationTier === "Signature" ? "SIGNATURE" : "TARGETED",
        startAt,
        endAt,
        status: "CONFIRMED",
        depositId: params.depositId,
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
