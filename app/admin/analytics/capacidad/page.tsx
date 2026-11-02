"use client";

import { useEffect, useState } from "react";
import { TopBar } from "@/components/panel/TopBar";
import { GlobalFilterBar } from "@/components/panel/GlobalFilterBar";
import { Card } from "@/components/panel/Card";
import { KpiCard } from "@/components/panel/KpiCard";
import { useLocations } from "@/components/panel/LocationsContext";
import { usePeriod } from "@/components/panel/PeriodContext";
import { useCompare } from "@/components/panel/CompareContext";
import { ANALYTICS_CAPACIDAD } from "@/lib/mock-data";
import { COMPARE_TO_LABEL } from "@/lib/analytics";
import { getReportingSnapshotAction, type ReportingSnapshot } from "@/lib/actions/reporting";
import { formatRealDelta } from "@/lib/pnl-math";

// Análisis → Capacidad. Nivel 1 + Nivel 2 + the room/esthetician occupancy
// detail all read the real reporting snapshot (lib/reporting.ts). The only
// mocked value left is "Cancelaciones < 24h", which reads "Sin datos" on
// purpose — Appointment has no cancelledAt timestamp yet, so there is
// nothing real to compute until that column exists (see
// getCancellationWithin24hPct). ANALYTICS_CAPACIDAD is only read for
// label/info copy now, never for a value/delta/target.
export default function AnalyticsCapacidad() {
  const { selectedNames } = useLocations();
  const { period } = usePeriod();
  const { compareTo } = useCompare();

  const [snapshot, setSnapshot] = useState<ReportingSnapshot | null>(null);
  const [ocupacionTarget, setOcupacionTarget] = useState<number | null>(null);

  useEffect(() => {
    getReportingSnapshotAction(selectedNames, period, compareTo).then((snap) => {
      setSnapshot(snap);
      setOcupacionTarget(snap.kpiTargets["Ocupación de cabinas"]?.value ?? null);
    });
  }, [selectedNames.join(","), period, compareTo]); // eslint-disable-line react-hooks/exhaustive-deps

  const ocupacionValue = snapshot?.rates.ocupacion ?? null;
  const ocupacionBaseline = snapshot?.ratesBaseline?.ocupacion ?? null;
  const ocupacionProgressPct = ocupacionValue !== null && ocupacionTarget ? Math.round((ocupacionValue / ocupacionTarget) * 100) : 0;
  const compareLabel = COMPARE_TO_LABEL[compareTo];
  const ocupacionDelta = formatRealDelta(ocupacionValue, ocupacionBaseline, compareLabel, "pts");

  const rates = snapshot?.rates ?? null;
  const ratesBaseline = snapshot?.ratesBaseline ?? null;

  const ingresoHoraDelta = formatRealDelta(rates?.ingresoHoraEsteticista ?? null, ratesBaseline?.ingresoHoraEsteticista ?? null, compareLabel, "$");
  const noShowDelta = formatRealDelta(rates?.noShow ?? null, ratesBaseline?.noShow ?? null, compareLabel, "pts");
  const deadHoursDelta = formatRealDelta(rates?.deadHoursPerWeek ?? null, ratesBaseline?.deadHoursPerWeek ?? null, compareLabel, "pts");

  const nivel2Cards = rates
    ? [
        {
          id: "ingreso-hora-cabina",
          label: ANALYTICS_CAPACIDAD.nivel2[0].label,
          info: ANALYTICS_CAPACIDAD.nivel2[0].info,
          value: rates.ingresoHoraEsteticista !== null ? `$${rates.ingresoHoraEsteticista.toLocaleString()} MXN/h` : "Sin datos",
          deltaLabel: ingresoHoraDelta.label,
          deltaTone: ingresoHoraDelta.tone,
          target: "Objetivo $650/h",
          progressPct: rates.ingresoHoraEsteticista !== null ? Math.min(100, Math.round((rates.ingresoHoraEsteticista / 650) * 100)) : 0,
          semaphore:
            rates.ingresoHoraEsteticista === null
              ? ("yellow" as const)
              : rates.ingresoHoraEsteticista >= 650
                ? ("green" as const)
                : rates.ingresoHoraEsteticista >= 500
                  ? ("yellow" as const)
                  : ("red" as const),
        },
        {
          id: "no-shows",
          label: ANALYTICS_CAPACIDAD.nivel2[1].label,
          info: ANALYTICS_CAPACIDAD.nivel2[1].info,
          value: rates.noShow !== null ? `${rates.noShow}%` : "Sin datos",
          deltaLabel: noShowDelta.label,
          deltaTone: noShowDelta.tone,
          target: "Objetivo ≤ 5%",
          progressPct: rates.noShow !== null ? Math.min(100, Math.round((5 / Math.max(0.1, rates.noShow)) * 100)) : 0,
          semaphore: rates.noShow === null ? ("yellow" as const) : rates.noShow <= 5 ? ("green" as const) : rates.noShow <= 8 ? ("yellow" as const) : ("red" as const),
        },
        {
          id: "cancelaciones-24h",
          label: ANALYTICS_CAPACIDAD.nivel2[2].label,
          info: ANALYTICS_CAPACIDAD.nivel2[2].info,
          value: "Sin datos",
          deltaLabel: "Falta registrar la hora de cancelación",
          deltaTone: "neutral" as const,
          target: "Objetivo ≤ 8%",
          progressPct: 0,
          semaphore: "yellow" as const,
        },
        {
          id: "horas-muertas",
          label: ANALYTICS_CAPACIDAD.nivel2[3].label,
          info: ANALYTICS_CAPACIDAD.nivel2[3].info,
          value: rates.deadHoursPerWeek !== null ? `${rates.deadHoursPerWeek} h/semana` : "Sin datos",
          deltaLabel: deadHoursDelta.label,
          deltaTone: deadHoursDelta.tone,
          target: "Objetivo ≤ 2.5 h",
          progressPct: rates.deadHoursPerWeek !== null ? Math.min(100, Math.round((2.5 / Math.max(0.1, rates.deadHoursPerWeek)) * 100)) : 0,
          semaphore:
            rates.deadHoursPerWeek === null
              ? ("yellow" as const)
              : rates.deadHoursPerWeek <= 2.5
                ? ("green" as const)
                : rates.deadHoursPerWeek <= 4
                  ? ("yellow" as const)
                  : ("red" as const),
        },
      ]
    : [];

  const occupancy7d = snapshot?.roomOccupancyNext7Days ?? [];
  const estheticianOccupancy = snapshot?.estheticianOccupancyThisWeek ?? [];

  return (
    <>
      <TopBar title="Análisis · Capacidad" allowBothLocations />
      <GlobalFilterBar />
      <div className="flex-1 space-y-6 px-4 py-6 min-[860px]:px-8">
        <KpiCard
          label={ANALYTICS_CAPACIDAD.nivel1.label}
          info={ANALYTICS_CAPACIDAD.nivel1.info}
          value={ocupacionValue !== null ? `${ocupacionValue}%` : "Sin datos"}
          deltaLabel={ocupacionDelta.label}
          deltaTone={ocupacionDelta.tone}
          target={ocupacionTarget ? `Objetivo ${ocupacionTarget}% · ${ocupacionProgressPct}% de avance` : ""}
          progressPct={ocupacionProgressPct}
          semaphore={ocupacionProgressPct >= 100 ? "green" : ocupacionProgressPct >= 70 ? "yellow" : "red"}
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

        <div className="grid grid-cols-1 gap-6 min-[1100px]:grid-cols-2">
          <Card title="Ocupación de salas — próximos 7 días">
            <div className="flex items-end gap-2">
              {occupancy7d.map((d) => {
                const pct = d.roomsTotal ? d.roomsBooked / d.roomsTotal : 0;
                return (
                  <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                    <div className="flex h-24 w-full items-end rounded bg-ciruela/8">
                      <div className="w-full rounded bg-ciruela" style={{ height: `${Math.min(100, pct * 100)}%` }} />
                    </div>
                    <span className="font-body text-[11px] text-ciruela/50">{d.day}</span>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card title="Ocupación por esteticista — esta semana">
            {estheticianOccupancy.length === 0 ? (
              <p className="py-4 text-center font-body text-sm text-ciruela/50">
                Sin horas de turno registradas esta semana todavía.
              </p>
            ) : (
              <ul className="space-y-3">
                {estheticianOccupancy.map((e) => {
                  const pct = e.hoursAvailable ? e.hoursBooked / e.hoursAvailable : 0;
                  return (
                    <li key={e.name}>
                      <div className="mb-1 flex justify-between font-body text-xs text-ciruela">
                        <span>{e.name}</span>
                        <span className="text-ciruela/50">
                          {e.hoursBooked}h / {e.hoursAvailable}h · {Math.round(pct * 100)}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-ciruela/8">
                        <div className="h-2 rounded-full bg-ciruela" style={{ width: `${Math.min(100, pct * 100)}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
