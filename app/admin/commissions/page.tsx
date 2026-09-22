import { TopBar } from "@/components/panel/TopBar";
import { Card } from "@/components/panel/Card";
import { OWNER, COMMISSION_ENTRIES, ATTRIBUTION_LOG } from "@/lib/mock-data";

// Per-staff/per-period totals (spec §5.4). Admin-visible only in Fase 1 —
// staff self-service "My Commission" is Phase 2 per the signed rescope.
export default function AdminCommissions() {
  return (
    <>
      <TopBar title="Comisiones" userName={OWNER.name} userRole={OWNER.role} allowBothLocations />
      <div className="flex-1 space-y-6 px-8 py-6">
        <Card title="Sep 2026 — por persona">
          <table className="w-full font-body text-sm text-ciruela">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-ciruela/40">
                <th className="pb-2">Personal</th>
                <th className="pb-2">Rol</th>
                <th className="pb-2 text-right">Servicio</th>
                <th className="pb-2 text-right">Retail</th>
                <th className="pb-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {COMMISSION_ENTRIES.map((c) => (
                <tr key={c.staff} className="border-t border-ciruela/8">
                  <td className="py-3">{c.staff}</td>
                  <td className="py-3 text-ciruela/60">{c.role}</td>
                  <td className="py-3 text-right text-ciruela/60">${c.service.toLocaleString()}</td>
                  <td className="py-3 text-right text-ciruela/60">${c.retail.toLocaleString()}</td>
                  <td className="py-3 text-right font-medium">${c.total.toLocaleString()} MXN</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title="Registro de atribución — anulaciones manuales">
          <p className="mb-4 font-body text-xs text-ciruela/50">
            Regla por defecto: la esteticista que etiquetó la recomendación se lleva la
            comisión si la clienta compra el producto el mismo día; si no, se la lleva quien
            cerró la venta. Toda anulación manual queda registrada aquí.
          </p>
          <ul className="divide-y divide-ciruela/8">
            {ATTRIBUTION_LOG.map((a) => (
              <li key={a.id} className="py-3 font-body text-sm">
                <p className="text-ciruela">{a.sale}</p>
                <p className="mt-1 text-xs text-ciruela/50">
                  Por defecto: {a.defaultTo} → Asignado a: <span className="text-ciruela">{a.overriddenTo}</span>{" "}
                  · por {a.by} · {a.date}
                </p>
                <p className="mt-1 text-xs italic text-ciruela/50">&ldquo;{a.reason}&rdquo;</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
