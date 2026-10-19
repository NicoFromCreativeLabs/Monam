import "server-only";
import { prisma } from "@/lib/prisma";
import { STUDIO_TIME_ZONE } from "@/lib/booking-time";
import { isShiftOverdue } from "@/lib/shift-overdue";

// Alerts the admin when someone left their shift open: no check-out an hour
// after closing, or one left from an earlier day. One alert per shift (the shift
// id is the alert's source), so reloading never repeats it. Pass `onlyIds` to
// flag specific shifts that are already known to be forgotten (e.g. the ones
// closed automatically at the person's next check-in).
export async function flagForgottenShifts(onlyIds?: string[]): Promise<number> {
  const open = await prisma.staffShift.findMany({
    where: { checkOutAt: null, autoClosed: false, ...(onlyIds ? { id: { in: onlyIds } } : {}) },
    include: { user: { select: { name: true } }, room: true, location: true },
  });
  const forgotten = onlyIds ? open : open.filter((s) => isShiftOverdue(s.checkInAt));
  if (forgotten.length === 0) return 0;

  const existing = await prisma.alert.findMany({
    where: { sourceType: "SHIFT_NO_CHECKOUT", sourceId: { in: forgotten.map((s) => s.id) } },
    select: { sourceId: true },
  });
  const already = new Set(existing.map((a) => a.sourceId));

  let created = 0;
  for (const shift of forgotten) {
    if (already.has(shift.id)) continue;
    const when = shift.checkInAt.toLocaleString("es-MX", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: STUDIO_TIME_ZONE,
    });
    const where =
      shift.kind === "FRONT_DESK"
        ? `vendedor · ${shift.location.name}`
        : `esteticista · ${shift.room?.name ?? shift.location.name}`;
    let cashOpen = false;
    if (shift.kind === "FRONT_DESK" && shift.cashSessionId) {
      const session = await prisma.cashRegisterSession.findUnique({
        where: { id: shift.cashSessionId },
        select: { status: true },
      });
      cashOpen = session?.status === "OPEN";
    }
    await prisma.alert.create({
      data: {
        text: `${shift.user.name} no registró su salida (${where}). Entrada: ${when}.${cashOpen ? " La caja sigue abierta." : ""}`,
        severity: "WARNING",
        sourceType: "SHIFT_NO_CHECKOUT",
        sourceId: shift.id,
      },
    });
    created++;
  }
  return created;
}
