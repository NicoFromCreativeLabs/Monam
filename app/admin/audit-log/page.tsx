import { TopBar } from "@/components/panel/TopBar";
import { Card } from "@/components/panel/Card";
import { Badge } from "@/components/panel/Badge";
import { OWNER, AUDIT_LOG, ANOMALY_FLAGS } from "@/lib/mock-data";

// Explicit, surfaced flags, not just raw logs (spec §6.3).
export default function AdminAuditLog() {
  return (
    <>
      <TopBar title="Registro de auditoría" userName={OWNER.name} userRole={OWNER.role} allowBothLocations />
      <div className="flex-1 space-y-6 px-8 py-6">
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
      </div>
    </>
  );
}
