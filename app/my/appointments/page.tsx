import { prisma } from "@/lib/prisma";
import { requireClientOrPreview } from "@/lib/auth/dal";
import {
  ClientAppointmentsView,
  type UpcomingAppointmentView,
  type PastAppointmentView,
} from "@/components/panel/ClientAppointmentsView";

function formatDate(d: Date) {
  return d.toISOString().slice(0, 10);
}
function formatTime(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default async function ClientAppointmentsPage() {
  const { client } = await requireClientOrPreview();
  const now = new Date();

  const [upcomingRows, pastRows] = await Promise.all([
    prisma.appointment.findMany({
      where: { clientId: client.id, startAt: { gte: now }, status: { notIn: ["CANCELLED", "NO_SHOW"] } },
      include: { protocol: true, location: true, deposit: true },
      orderBy: { startAt: "asc" },
    }),
    prisma.appointment.findMany({
      where: { clientId: client.id, startAt: { lt: now }, status: { notIn: ["CANCELLED", "NO_SHOW"] } },
      include: { protocol: true, location: true },
      orderBy: { startAt: "desc" },
      take: 10,
    }),
  ]);

  const upcoming: UpcomingAppointmentView[] = upcomingRows.map((a) => ({
    id: a.id,
    protocolTier: `${a.protocol?.name ?? a.durationTier} (${a.durationTier === "SIGNATURE" ? 60 : 30} min)`,
    date: formatDate(a.startAt),
    time: formatTime(a.startAt),
    location: a.location.name,
    depositPaid: a.deposit !== null,
  }));

  const past: PastAppointmentView[] = pastRows.map((a) => ({
    id: a.id,
    protocol: a.protocol?.name ?? a.durationTier,
    date: formatDate(a.startAt),
    time: formatTime(a.startAt),
    location: a.location.name,
  }));

  return <ClientAppointmentsView upcoming={upcoming} past={past} />;
}
