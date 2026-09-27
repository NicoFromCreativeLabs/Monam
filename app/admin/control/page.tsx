"use client";

import { useState } from "react";
import { TopBar } from "@/components/panel/TopBar";
import { Card } from "@/components/panel/Card";
import { Badge } from "@/components/panel/Badge";
import {
  OWNER,
  APPROVALS_QUEUE,
  ANOMALY_FLAGS,
  AUDIT_LOG,
  CLINICAL_INCIDENTS,
} from "@/lib/mock-data";

const APPROVAL_TONE: Record<string, "warning" | "positive" | "neutral"> = {
  Pendiente: "warning",
  Aprobado: "positive",
  Rechazado: "neutral",
};

const TABS = ["Aprobaciones", "Anomalías", "Historial", "Incidentes clínicos"] as const;
type Tab = (typeof TABS)[number];

// Control — fuses the old /admin/approvals and /admin/audit-log into one
// page with sub-sections, per client spec. Anomalías is the existing
// ANOMALY_FLAGS data (previously on the audit-log page); Incidentes
// clínicos is new — no existing data model for it yet, so it's a light
// mock section (a few rows) rather than a full clinical-incident tracker.
export default function AdminControl() {
  const [tab, setTab] = useState<Tab>("Aprobaciones");
  const [queue, setQueue] = useState(APPROVALS_QUEUE);

  function decide(id: string, status: "Aprobado" | "Rechazado") {
    setQueue((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
  }

  return (
    <>
      <TopBar title="Control" userName={OWNER.name} userRole={OWNER.role} allowBothLocations />
      <div className="flex-1 space-y-6 px-4 py-6 min-[860px]:px-8">
        <div className="flex flex-wrap gap-2 border-b border-ciruela/10 pb-3">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-4 py-1.5 font-body text-xs transition-colors ${
                tab === t ? "bg-ciruela text-hueso" : "text-ciruela/60 hover:bg-ciruela/8"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "Aprobaciones" && (
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
                    <Badge tone={APPROVAL_TONE[a.status]}>{a.status}</Badge>
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
        )}

        {tab === "Anomalías" && (
          <Card title="Alertas de anomalías">
            <ul className="divide-y divide-ciruela/8">
              {ANOMALY_FLAGS.map((f) => (
                <li key={f.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-body text-sm text-ciruela">{f.type}</p>
                    <p className="font-body text-xs text-ciruela/50">{f.detail}</p>
                  </div>
                  <Badge tone={f.status === "Abierto" ? "warning" : "positive"}>{f.status}</Badge>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {tab === "Historial" && (
          <Card title="Historial — accesos y ediciones">
            <table className="w-full font-body text-sm text-ciruela">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-ciruela/40">
                  <th className="pb-2">Usuario</th>
                  <th className="pb-2">Acción</th>
                  <th className="pb-2">Entidad</th>
                  <th className="pb-2 text-right">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {AUDIT_LOG.map((l) => (
                  <tr key={l.id} className="border-t border-ciruela/8">
                    <td className="py-2">{l.actor}</td>
                    <td className="py-2 text-ciruela/60">{l.action}</td>
                    <td className="py-2 text-ciruela/60">{l.entity}</td>
                    <td className="py-2 text-right text-ciruela/50">{l.timestamp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

        {tab === "Incidentes clínicos" && (
          <Card title="Incidentes clínicos registrados">
            {CLINICAL_INCIDENTS.length === 0 ? (
              <p className="py-6 text-center font-body text-sm text-ciruela/50">
                Sin incidentes registrados.
              </p>
            ) : (
              <table className="w-full font-body text-sm text-ciruela">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-ciruela/40">
                    <th className="pb-2">Clienta</th>
                    <th className="pb-2">Incidente</th>
                    <th className="pb-2">Protocolo</th>
                    <th className="pb-2">Esteticista</th>
                    <th className="pb-2">Fecha</th>
                    <th className="pb-2 text-right">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {CLINICAL_INCIDENTS.map((i) => (
                    <tr key={i.id} className="border-t border-ciruela/8">
                      <td className="py-2">{i.client}</td>
                      <td className="py-2 text-ciruela/60">{i.type}</td>
                      <td className="py-2 text-ciruela/60">{i.protocol}</td>
                      <td className="py-2 text-ciruela/60">{i.esthetician}</td>
                      <td className="py-2 text-ciruela/50">{i.date}</td>
                      <td className="py-2 text-right">
                        <Badge tone={i.status === "Resuelto" ? "positive" : "warning"}>
                          {i.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        )}
      </div>
    </>
  );
}
