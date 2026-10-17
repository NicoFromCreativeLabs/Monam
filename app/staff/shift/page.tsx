import { prisma } from "@/lib/prisma";
import { requireStaffRole } from "@/lib/auth/dal";
import { getTodayAppointments, isAppointmentDone } from "@/lib/appointments";
import { getActiveShift, getForgottenShift } from "@/lib/shifts";
import { isShiftStale } from "@/lib/shift-rules";
import { StaffShiftView } from "@/components/panel/StaffShiftView";

export default async function StaffShift() {
  const user = await requireStaffRole(["ESTHETICIAN", "OWNER", "CLINIC_MANAGER"]);

  const [locations, openShifts, active, forgotten, recent] = await Promise.all([
    prisma.location.findMany({
      where: { isActive: true },
      include: { rooms: { orderBy: { name: "asc" } } },
      orderBy: { name: "asc" },
    }),
    prisma.staffShift.findMany({
      where: { checkOutAt: null, autoClosed: false },
      include: { user: { select: { name: true } } },
    }),
    getActiveShift(user.id),
    getForgottenShift(user.id),
    prisma.staffShift.findMany({
      where: { userId: user.id, checkOutAt: { not: null } },
      include: { room: true, location: true },
      orderBy: { checkInAt: "desc" },
      take: 5,
    }),
  ]);

  // Cabinas held right now by someone (a shift left open from an earlier day
  // no longer holds its cabina).
  const taken = new Map(
    openShifts.filter((s) => !isShiftStale(s.checkInAt)).map((s) => [s.roomId, s.user.name] as const),
  );

  let pendingClients = 0;
  if (active) {
    const agenda = await getTodayAppointments(active.locationId);
    pendingClients = agenda.filter((a) => a.roomId === active.roomId && !isAppointmentDone(a)).length;
  }

  return (
    <StaffShiftView
      userName={user.name}
      locations={locations.map((l) => ({
        id: l.id,
        name: l.name,
        rooms: l.rooms.map((r) => ({
          id: r.id,
          name: r.name,
          takenBy: r.id === active?.roomId ? null : (taken.get(r.id) ?? null),
        })),
      }))}
      active={
        active
          ? {
              locationName: active.locationName,
              roomName: active.roomName,
              checkInAt: active.checkInAt.toISOString(),
              pendingClients,
            }
          : null
      }
      forgotten={forgotten ? { roomName: forgotten.roomName, checkInAt: forgotten.checkInAt.toISOString() } : null}
      recent={recent.map((s) => ({
        id: s.id,
        locationName: s.location.name,
        roomName: s.room.name,
        checkInAt: s.checkInAt.toISOString(),
        checkOutAt: s.checkOutAt!.toISOString(),
      }))}
    />
  );
}
