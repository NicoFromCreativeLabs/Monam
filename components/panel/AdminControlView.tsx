"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/panel/TopBar";
import { Card } from "@/components/panel/Card";
import { Badge } from "@/components/panel/Badge";
import { OWNER } from "@/lib/mock-data";
import { decideApprovalAction, resolveAnomalyAction } from "@/lib/actions/commerce";

export interface ApprovalRow {
  id: string;
  type: string;
  client: string;
  requestedBy: string;
  amount: string;
  date: string;
  status: string;
}
export interface AnomalyRow {
  id: string;
  type: string;
  detail: string;
  status: "Abierto" | "Resuelto";
}
export interface IncidentRow {
  id: string;
  client: string;
  type: string;
  protocol: string;
  esthetician: string;
  date: string;
  status: string;
}
export interface AuditLogRow {
  id: string;
  actor: string;
  action: string;
  entity: string;
  timestamp: string;
}

const APPROVAL_TONE: Record<string, "warning" | "positive" | "neutral"> = {
  Pendiente: "warning",
  Aprobado: "positive",
  Rechazado: "neutral",
};

const TABS = ["Aprobaciones", "Anomalías", "Historial", "Incidentes clínicos"] as const;
type Tab = (typeof TABS)[number];

export function AdminControlView({
  approvals,
  anomalies,
  incidents,
  auditLog,
}: {
  approvals: ApprovalRow[];
  anomalies: AnomalyRow[];
  incidents: IncidentRow[];
  auditLog: AuditLogRow[];
}) {
  const [tab, setTab] = useState<Tab>("Aprobaciones");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function decide(id: string, status: "APPROVED" | "REJECTED") {
    startTransition(async () => {
      await decideApprovalAction(id, status);
      router.refresh();
    });
  }

  function resolveAnomaly(id: string) {
    startTransition(async () => {
      await resolveAnomalyAction(id);
      router.refresh();
    });
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
            {approvals.length === 0 ? (
              <p className="py-6 text-center font-body text-sm text-ciruela/50">
                Sin solicitudes de aprobación todavía.
              </p>
            ) : (
            <ul className="divide-y divide-ciruela/8">
              {approvals.map((a) => (
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
                          onClick={() => decide(a.id, "APPROVED")}
                          disabled={isPending}
                          className="rounded-full bg-ciruela px-3 py-1 font-body text-xs text-hueso disabled:opacity-50"
                        >
                          Aprobar
                        </button>
                        <button
                          onClick={() => decide(a.id, "REJECTED")}
                          disabled={isPending}
                          className="rounded-full border border-ciruela px-3 py-1 font-body text-xs text-ciruela disabled:opacity-50"
                        >
                          Rechazar
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            )}
          </Card>
        )}

        {tab === "Anomalías" && (
          <Card title="Alertas de anomalías">
            {anomalies.length === 0 ? (
              <p className="py-6 text-center font-body text-sm text-ciruela/50">
                Sin anomalías registradas.
              </p>
            ) : (
            <ul className="divide-y divide-ciruela/8">
              {anomalies.map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-body text-sm text-ciruela">{f.type}</p>
                    <p className="font-body text-xs text-ciruela/50">{f.detail}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <Badge tone={f.status === "Abierto" ? "warning" : "positive"}>{f.status}</Badge>
                    {f.status === "Abierto" && (
                      <button
                        onClick={() => resolveAnomaly(f.id)}
                        disabled={isPending}
                        className="font-body text-[11px] text-ciruela underline disabled:opacity-50"
                      >
                        Marcar resuelto
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            )}
            <p className="mt-4 font-body text-xs text-ciruela/40">
              Descuento inusual y Reembolso inusual se generan solos al aprobar una solicitud en
              Aprobaciones por encima del umbral configurado en Configuración; Merma y Comisión
              reasignada manualmente, al ajustar inventario o re-agregar un producto quitado en
              Cobro/POS.
            </p>
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
                {auditLog.map((l) => (
                  <tr key={l.id} className="border-t border-ciruela/8">
                    <td className="py-2">{l.actor}</td>
                    <td className="py-2 text-ciruela/60">{l.action}</td>
                    <td className="py-2 text-ciruela/60">{l.entity}</td>
                    <td className="py-2 text-right text-ciruela/50">{l.timestamp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {auditLog.length === 0 && (
              <p className="mt-4 font-body text-xs text-ciruela/40">
                Sin entradas todavía — este registro es privacidad-relevante (ARCO, acceso a
                datos clínicos), no un log general de cada clic; se va llenando conforme ocurren
                esas acciones.
              </p>
            )}
          </Card>
        )}

        {tab === "Incidentes clínicos" && (
          <Card title="Incidentes clínicos registrados">
            {incidents.length === 0 ? (
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
                  {incidents.map((i) => (
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
