"use client";

import { useState } from "react";
import { TopBar } from "@/components/panel/TopBar";
import { Card } from "@/components/panel/Card";
import { Badge } from "@/components/panel/Badge";
import { OWNER, APPROVALS_QUEUE } from "@/lib/mock-data";

const STATUS_TONE: Record<string, "warning" | "positive" | "neutral"> = {
  Pendiente: "warning",
  Aprobado: "positive",
  Rechazado: "neutral",
};

// Discounts >10%, refunds, comps, manual inventory adjustments — only the
// two owners can approve at launch (spec §6.3). Decisions here are local UI
// state (no backend yet); a real decision would write an audit-logged
// ApprovalRequest update (implementation plan Phase 4).
export default function AdminApprovals() {
  const [queue, setQueue] = useState(APPROVALS_QUEUE);

  function decide(id: string, status: "Aprobado" | "Rechazado") {
    setQueue((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
  }

  return (
    <>
      <TopBar title="Aprobaciones" userName={OWNER.name} userRole={OWNER.role} allowBothLocations />
      <div className="flex-1 px-8 py-6">
        <Card title="Cola de aprobaciones">
          <ul className="divide-y divide-ciruela/8">
            {queue.map((a) => (
              <li key={a.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-body text-sm text-ciruela">
                    {a.type} · {a.client}
                  </p>
                  <p className="font-body text-xs text-ciruela/50">
                    {a.requestedBy} · {a.amount} · {a.date}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone={STATUS_TONE[a.status]}>{a.status}</Badge>
                  {a.status === "Pendiente" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => decide(a.id, "Aprobado")}
                        className="rounded-full bg-ciruela px-3 py-1 font-body text-xs text-hueso"
                      >
                        Aprobar
                      </button>
                      <button
                        onClick={() => decide(a.id, "Rechazado")}
                        className="rounded-full border border-ciruela px-3 py-1 font-body text-xs text-ciruela"
                      >
                        Rechazar
                      </button>
                    </div>
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
