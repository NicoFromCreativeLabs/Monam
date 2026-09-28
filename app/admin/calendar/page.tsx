import { TopBar } from "@/components/panel/TopBar";
import { Card } from "@/components/panel/Card";
import { prisma } from "@/lib/prisma";
import { getTodayAppointments } from "@/lib/appointments";
import { OWNER, CALENDAR_HOURS } from "@/lib/mock-data";

// All-location calendar — reassign/override, device-conflict flags (spec §6.3).
// The room+esthetician+device conflict check itself is a database constraint
// (the EXCLUDE constraints on `appointments`, see prisma/schema.prisma); this
// is the read-only view shell. Rooms and appointments are both real now
// (Catalog + Booking phases) — only the display hour axis (9:00-17:00) is
// still a fixed constant, not derived from real business-hours data.
export default async function AdminCalendar() {
  const colWidth = 100 / CALENDAR_HOURS.length;
  const romaNorte = await prisma.location.findFirst({
    where: { name: "Roma Norte" },
    include: { rooms: { orderBy: { name: "asc" } } },
  });
  const rooms = romaNorte?.rooms.map((r) => r.name) ?? [];
  const todayAppointments = romaNorte ? await getTodayAppointments(romaNorte.id) : [];
  const calendarAppointments = todayAppointments.map((a) => {
    const [h, m] = a.time.split(":").map(Number);
    const start = h + m / 60;
    const span = a.tier === "Signature" ? 1 : 0.5;
    return { id: a.id, room: a.room, start, span, client: a.clientName, esthetician: a.esthetician, tier: a.tier };
  });

  return (
    <>
      <TopBar title="Calendario" userName={OWNER.name} userRole={OWNER.role} allowBothLocations />
      <div className="flex-1 px-8 py-6">
        <Card title="Roma Norte — hoy, todas las salas">
          <div className="overflow-x-auto">
            <div className="min-w-[900px]">
              {/* Hour header */}
              <div className="ml-32 flex border-b border-ciruela/10 pb-2">
                {CALENDAR_HOURS.map((h) => (
                  <div
                    key={h}
                    className="font-body text-xs text-ciruela/40"
                    style={{ width: `${colWidth}%` }}
                  >
                    {h}:00
                  </div>
                ))}
              </div>

              {rooms.map((room) => (
                <div key={room} className="flex items-center border-b border-ciruela/8 py-3">
                  <div className="w-32 shrink-0 font-body text-sm text-ciruela/70">{room}</div>
                  <div className="relative h-12 flex-1">
                    {calendarAppointments.filter((a) => a.room === room).map((apt) => {
                      const left =
                        ((apt.start - CALENDAR_HOURS[0]) / CALENDAR_HOURS.length) * 100;
                      const width = (apt.span / CALENDAR_HOURS.length) * 100;
                      const isSignature = apt.tier === "Signature";
                      return (
                        <div
                          key={apt.id}
                          className={`absolute top-0 h-full rounded-lg px-2 py-1 font-body text-[11px] leading-tight text-hueso ${
                            isSignature ? "bg-ciruela" : "bg-crepe text-ciruela"
                          }`}
                          style={{ left: `${left}%`, width: `${width}%` }}
                          title={`${apt.client} · ${apt.esthetician}`}
                        >
                          <p className="truncate font-medium">{apt.client}</p>
                          <p className="truncate opacity-80">{apt.esthetician}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 flex gap-4 font-body text-xs text-ciruela/50">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-ciruela" /> Signature
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-crepe" /> Targeted
            </span>
          </div>
        </Card>
      </div>
    </>
  );
}
