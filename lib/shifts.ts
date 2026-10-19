import "server-only";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { expectedCash, isShiftStale } from "@/lib/shift-rules";

export interface ActiveShift {
  id: string;
  locationId: string;
  locationName: string;
  roomId: string;
  roomName: string;
  checkInAt: Date;
}

// The esthetician shift the person is working right now: open, and from today.
// One left open from an earlier day does not count (it is closed as forgotten
// the next time she checks in).
export async function getActiveShift(userId: string): Promise<ActiveShift | null> {
  const open = await prisma.staffShift.findMany({
    where: { userId, kind: "ESTHETICIAN", checkOutAt: null, autoClosed: false },
    include: { room: true, location: true },
    orderBy: { checkInAt: "desc" },
  });
  const shift = open.find((s) => !isShiftStale(s.checkInAt) && s.room);
  if (!shift || !shift.room) return null;
  return {
    id: shift.id,
    locationId: shift.locationId,
    locationName: shift.location.name,
    roomId: shift.room.id,
    roomName: shift.room.name,
    checkInAt: shift.checkInAt,
  };
}

// An open shift (either kind) from an earlier day, if there is one — the
// check-in screen tells the person it was never closed.
export async function getForgottenShift(userId: string) {
  const open = await prisma.staffShift.findMany({
    where: { userId, checkOutAt: null, autoClosed: false },
    include: { room: true, location: true },
  });
  const stale = open.find((s) => isShiftStale(s.checkInAt));
  return stale
    ? { roomName: stale.room?.name ?? stale.location.name, checkInAt: stale.checkInAt }
    : null;
}

export interface ActiveFrontDeskShift {
  id: string;
  locationId: string;
  locationName: string;
  checkInAt: Date;
  cashSessionId: string | null;
}

export async function getActiveFrontDeskShift(userId: string): Promise<ActiveFrontDeskShift | null> {
  const open = await prisma.staffShift.findMany({
    where: { userId, kind: "FRONT_DESK", checkOutAt: null, autoClosed: false },
    include: { location: true },
    orderBy: { checkInAt: "desc" },
  });
  const shift = open.find((s) => !isShiftStale(s.checkInAt));
  if (!shift) return null;
  return {
    id: shift.id,
    locationId: shift.locationId,
    locationName: shift.location.name,
    checkInAt: shift.checkInAt,
    cashSessionId: shift.cashSessionId,
  };
}

// Whether a real Front Desk / Esthetician login has checked in today (their
// own kind of shift). Owner and Clinic Manager are never held back.
export async function isOnShift(user: { id: string; role: string }): Promise<boolean> {
  if (user.role === "FRONT_DESK") return (await getActiveFrontDeskShift(user.id)) !== null;
  if (user.role === "ESTHETICIAN") return (await getActiveShift(user.id)) !== null;
  return true;
}

// Without a check-in a Front Desk or Esthetician login can do nothing: it is
// sent to register its entrance first, every day. Used by every staff page and,
// through requireStaffRole, by every action.
export async function requireOnShift(user: { id: string; role: string }): Promise<void> {
  if (!(await isOnShift(user))) redirect("/staff/shift");
}

export interface CashSummary {
  sessionId: string;
  openedBy: string;
  openedAt: Date;
  openingFloatMxn: number;
  cashSalesMxn: number;
  expectedMxn: number;
  salesCount: number;
}

// The cash register's numbers so far: float, what was collected in cash, and
// what should be in the drawer.
export async function getCashSummary(sessionId: string): Promise<CashSummary | null> {
  const session = await prisma.cashRegisterSession.findUnique({
    where: { id: sessionId },
    include: { openedBy: { select: { name: true } }, sales: { select: { totalMxn: true, paymentMethod: true } } },
  });
  if (!session) return null;
  const cashSalesMxn = session.sales.filter((s) => s.paymentMethod === "CASH").reduce((sum, s) => sum + s.totalMxn, 0);
  return {
    sessionId: session.id,
    openedBy: session.openedBy.name,
    openedAt: session.openedAt,
    openingFloatMxn: session.openingFloatMxn,
    cashSalesMxn,
    expectedMxn: expectedCash(session.openingFloatMxn, cashSalesMxn),
    salesCount: session.sales.length,
  };
}
