"use client";

import { useEffect, useState } from "react";
import { TopBar } from "@/components/panel/TopBar";
import { GlobalFilterBar } from "@/components/panel/GlobalFilterBar";
import { Card } from "@/components/panel/Card";
import { KpiCard } from "@/components/panel/KpiCard";
import { useLocations } from "@/components/panel/LocationsContext";
import { usePeriod } from "@/components/panel/PeriodContext";
import { useCompare } from "@/components/panel/CompareContext";
import { ANALYTICS_CAPACIDAD, OCCUPANCY_7D_BY_LOCATION, ESTHETICIAN_OCCUPANCY } from "@/lib/mock-data";
import { COMPARE_TO_LABEL } from "@/lib/analytics";
import { getReportingSnapshotAction } from "@/lib/actions/reporting";
import { formatRealDelta } from "@/lib/pnl-math";

// Análisis → Capacidad. Nivel 1 + Nivel 2 per spec; room/esthetician
// occupancy detail below folds in what used to live on /admin/financials.
//
// Nivel 1 reads the real reporting snapshot (lib/reporting.ts — real
// Appointment-hours / available-room-hours for the selected Local/Periodo),
// same source Panel's Ocupación KPI uses. The 7-day occupancy and
// esthetician-hours detail cards below still read illustrative mock
// figures — real equivalents need more booking history to mean anything.
export default function AnalyticsCapacidad() {
  const { selectedNames } = useLocations();
  const { period } = usePeriod();
  const { compareTo } = useCompare();

  const [ocupacionValue, setOcupacionValue] = useState<number | null>(null);
  const [ocupacionBaseline, setOcupacionBaseline] = useState<number | null>(null);
  const [ocupacionTarget, setOcupacionTarget] = useState<number | null>(null);

  useEffect(() => {
    getReportingSnapshotAction(selectedNames, period, compareTo).then((snapshot) => {
      setOcupacionValue(snapshot.rates.ocupacion);
      setOcupacionBaseline(snapshot.ratesBaseline?.ocupacion ?? null);
      setOcupacionTarget(snapshot.kpiTargets["Ocupación de cabinas"]?.value ?? null);
    });
  }, [selectedNames.join(","), period, compareTo]); // eslint-disable-line react-hooks/exhaustive-deps

  const ocupacionProgressPct = ocupacionValue !== null && ocupacionTarget ? Math.round((ocupacionValue / ocupacionTarget) * 100) : 0;
  const ocupacionDelta = formatRealDelta(ocupacionValue, ocupacionBaseline, COMPARE_TO_LABEL[compareTo], "pts");

  const occupancy7d = (OCCUPANCY_7D_BY_LOCATION["Roma Norte"] ?? []).map((d, i) => ({
    day: d.day,
    roomsBooked: selectedNames.reduce(
      (s, name) => s + (OCCUPANCY_7D_BY_LOCATION[name]?.[i]?.roomsBooked ?? 0),
      0,
    ),
    roomsTotal: selectedNames.reduce(
      (s, name) => s + (OCCUPANCY_7D_BY_LOCATION[name]?.[i]?.roomsTotal ?? 0),
      0,
    ),
  }));

  const estheticianOccupancy = ESTHETICIAN_OCCUPANCY.filter((e) => selectedNames.includes(e.location));

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
          {ANALYTICS_CAPACIDAD.nivel2.map((k) => (
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
                      <div className="w-full rounded bg-ciruela" style={{ height: `${pct * 100}%` }} />
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
                Sin esteticistas en esta sucursal todavía.
              </p>
            ) : (
            <ul className="space-y-3">
              {estheticianOccupancy.map((e) => {
                const pct = e.hoursBooked / e.hoursAvailable;
                return (
                  <li key={e.name}>
                    <div className="mb-1 flex justify-between font-body text-xs text-ciruela">
                      <span>{e.name}</span>
                      <span className="text-ciruela/50">
                        {e.hoursBooked}h / {e.hoursAvailable}h · {Math.round(pct * 100)}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-ciruela/8">
                      <div className="h-2 rounded-full bg-ciruela" style={{ width: `${pct * 100}%` }} />
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
