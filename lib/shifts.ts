import "server-only";
import { prisma } from "@/lib/prisma";
import { isShiftStale } from "@/lib/shift-rules";

export interface ActiveShift {
  id: string;
  locationId: string;
  locationName: string;
  roomId: string;
  roomName: string;
  checkInAt: Date;
}

// The shift the person is working right now: open, and from today. One left
// open from an earlier day does not count (it is closed as forgotten the next
// time she checks in).
export async function getActiveShift(userId: string): Promise<ActiveShift | null> {
  const open = await prisma.staffShift.findMany({
    where: { userId, checkOutAt: null, autoClosed: false },
    include: { room: true, location: true },
    orderBy: { checkInAt: "desc" },
  });
  const shift = open.find((s) => !isShiftStale(s.checkInAt));
  if (!shift) return null;
  return {
    id: shift.id,
    locationId: shift.locationId,
    locationName: shift.location.name,
    roomId: shift.roomId,
    roomName: shift.room.name,
    checkInAt: shift.checkInAt,
  };
}

// An open shift from an earlier day, if there is one — the check-in screen
// tells her it was never closed.
export async function getForgottenShift(userId: string) {
  const open = await prisma.staffShift.findMany({
    where: { userId, checkOutAt: null, autoClosed: false },
    include: { room: true },
  });
  const stale = open.find((s) => isShiftStale(s.checkInAt));
  return stale ? { roomName: stale.room.name, checkInAt: stale.checkInAt } : null;
}
