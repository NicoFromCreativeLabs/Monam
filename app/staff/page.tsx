import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentAppUser } from "@/lib/auth/dal";
import { getTodayAppointments, getPendingCheckouts, isAppointmentDone, pickNextAppointment } from "@/lib/appointments";
import { getActiveShift } from "@/lib/shifts";
import { StaffTodayView, type EstheticianNextClient } from "@/components/panel/StaffTodayView";

export default async function StaffToday() {
  const romaNorte = await prisma.location.findFirst({ where: { name: "Roma Norte" } });
  const agenda = romaNorte ? await getTodayAppointments(romaNorte.id) : [];
  const pendingCheckouts = romaNorte ? await getPendingCheckouts(romaNorte.id) : [];
  const currentUser = await getCurrentAppUser();

  // An esthetician works from the cabina she checked into: no check-in, no
  // clients — she is sent to register her entrance first. An Owner/manager
  // previewing the panel is not forced to, but sees the same room-scoped view
  // once they have checked in.
  const shift = currentUser && currentUser.role !== "FRONT_DESK" ? await getActiveShift(currentUser.id) : null;
  if (currentUser?.role === "ESTHETICIAN" && !shift) redirect("/staff/shift");

  // The esthetician's own picture of the day: everything in her cabina when she
  // is checked in (whoever the appointment was booked under), otherwise the
  // whole location's agenda (the role-toggle preview).
  const shiftAgenda = shift
    ? (shift.locationId === romaNorte?.id ? agenda : await getTodayAppointments(shift.locationId)).filter(
        (a) => a.roomId === shift.roomId,
      )
    : agenda;

  // Scoped to the real logged-in AppUser's own appointments when they
  // actually are the assigned esthetician, excluding ones already treated;
  // falls back to the location's earliest undone appointment so the
  // role-toggle preview (any staff account can preview the Esthetician view
  // without re-authenticating) still shows something representative.
  // "Done" = the treatment is recorded. Recording one marks the appointment
  // COMPLETED, but an appointment that has a treatment record counts as done
  // either way, so a finished client never stays as "next".
  const isDone = isAppointmentDone;
  const next = pickNextAppointment(shiftAgenda, shift ? null : (currentUser?.id ?? null));

  // The esthetician's own finished clients (everyone's, in the preview).
  const doneToday = shiftAgenda.filter(isDone);
  const ownDone = !shift && currentUser ? doneToday.filter((a) => a.estheticianId === currentUser.id) : [];
  const completed = ownDone.length > 0 ? ownDone : doneToday;

  // The rest of the cabina's day after the one up next.
  const upcoming = shift ? shiftAgenda.filter((a) => !isDone(a) && a.id !== next?.id) : [];

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

  return (
    <StaffTodayView
      agenda={agenda}
      nextClient={nextClient}
      completed={completed}
      upcoming={upcoming}
      pendingCheckouts={pendingCheckouts}
      shiftLabel={shift ? `${shift.roomName} · ${shift.locationName}` : null}
    />
  );
}
