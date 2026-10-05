"use client";

import { TopBar } from "@/components/panel/TopBar";
import { Card } from "@/components/panel/Card";
import { MY_SCHEDULE_WEEK, TODAY_APPOINTMENTS } from "@/lib/mock-data";

const DAY_ABBR_ES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

// MY_SCHEDULE_WEEK's day/date pairs were hardcoded to a specific past week
// ("Lun 22" … "Dom 28") — found during the persona QA pass showing every
// weekday label off by one from the real calendar once "today" moved past
// that week (e.g. labeling the 28th "Domingo" when it's actually a Monday),
// and self-contradicting the "Hoy" card below it (0 appointments on a day
// the same page also lists 4 for). Builds the real Monday-start week from
// the current date instead, keeping MY_SCHEDULE_WEEK's illustrative
// per-weekday counts (still no real per-day booking history to source from)
// but swapping in today's real count so the two cards agree.
function buildCurrentWeek() {
  const today = new Date();
  const mondayOffset = (today.getDay() + 6) % 7;
  const monday = new Date(today);
  monday.setDate(today.getDate() - mondayOffset);
  return MY_SCHEDULE_WEEK.map((d, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    const isToday = date.toDateString() === today.toDateString();
    return {
      day: DAY_ABBR_ES[date.getDay()],
      date: String(date.getDate()),
      appointments: isToday ? TODAY_APPOINTMENTS.length : d.appointments,
    };
  });
}

// Own schedule only — Front Desk sees their location's schedule, Esthetician
// sees only their own (spec §7.4).
export default function StaffSchedule() {
  const scheduleWeek = buildCurrentWeek();
  const max = Math.max(...scheduleWeek.map((d) => d.appointments));

  return (
    <>
      <TopBar title="Mi horario" />
      <div className="flex-1 space-y-6 px-8 py-6">
        <Card title="Esta semana">
          <div className="flex items-end gap-3">
            {scheduleWeek.map((d) => (
              <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                <span className="font-body text-xs text-ciruela/50">{d.appointments}</span>
                <div className="flex h-24 w-full items-end rounded bg-ciruela/8">
                  <div
                    className="w-full rounded bg-ciruela"
                    style={{ height: `${max ? (d.appointments / max) * 100 : 0}%` }}
                  />
                </div>
                <span className="font-body text-[11px] text-ciruela/50">
                  {d.day} {d.date}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Hoy">
          <ul className="divide-y divide-ciruela/8">
            {TODAY_APPOINTMENTS.map((apt) => (
              <li key={apt.id} className="flex justify-between py-2 font-body text-sm text-ciruela">
                <span>
                  {apt.time} · {apt.client}
                </span>
                <span className="text-ciruela/50">
                  {apt.tier} · {apt.room}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
