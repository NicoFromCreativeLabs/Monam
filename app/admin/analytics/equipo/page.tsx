"use client";

import { useEffect, useState } from "react";
import { TopBar } from "@/components/panel/TopBar";
import { GlobalFilterBar } from "@/components/panel/GlobalFilterBar";
import { Card } from "@/components/panel/Card";
import { KpiCard } from "@/components/panel/KpiCard";
import { useLocations } from "@/components/panel/LocationsContext";
import { usePeriod } from "@/components/panel/PeriodContext";
import { useCompare } from "@/components/panel/CompareContext";
import { ANALYTICS_EQUIPO } from "@/lib/mock-data";
import { COMPARE_TO_LABEL } from "@/lib/analytics";
import { getReportingSnapshotAction, type ReportingSnapshot } from "@/lib/actions/reporting";
import { ingresoNetoFromBreakdown, formatRealDelta } from "@/lib/pnl-math";

// Análisis → Equipo. Nivel 1 + Nivel 2 + the per-person commission table all
// read the real reporting snapshot now (lib/reporting.ts —
// getEquipoCommissions). "Rebooking" stays "Sin datos" on purpose — same
// no-op as getRebookingPct everywhere else, needs real booking history.
// Detail-per-transaction still lives on /admin/commissions.
export default function AnalyticsEquipo() {
  const { selectedNames } = useLocations();
  const { period } = usePeriod();
  const { compareTo } = useCompare();

  const [snapshot, setSnapshot] = useState<ReportingSnapshot | null>(null);

  useEffect(() => {
    getReportingSnapshotAction(selectedNames, period, compareTo).then(setSnapshot);
  }, [selectedNames.join(","), period, compareTo]); // eslint-disable-line react-hooks/exhaustive-deps

  const compareLabel = COMPARE_TO_LABEL[compareTo];
  const ingresoHoraValue = snapshot?.rates.ingresoHoraEsteticista ?? null;
  const ingresoHoraDelta = formatRealDelta(ingresoHoraValue, snapshot?.ratesBaseline?.ingresoHoraEsteticista ?? null, compareLabel, "$");

  const ocupacionDelta = formatRealDelta(snapshot?.rates.ocupacion ?? null, snapshot?.ratesBaseline?.ocupacion ?? null, compareLabel, "pts");
  const attachDelta = formatRealDelta(snapshot?.rates.attachRetail ?? null, snapshot?.ratesBaseline?.attachRetail ?? null, compareLabel, "pts");

  const neto = snapshot ? ingresoNetoFromBreakdown(snapshot.pnl) : 0;
  const netoBaseline = snapshot?.pnlBaseline ? ingresoNetoFromBreakdown(snapshot.pnlBaseline) : 0;
  const commissionTotal = snapshot?.equipoCommissions.reduce((s, c) => s + c.total, 0) ?? 0;
  const comisionPct = neto ? Math.round((commissionTotal / neto) * 1000) / 10 : null;
  // No baseline commission total is fetched separately — approximate the
  // comparison from pnl.comisionesServicio/comisionesRetail, which already
  // cover the baseline range.
  const comisionPctBaseline =
    snapshot?.pnlBaseline && netoBaseline
      ? Math.round(((-snapshot.pnlBaseline.comisionesServicio - snapshot.pnlBaseline.comisionesRetail) / netoBaseline) * 1000) / 10
      : null;
  const comisionDelta = formatRealDelta(comisionPct, comisionPctBaseline, compareLabel, "pts");

  const nivel2Cards = snapshot
    ? [
        {
          id: "ocupacion-equipo",
          label: ANALYTICS_EQUIPO.nivel2[0].label,
          info: ANALYTICS_EQUIPO.nivel2[0].info,
          value: snapshot.rates.ocupacion !== null ? `${snapshot.rates.ocupacion}%` : "Sin datos",
          deltaLabel: ocupacionDelta.label,
          deltaTone: ocupacionDelta.tone,
          target: "Objetivo 80%",
          progressPct: snapshot.rates.ocupacion !== null ? Math.min(100, Math.round((snapshot.rates.ocupacion / 80) * 100)) : 0,
          semaphore: snapshot.rates.ocupacion === null ? ("yellow" as const) : snapshot.rates.ocupacion >= 80 ? ("green" as const) : ("yellow" as const),
        },
        {
          id: "attach-equipo",
          label: ANALYTICS_EQUIPO.nivel2[1].label,
          info: ANALYTICS_EQUIPO.nivel2[1].info,
          value: snapshot.rates.attachRetail !== null ? `${snapshot.rates.attachRetail}%` : "Sin datos",
          deltaLabel: attachDelta.label,
          deltaTone: attachDelta.tone,
          target: "Objetivo 40%",
          progressPct: snapshot.rates.attachRetail !== null ? Math.min(100, Math.round((snapshot.rates.attachRetail / 40) * 100)) : 0,
          semaphore: ("yellow" as const),
        },
        {
          id: "rebooking-equipo",
          label: ANALYTICS_EQUIPO.nivel2[2].label,
          info: ANALYTICS_EQUIPO.nivel2[2].info,
          value: "Sin datos",
          deltaLabel: "Necesita historial de citas",
          deltaTone: "neutral" as const,
          target: "Objetivo 65%",
          progressPct: 0,
          semaphore: "yellow" as const,
        },
        {
          id: "comision-pct-ingreso",
          label: ANALYTICS_EQUIPO.nivel2[3].label,
          info: ANALYTICS_EQUIPO.nivel2[3].info,
          value: comisionPct !== null ? `${comisionPct}%` : "Sin datos",
          deltaLabel: comisionDelta.label,
          deltaTone: comisionDelta.tone,
          target: "Objetivo ≤ 12%",
          progressPct: comisionPct !== null ? Math.min(100, Math.round((12 / Math.max(0.1, comisionPct)) * 100)) : 0,
          semaphore: comisionPct === null ? ("yellow" as const) : comisionPct <= 12 ? ("green" as const) : ("red" as const),
        },
      ]
    : [];

  const commissionEntries = snapshot?.equipoCommissions ?? [];

  return (
    <>
      <TopBar title="Análisis · Equipo" allowBothLocations />
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
          {nivel2Cards.map((k) => (
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

        <Card title="Comisiones por persona — periodo seleccionado">
          {commissionEntries.length === 0 ? (
            <p className="py-4 text-center font-body text-sm text-ciruela/50">
              Sin comisiones generadas en este periodo todavía.
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
                  <tr key={c.name} className="border-t border-ciruela/8">
                    <td className="py-2.5">{c.name}</td>
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
