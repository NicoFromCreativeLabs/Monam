import { prisma } from "@/lib/prisma";
import { getTodayAppointments } from "@/lib/appointments";
import { AdminCalendarView, type LocationCalendar } from "@/components/panel/AdminCalendarView";

// All-location calendar — reassign/override, device-conflict flags (spec §6.3).
// The room+esthetician+device conflict check itself is a database constraint
// (the EXCLUDE constraints on `appointments`, see prisma/schema.prisma); this
// is the view shell, plus manual booking entry and reassign/override (Front
// Desk/Owner/Clinic Manager moving an existing appointment to a different
// room/esthetician — spec's "one source of truth, zero double entry"
// constraint applies to corrections too, not just new bookings). Fetches
// every location's rooms/estheticians/appointments here; the client view
// renders one calendar block per whichever location(s) the "Local" switcher
// has selected.
export default async function AdminCalendar() {
  const locations = await prisma.location.findMany({
    include: { rooms: { orderBy: { name: "asc" } } },
    orderBy: { createdAt: "asc" },
  });

  const calendars: LocationCalendar[] = await Promise.all(
    locations.map(async (location) => {
      const rooms = location.rooms.map((r) => ({ id: r.id, name: r.name }));
      const estheticianRows = await prisma.appUser.findMany({
        where: { role: "ESTHETICIAN", status: "ACTIVE", locationAssignments: { some: { locationId: location.id } } },
        orderBy: { name: "asc" },
      });
      const estheticians = estheticianRows.map((e) => ({ id: e.id, name: e.name }));

      const deviceRows = await prisma.device.findMany({ where: { locationId: location.id }, orderBy: { name: "asc" } });
      const devices = deviceRows.map((d) => ({ id: d.id, name: d.name }));

      const todayAppointments = await getTodayAppointments(location.id);
      const appointments = todayAppointments.map((a) => {
        const [h, m] = a.time.split(":").map(Number);
        const start = h + m / 60;
        const span = a.tier === "Signature" ? 1 : 0.5;
        return {
          id: a.id,
          roomId: a.roomId,
          room: a.room,
          start,
          span,
          client: a.clientName,
          estheticianId: a.estheticianId,
          esthetician: a.esthetician,
          deviceId: a.deviceId,
          device: a.device,
          tier: a.tier,
          canReassign: a.statusRaw !== "CANCELLED" && a.statusRaw !== "COMPLETED",
        };
      });
      return { locationName: location.name, rooms, estheticians, devices, appointments };
    }),
  );

  const clients = await prisma.client.findMany({
    where: { anonymizedAt: null },
    select: { id: true, name: true, phone: true },
    orderBy: { name: "asc" },
  });

  return <AdminCalendarView calendars={calendars} clients={clients} />;
}
