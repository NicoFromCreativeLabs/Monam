import { prisma } from "@/lib/prisma";
import { getCurrentAppUser } from "@/lib/auth/dal";
import { getTodayAppointments, isAppointmentDone, pickNextAppointment } from "@/lib/appointments";
import { StaffTreatmentRecordView, type TreatmentClient } from "@/components/panel/StaffTreatmentRecordView";

export default async function StaffTreatmentRecord({
  searchParams,
}: {
  searchParams: Promise<{ appointment?: string }>;
}) {
  const { appointment: requestedId } = await searchParams;
  const romaNorte = await prisma.location.findFirst({ where: { name: "Roma Norte" } });
  const agenda = romaNorte ? await getTodayAppointments(romaNorte.id) : [];
  const currentUser = await getCurrentAppUser();

  // Same "which appointment is up next" scoping as app/staff/page.tsx,
  // excluding appointments already completed (already recorded, nothing
  // left to do here): the real logged-in esthetician's own next
  // appointment, falling back to the location's earliest for the
  // role-toggle preview.
  // The one chosen from "Siguiente cliente" (?appointment=...) if it is still
  // pending; otherwise the same pick "Siguiente cliente" makes.
  const requested = requestedId ? agenda.find((a) => a.id === requestedId && !isAppointmentDone(a)) : null;
  const next = requested ?? pickNextAppointment(agenda, currentUser?.id ?? null);

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
      bookedAddOnIds: (
        await prisma.appointmentAddOn.findMany({ where: { appointmentId: next.id }, select: { addOnId: true } })
      ).map((a) => a.addOnId),
    };
  }

  // Real backbar stock at this location (the products an esthetician can log).
  const backbarItems = romaNorte
    ? await prisma.inventoryItem.findMany({
        where: { locationId: romaNorte.id, product: { ledger: "BACKBAR", isActive: true } },
        include: { product: true },
        orderBy: { product: { name: "asc" } },
      })
    : [];
  const backbarProducts = backbarItems.map((i) => ({ sku: i.product.sku, name: i.product.name }));

  return <StaffTreatmentRecordView client={client} backbarProducts={backbarProducts} />;
}
