import { prisma } from "@/lib/prisma";
import { requireClientOrPreview } from "@/lib/auth/dal";
import { ClientHomeView } from "@/components/panel/ClientHomeView";
import type { UpcomingAppointmentView } from "@/components/panel/ClientAppointmentsView";

function formatDate(d: Date) {
  return d.toISOString().slice(0, 10);
}
function formatTime(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default async function ClientHomePage() {
  const { client } = await requireClientOrPreview();

  const next = await prisma.appointment.findFirst({
    where: { clientId: client.id, startAt: { gte: new Date() }, status: { notIn: ["CANCELLED", "NO_SHOW"] } },
    include: { protocol: true, location: true, deposit: true },
    orderBy: { startAt: "asc" },
  });

  const nextAppointment: UpcomingAppointmentView | null = next
    ? {
        id: next.id,
        protocolTier: `${next.protocol?.name ?? next.durationTier} (${next.durationTier === "SIGNATURE" ? 60 : 30} min)`,
        date: formatDate(next.startAt),
        time: formatTime(next.startAt),
        location: next.location.name,
        depositPaid: next.deposit !== null,
      }
    : null;

  return <ClientHomeView nextAppointment={nextAppointment} />;
}
