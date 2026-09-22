"use client";

import { TopBar } from "@/components/panel/TopBar";
import { Card } from "@/components/panel/Card";
import { staffIdentity, useStaffRole } from "@/components/panel/StaffRoleContext";
import { MY_SCHEDULE_WEEK, TODAY_APPOINTMENTS } from "@/lib/mock-data";

// Own schedule only — Front Desk sees their location's schedule, Esthetician
// sees only their own (spec §7.4).
export default function StaffSchedule() {
  const { role } = useStaffRole();
  const identity = staffIdentity(role);
  const max = Math.max(...MY_SCHEDULE_WEEK.map((d) => d.appointments));

  return (
    <>
      <TopBar title="Mi horario" userName={identity.name} userRole={identity.role} />
      <div className="flex-1 space-y-6 px-8 py-6">
        <Card title="Esta semana">
          <div className="flex items-end gap-3">
            {MY_SCHEDULE_WEEK.map((d) => (
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
