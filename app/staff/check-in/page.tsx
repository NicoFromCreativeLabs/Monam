"use client";

import { useState } from "react";
import { TopBar } from "@/components/panel/TopBar";
import { Card } from "@/components/panel/Card";
import { Badge } from "@/components/panel/Badge";
import { staffIdentity, useStaffRole } from "@/components/panel/StaffRoleContext";
import { CHECKIN_QUEUE } from "@/lib/mock-data";

const STATUS_TONE: Record<string, "positive" | "info" | "warning" | "neutral"> = {
  Registrado: "positive",
  Esperando: "info",
  Retrasado: "warning",
  Confirmado: "neutral",
};

// Greet by name; confirm Skin ID/consents complete before proceeding to
// treatment (spec §7.3) — cannot proceed with an incomplete record.
export default function StaffCheckIn() {
  const { role } = useStaffRole();
  const identity = staffIdentity(role);
  const [queue, setQueue] = useState(CHECKIN_QUEUE);

  function checkIn(id: string) {
    setQueue((prev) => prev.map((a) => (a.id === id ? { ...a, status: "Registrado" } : a)));
  }

  return (
    <>
      <TopBar title="Check-in" userName={identity.name} userRole={identity.role} />
      <div className="flex-1 px-8 py-6">
        <Card title="Llegadas — Roma Norte">
          <ul className="divide-y divide-ciruela/8">
            {queue.map((apt) => (
              <li key={apt.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-body text-sm text-ciruela">
                    {apt.time} · {apt.client}{" "}
                    <span className="text-ciruela/50">
                      · {apt.tier} · {apt.esthetician}
                    </span>
                  </p>
                  {apt.flags.length > 0 && (
                    <p className="mt-0.5 font-body text-xs text-crepe">{apt.flags.join(" · ")}</p>
                  )}
                  <p className="mt-0.5 font-body text-xs text-oliva">
                    Skin ID y consentimientos completos
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone={STATUS_TONE[apt.status]}>{apt.status}</Badge>
                  {apt.status !== "Registrado" && (
                    <button
                      onClick={() => checkIn(apt.id)}
                      className="rounded-full bg-ciruela px-3 py-1.5 font-body text-xs text-hueso"
                    >
                      Registrar llegada
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
