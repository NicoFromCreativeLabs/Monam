import { prisma } from "@/lib/prisma";
import { requireStaffRole } from "@/lib/auth/dal";
import { getTodayAppointments, isAppointmentDone } from "@/lib/appointments";
import { studioNow } from "@/lib/booking-time";
import { getActiveFrontDeskShift, getActiveShift, getCashSummary, getForgottenShift } from "@/lib/shifts";
import { isShiftStale } from "@/lib/shift-rules";
import { StaffShiftSwitch } from "@/components/panel/StaffShiftSwitch";
import type { ShiftLocation } from "@/components/panel/StaffShiftView";
import type { FrontDeskShiftData } from "@/components/panel/StaffFrontDeskShiftView";

type StaffUser = Awaited<ReturnType<typeof requireStaffRole>>;

async function loadEsthetician(user: StaffUser) {
  const [locations, openShifts, active, forgotten, recent] = await Promise.all([
    prisma.location.findMany({
      where: { isActive: true },
      include: { rooms: { orderBy: { name: "asc" } } },
      orderBy: { name: "asc" },
    }),
    prisma.staffShift.findMany({
      where: { kind: "ESTHETICIAN", checkOutAt: null, autoClosed: false },
      include: { user: { select: { name: true } } },
    }),
    getActiveShift(user.id),
    getForgottenShift(user.id),
    prisma.staffShift.findMany({
      where: { userId: user.id, kind: "ESTHETICIAN", checkOutAt: { not: null } },
      include: { room: true, location: true },
      orderBy: { checkInAt: "desc" },
      take: 5,
    }),
  ]);

  // Cabinas held right now by someone (a shift left open from an earlier day
  // no longer holds its cabina).
  const taken = new Map(
    openShifts
      .filter((s) => !isShiftStale(s.checkInAt) && s.roomId)
      .map((s) => [s.roomId as string, s.user.name] as const),
  );

  let pendingClients = 0;
  if (active) {
    const agenda = await getTodayAppointments(active.locationId);
    pendingClients = agenda.filter((a) => a.roomId === active.roomId && !isAppointmentDone(a)).length;
  }

  const shiftLocations: ShiftLocation[] = locations.map((l) => ({
    id: l.id,
    name: l.name,
    rooms: l.rooms.map((r) => ({
      id: r.id,
      name: r.name,
      takenBy: r.id === active?.roomId ? null : (taken.get(r.id) ?? null),
    })),
  }));

  return {
    userName: user.name,
    locations: shiftLocations,
    active: active
      ? {
          locationName: active.locationName,
          roomName: active.roomName,
          checkInAt: active.checkInAt.toISOString(),
          pendingClients,
        }
      : null,
    forgotten: forgotten ? { roomName: forgotten.roomName, checkInAt: forgotten.checkInAt.toISOString() } : null,
    recent: recent.map((s) => ({
      id: s.id,
      locationName: s.location.name,
      roomName: s.room?.name ?? s.location.name,
      checkInAt: s.checkInAt.toISOString(),
      checkOutAt: s.checkOutAt!.toISOString(),
    })),
  };
}

async function loadFrontDesk(user: StaffUser): Promise<FrontDeskShiftData> {
  const today = studioNow().date;
  const [locations, openSessions, active, forgotten, recent] = await Promise.all([
    prisma.location.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.cashRegisterSession.findMany({
      where: { status: "OPEN" },
      include: { openedBy: { select: { name: true } } },
    }),
    getActiveFrontDeskShift(user.id),
    getForgottenShift(user.id),
    prisma.staffShift.findMany({
      where: { userId: user.id, kind: "FRONT_DESK", checkOutAt: { not: null } },
      include: { location: true },
      orderBy: { checkInAt: "desc" },
      take: 5,
    }),
  ]);

  // The cash register already open today at each sede (one from an earlier day
  // does not count — it is closed when the next shift starts).
  const cashByLocation = new Map(
    openSessions
      .filter((s) => studioNow(s.openedAt).date >= today)
      .map((s) => [s.locationId, { openedBy: s.openedBy.name, openingFloatMxn: s.openingFloatMxn }] as const),
  );

  let activeData: FrontDeskShiftData["active"] = null;
  if (active) {
    const [cash, agenda, others] = await Promise.all([
      active.cashSessionId ? getCashSummary(active.cashSessionId) : null,
      getTodayAppointments(active.locationId),
      active.cashSessionId
        ? prisma.staffShift.count({
            where: { cashSessionId: active.cashSessionId, checkOutAt: null, autoClosed: false, id: { not: active.id } },
          })
        : 0,
    ]);
    activeData = {
      locationName: active.locationName,
      checkInAt: active.checkInAt.toISOString(),
      cash: cash
        ? {
            openedBy: cash.openedBy,
            openingFloatMxn: cash.openingFloatMxn,
            cashSalesMxn: cash.cashSalesMxn,
            expectedMxn: cash.expectedMxn,
            salesCount: cash.salesCount,
          }
        : null,
      closesCaja: !!cash && others === 0,
      pendingCharges: agenda.filter((a) => a.treatmentFinished && !a.checkedOut).length,
    };
  }

  return {
    userName: user.name,
    locations: locations.map((l) => ({ id: l.id, name: l.name, cashOpen: cashByLocation.get(l.id) ?? null })),
    active: activeData,
    forgotten: forgotten ? { roomName: forgotten.roomName, checkInAt: forgotten.checkInAt.toISOString() } : null,
    recent: recent.map((s) => ({
      id: s.id,
      locationName: s.location.name,
      checkInAt: s.checkInAt.toISOString(),
      checkOutAt: s.checkOutAt!.toISOString(),
      cashCountedMxn: s.cashCountedMxn,
      cashExpectedMxn: s.cashExpectedMxn,
    })),
  };
}

// "Mi turno": the esthetician's (sede + cabina) or the front desk's (sede +
// cash register). Owner / Clinic Manager previewing the panel get both, and the
// view they are previewing decides which one shows.
export default async function StaffShift() {
  const user = await requireStaffRole(["ESTHETICIAN", "FRONT_DESK", "OWNER", "CLINIC_MANAGER"]);
  const [esthetician, frontDesk] = await Promise.all([
    user.role === "FRONT_DESK" ? null : loadEsthetician(user),
    user.role === "ESTHETICIAN" ? null : loadFrontDesk(user),
  ]);
  return <StaffShiftSwitch esthetician={esthetician} frontDesk={frontDesk} />;
}
