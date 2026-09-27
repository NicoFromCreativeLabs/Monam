"use client";

import { TopBar } from "@/components/panel/TopBar";
import { GlobalFilterBar } from "@/components/panel/GlobalFilterBar";
import { Card } from "@/components/panel/Card";
import { KpiCard } from "@/components/panel/KpiCard";
import { OWNER, ANALYTICS_EQUIPO, COMMISSION_ENTRIES } from "@/lib/mock-data";

// Análisis → Equipo. Nivel 1 + Nivel 2 per spec. Per-person commission
// summary folded in below (detail-per-transaction lives on the dedicated
// /admin/commissions page under the Equipo nav section).
export default function AnalyticsEquipo() {
  return (
    <>
      <TopBar title="Análisis · Equipo" userName={OWNER.name} userRole={OWNER.role} allowBothLocations />
      <GlobalFilterBar />
      <div className="flex-1 space-y-6 px-4 py-6 min-[860px]:px-8">
        <KpiCard
          label={ANALYTICS_EQUIPO.nivel1.label}
          info={ANALYTICS_EQUIPO.nivel1.info}
          value={ANALYTICS_EQUIPO.nivel1.value}
          deltaLabel={ANALYTICS_EQUIPO.nivel1.deltaLabel}
          deltaTone={ANALYTICS_EQUIPO.nivel1.deltaTone}
          target={ANALYTICS_EQUIPO.nivel1.target}
          progressPct={ANALYTICS_EQUIPO.nivel1.progressPct}
          semaphore={ANALYTICS_EQUIPO.nivel1.semaphore}
          sparkline={ANALYTICS_EQUIPO.nivel1.sparkline}
        />

        <div className="grid grid-cols-1 gap-4 min-[700px]:grid-cols-2 min-[1200px]:grid-cols-4">
          {ANALYTICS_EQUIPO.nivel2.map((k) => (
            <KpiCard
              key={k.id}
              size="sm"
              label={k.label}
              info={k.info}
              value={k.value}
              deltaLabel={k.deltaLabel}
              deltaTone={k.deltaTone}
              target={k.target}
              progressPct={k.progressPct}
              semaphore={k.semaphore}
            />
          ))}
        </div>

        <Card title="Comisiones por persona — mes en curso">
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
                  <td className="py-2.5">{c.staff}</td>
                  <td className="py-2.5 text-ciruela/60">{c.role}</td>
                  <td className="py-2.5 text-right text-ciruela/60">${c.service.toLocaleString()}</td>
                  <td className="py-2.5 text-right text-ciruela/60">${c.retail.toLocaleString()}</td>
                  <td className="py-2.5 text-right font-medium">${c.total.toLocaleString()} MXN</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 font-body text-xs text-ciruela/40">
            Detalle por transacción y anulaciones manuales de atribución: ver Equipo → Comisiones.
          </p>
        </Card>
      </div>
    </>
  );
}
