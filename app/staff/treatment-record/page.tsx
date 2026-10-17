import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentAppUser } from "@/lib/auth/dal";
import { getTodayAppointments, isAppointmentDone, pickNextAppointment } from "@/lib/appointments";
import { getActiveShift } from "@/lib/shifts";
import { StaffTreatmentRecordView, type TreatmentClient } from "@/components/panel/StaffTreatmentRecordView";

export default async function StaffTreatmentRecord({
  searchParams,
}: {
  searchParams: Promise<{ appointment?: string }>;
}) {
  const { appointment: requestedId } = await searchParams;
  const romaNorte = await prisma.location.findFirst({ where: { name: "Roma Norte" } });
  const allAgenda = romaNorte ? await getTodayAppointments(romaNorte.id) : [];
  const currentUser = await getCurrentAppUser();

  // An esthetician records treatments for the clients of the cabina she
  // checked into; without a check-in she is sent to register her entrance.
  const shift = currentUser && currentUser.role !== "FRONT_DESK" ? await getActiveShift(currentUser.id) : null;
  if (currentUser?.role === "ESTHETICIAN" && !shift) redirect("/staff/shift");
  const agenda = shift ? allAgenda.filter((a) => a.roomId === shift.roomId) : allAgenda;

  // Same "which appointment is up next" scoping as app/staff/page.tsx,
  // excluding appointments already completed (already recorded, nothing
  // left to do here): the real logged-in esthetician's own next
  // appointment, falling back to the location's earliest for the
  // role-toggle preview.
  // The one chosen from "Siguiente cliente" (?appointment=...) if it is still
  // pending; otherwise the same pick "Siguiente cliente" makes.
  const requested = requestedId ? agenda.find((a) => a.id === requestedId && !isAppointmentDone(a)) : null;
  const next = requested ?? pickNextAppointment(agenda, shift ? null : (currentUser?.id ?? null));

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
  // How much open product the esthetician can use for this appointment: the
  // cabina's container for shared products, her own for individual ones.
  const openContainers = backbarItems.length
    ? await prisma.openContainer.findMany({
        where: { inventoryItemId: { in: backbarItems.map((i) => i.id) }, status: "OPEN", expiresOn: { gte: new Date() } },
      })
    : [];
  const backbarProducts = backbarItems.map((i) => ({
    sku: i.product.sku,
    name: i.product.name,
    openMl: openContainers
      .filter(
        (c) =>
          c.inventoryItemId === i.id &&
          (i.scope === "COMMUNAL" ? c.roomId === next?.roomId : c.ownerUserId === currentUser?.id),
      )
      .reduce((sum, c) => sum + c.remainingMl, 0),
  }));

  return <StaffTreatmentRecordView client={client} backbarProducts={backbarProducts} />;
}
