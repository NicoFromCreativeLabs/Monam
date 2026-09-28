import "server-only";
import { prisma } from "@/lib/prisma";

export const STATUS_LABEL_ES: Record<string, string> = {
  REGISTERED: "Registrado",
  WAITING: "Esperando",
  LATE: "Retrasado",
  CONFIRMED: "Confirmado",
  IN_PROGRESS: "En progreso",
  COMPLETED: "Completado",
  CANCELLED: "Cancelado",
  NO_SHOW: "No show",
};

export interface TodayAppointmentView {
  id: string;
  time: string;
  clientId: string;
  clientName: string;
  tier: "Targeted" | "Signature";
  room: string;
  estheticianId: string;
  esthetician: string;
  status: string;
  statusRaw: string;
  flags: string[];
}

function todayRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

function formatTime(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// Shared by staff/check-in, staff (Hoy dashboard), admin/calendar, and
// treatment-record — one real query instead of each page re-deriving
// "today" from TODAY_APPOINTMENTS mock data.
export async function getTodayAppointments(locationId: string): Promise<TodayAppointmentView[]> {
  const { start, end } = todayRange();

  const appointments = await prisma.appointment.findMany({
    where: {
      locationId,
      startAt: { gte: start, lt: end },
      status: { notIn: ["CANCELLED", "NO_SHOW"] },
    },
    include: {
      client: { include: { skinId: true } },
      room: true,
      esthetician: true,
    },
    orderBy: { startAt: "asc" },
  });

  // A client's very first appointment ever, across all locations/time —
  // computed once per client id present in today's list rather than N+1
  // queries per row.
  const clientIds = [...new Set(appointments.map((a) => a.clientId))];
  const firstAppointmentByClient = await Promise.all(
    clientIds.map(async (clientId) => {
      const earliest = await prisma.appointment.findFirst({
        where: { clientId, status: { notIn: ["CANCELLED", "NO_SHOW"] } },
        orderBy: { startAt: "asc" },
        select: { id: true },
      });
      return [clientId, earliest?.id] as const;
    }),
  );
  const firstApptId = new Map(firstAppointmentByClient);

  return appointments.map((a) => {
    const flags: string[] = [];
    if (firstApptId.get(a.clientId) === a.id) flags.push("Primera visita");
    if (a.client.skinId && a.client.skinId.allergies.length > 0) {
      flags.push(`Alergia: ${a.client.skinId.allergies.join(", ")}`);
    }
    return {
      id: a.id,
      time: formatTime(a.startAt),
      clientId: a.clientId,
      clientName: a.client.name,
      tier: a.durationTier === "SIGNATURE" ? "Signature" : "Targeted",
      room: a.room.name,
      estheticianId: a.estheticianId,
      esthetician: a.esthetician.name,
      status: STATUS_LABEL_ES[a.status] ?? a.status,
      statusRaw: a.status,
      flags,
    };
  });
}

export interface PendingCheckoutView {
  appointmentId: string;
  clientName: string;
  service: { name: string; price: number };
  finishedAt: string;
}

// The esthetician→front-desk hand-off, as a real query instead of an
// in-memory queue: today's completed treatments at this location with no
// real "checked out" marker yet. Until the Commerce phase adds a real Sale
// row per appointment, every COMPLETED appointment today reads as pending —
// correct for now since nothing else can close one out yet.
export async function getPendingCheckouts(locationId: string): Promise<PendingCheckoutView[]> {
  const { start, end } = todayRange();

  const appointments = await prisma.appointment.findMany({
    where: {
      locationId,
      status: "COMPLETED",
      startAt: { gte: start, lt: end },
    },
    include: { client: true, protocol: true, treatmentRecord: true },
  });

  return appointments
    .filter((a) => a.treatmentRecord)
    .sort((a, b) => a.treatmentRecord!.completedAt.getTime() - b.treatmentRecord!.completedAt.getTime())
    .map((a) => ({
      appointmentId: a.id,
      clientName: a.client.name,
      service: { name: a.protocol?.name ?? "Facial", price: a.protocol?.priceMxn ?? 0 },
      finishedAt: formatTime(a.treatmentRecord!.completedAt),
    }));
}
