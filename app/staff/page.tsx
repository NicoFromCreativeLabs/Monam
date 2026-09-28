import { prisma } from "@/lib/prisma";
import { getCurrentAppUser } from "@/lib/auth/dal";
import { getTodayAppointments, getPendingCheckouts } from "@/lib/appointments";
import { StaffTodayView, type EstheticianNextClient } from "@/components/panel/StaffTodayView";

export default async function StaffToday() {
  const romaNorte = await prisma.location.findFirst({ where: { name: "Roma Norte" } });
  const agenda = romaNorte ? await getTodayAppointments(romaNorte.id) : [];
  const pendingCheckouts = romaNorte ? await getPendingCheckouts(romaNorte.id) : [];
  const currentUser = await getCurrentAppUser();

  // Scoped to the real logged-in AppUser's own appointments when they
  // actually are the assigned esthetician, excluding ones already treated;
  // falls back to the location's earliest undone appointment so the
  // role-toggle preview (any staff account can preview the Esthetician view
  // without re-authenticating) still shows something representative.
  const undone = agenda.filter((a) => a.statusRaw !== "COMPLETED");
  const ownAppointments = currentUser ? undone.filter((a) => a.estheticianId === currentUser.id) : [];
  const next = ownAppointments[0] ?? undone[0] ?? null;

  let nextClient: EstheticianNextClient = {
    listingId: null,
    appointment: next,
    allergies: [],
    skinType: null,
    lastTreatment: "Sin tratamientos previos",
    beverage: null,
  };

  if (next) {
    const client = await prisma.client.findUnique({
      where: { id: next.clientId },
      include: {
        skinId: true,
        preferences: true,
        appointments: {
          where: { status: "COMPLETED" },
          include: { treatmentRecord: { include: { protocol: true } } },
          orderBy: { startAt: "desc" },
          take: 1,
        },
      },
    });
    const lastTreatmentRecord = client?.appointments[0]?.treatmentRecord;
    nextClient = {
      listingId: client?.id ?? null,
      appointment: next,
      allergies: client?.skinId?.allergies ?? [],
      skinType: client?.skinId?.skinType ?? null,
      lastTreatment: lastTreatmentRecord
        ? `${lastTreatmentRecord.protocol.name} — ${client!.appointments[0].startAt.toISOString().slice(0, 10)}`
        : "Sin tratamientos previos",
      beverage: client?.preferences?.beverage ?? null,
    };
  }

  return <StaffTodayView agenda={agenda} nextClient={nextClient} pendingCheckouts={pendingCheckouts} />;
}
