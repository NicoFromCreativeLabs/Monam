import { prisma } from "@/lib/prisma";
import { getCurrentAppUser } from "@/lib/auth/dal";
import { getTodayAppointments } from "@/lib/appointments";
import { StaffTreatmentRecordView, type TreatmentClient } from "@/components/panel/StaffTreatmentRecordView";

export default async function StaffTreatmentRecord() {
  const romaNorte = await prisma.location.findFirst({ where: { name: "Roma Norte" } });
  const agenda = romaNorte ? await getTodayAppointments(romaNorte.id) : [];
  const currentUser = await getCurrentAppUser();

  // Same "which appointment is up next" scoping as app/staff/page.tsx,
  // excluding appointments already completed (already recorded, nothing
  // left to do here): the real logged-in esthetician's own next
  // appointment, falling back to the location's earliest for the
  // role-toggle preview.
  const undone = agenda.filter((a) => a.statusRaw !== "COMPLETED");
  const ownAppointments = currentUser ? undone.filter((a) => a.estheticianId === currentUser.id) : [];
  const next = ownAppointments[0] ?? undone[0] ?? null;

  let client: TreatmentClient | null = null;

  if (next) {
    const record = await prisma.client.findUnique({
      where: { id: next.clientId },
      include: { skinId: true },
    });
    client = {
      appointmentId: next.id,
      clientName: next.clientName,
      tier: next.tier,
      allergies: record?.skinId?.allergies ?? [],
    };
  }

  return <StaffTreatmentRecordView client={client} />;
}
