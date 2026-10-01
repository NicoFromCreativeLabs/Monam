"use client";

import { useEffect, useState } from "react";
import { TopBar } from "@/components/panel/TopBar";
import { GlobalFilterBar } from "@/components/panel/GlobalFilterBar";
import { Card } from "@/components/panel/Card";
import { KpiCard } from "@/components/panel/KpiCard";
import { useLocations } from "@/components/panel/LocationsContext";
import { usePeriod } from "@/components/panel/PeriodContext";
import { useCompare } from "@/components/panel/CompareContext";
import { OWNER, ANALYTICS_EQUIPO, COMMISSION_ENTRIES } from "@/lib/mock-data";
import { COMPARE_TO_LABEL } from "@/lib/analytics";
import { getReportingSnapshotAction } from "@/lib/actions/reporting";
import { formatRealDelta } from "@/lib/pnl-math";

// Análisis → Equipo. Nivel 1 + Nivel 2 per spec. Per-person commission
// summary folded in below (detail-per-transaction lives on the dedicated
// /admin/commissions page under the Equipo nav section).
//
// Nivel 1 reads the real reporting snapshot (real revenue from completed
// SERVICE/ADD_ON line items ÷ real scheduled esthetician hours, same source
// Panel's "Ingreso/hora" would use). The commission table below still
// reads illustrative mock figures — /admin/commissions has the real
// per-person/per-transaction breakdown.
export default function AnalyticsEquipo() {
  const { selectedNames } = useLocations();
  const { period } = usePeriod();
  const { compareTo } = useCompare();

  const commissionEntries = COMMISSION_ENTRIES.filter((c) => selectedNames.includes(c.location));

  const [ingresoHoraValue, setIngresoHoraValue] = useState<number | null>(null);
  const [ingresoHoraBaseline, setIngresoHoraBaseline] = useState<number | null>(null);

  useEffect(() => {
    getReportingSnapshotAction(selectedNames, period, compareTo).then((snapshot) => {
      setIngresoHoraValue(snapshot.rates.ingresoHoraEsteticista);
      setIngresoHoraBaseline(snapshot.ratesBaseline?.ingresoHoraEsteticista ?? null);
    });
  }, [selectedNames.join(","), period, compareTo]); // eslint-disable-line react-hooks/exhaustive-deps

  // No real KpiTarget exists for $/hora esteticista yet.
  const ingresoHoraDelta = formatRealDelta(ingresoHoraValue, ingresoHoraBaseline, COMPARE_TO_LABEL[compareTo], "$");

  return (
    <>
      <TopBar title="Análisis · Equipo" userName={OWNER.name} userRole={OWNER.role} allowBothLocations />
      <GlobalFilterBar />
      <div className="flex-1 space-y-6 px-4 py-6 min-[860px]:px-8">
        <KpiCard
          label={ANALYTICS_EQUIPO.nivel1.label}
          info={ANALYTICS_EQUIPO.nivel1.info}
          value={ingresoHoraValue !== null ? `$${ingresoHoraValue} MXN/h` : "Sin datos"}
          deltaLabel={ingresoHoraDelta.label}
          deltaTone={ingresoHoraDelta.tone}
          target=""
          progressPct={0}
          semaphore="yellow"
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
          {commissionEntries.length === 0 ? (
            <p className="py-4 text-center font-body text-sm text-ciruela/50">
              Sin personal en esta sucursal todavía.
            </p>
          ) : (
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
              {commissionEntries.map((c) => (
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
          )}
          <p className="mt-3 font-body text-xs text-ciruela/40">
            Detalle por transacción y anulaciones manuales de atribución: ver Equipo → Comisiones.
          </p>
        </Card>
      </div>
    </>
  );
}
