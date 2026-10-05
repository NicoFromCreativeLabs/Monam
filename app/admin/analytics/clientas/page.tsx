"use client";

import { useEffect, useState } from "react";
import { TopBar } from "@/components/panel/TopBar";
import { GlobalFilterBar } from "@/components/panel/GlobalFilterBar";
import { Card, StatTile } from "@/components/panel/Card";
import { KpiCard } from "@/components/panel/KpiCard";
import { useLocations } from "@/components/panel/LocationsContext";
import { usePeriod } from "@/components/panel/PeriodContext";
import { useCompare } from "@/components/panel/CompareContext";
import { ANALYTICS_CLIENTAS, CLIENT_MIX_BY_LOCATION } from "@/lib/mock-data";
import { getReportingSnapshotAction } from "@/lib/actions/reporting";

// Análisis → Clientas. Nivel 1 + Nivel 2 per spec. "% Skin ID completo" is
// one of the client's three thesis KPIs ("el servicio es adquisición y el
// retail es el motor") — kept in Nivel 2, no special treatment needed.
//
// Nivel 1 reads the real reporting snapshot — retención a 90 días has no
// real data source yet (needs months of real appointment history), so it
// honestly reads "Sin datos" rather than a derived number; the real
// KpiTarget still shows. "Nuevas vs. recurrentes" below still reads
// illustrative mock figures.
export default function AnalyticsClientas() {
  const { selectedNames } = useLocations();
  const { period } = usePeriod();
  const { compareTo } = useCompare();

  const [retencionTarget, setRetencionTarget] = useState<number | null>(null);

  useEffect(() => {
    getReportingSnapshotAction(selectedNames, period, compareTo).then((snapshot) => {
      setRetencionTarget(snapshot.kpiTargets["Retención a 90 días"]?.value ?? null);
    });
  }, [selectedNames.join(","), period, compareTo]); // eslint-disable-line react-hooks/exhaustive-deps

  const rows = selectedNames
    .map((name) => CLIENT_MIX_BY_LOCATION[name])
    .filter((r): r is (typeof CLIENT_MIX_BY_LOCATION)[string] => r !== undefined);
  const newPct = rows.length ? rows.reduce((s, r) => s + r.newPct, 0) / rows.length : 0;
  const returningPct = rows.length ? rows.reduce((s, r) => s + r.returningPct, 0) / rows.length : 0;
  const outstandingPrepaidLiability = rows.reduce((s, r) => s + r.outstandingPrepaidLiability, 0);

  return (
    <>
      <TopBar title="Análisis · Clientas" allowBothLocations />
      <GlobalFilterBar />
      <div className="flex-1 space-y-6 px-4 py-6 min-[860px]:px-8">
        <KpiCard
          label={ANALYTICS_CLIENTAS.nivel1.label}
          info={ANALYTICS_CLIENTAS.nivel1.info}
          value="Sin datos"
          sub="Necesita historial de citas para calcularse"
          deltaLabel="Sin historial todavía"
          deltaTone="neutral"
          target={retencionTarget ? `Objetivo ${retencionTarget}%` : ""}
          progressPct={0}
          semaphore="yellow"
        />

        <div className="grid grid-cols-1 gap-4 min-[700px]:grid-cols-2 min-[1200px]:grid-cols-4">
          {ANALYTICS_CLIENTAS.nivel2.map((k) => (
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

        <Card title="Nuevas vs. recurrentes — detalle">
          <div className="grid grid-cols-1 gap-4 min-[700px]:grid-cols-2">
            <div>
              <div className="mb-1 flex justify-between font-body text-xs text-ciruela/60">
                <span>Nuevas</span>
                <span>{Math.round(newPct * 100)}%</span>
              </div>
              <div className="h-2 rounded-full bg-ciruela/8">
                <div className="h-2 rounded-full bg-crepe" style={{ width: `${newPct * 100}%` }} />
              </div>
            </div>
            <div>
              <div className="mb-1 flex justify-between font-body text-xs text-ciruela/60">
                <span>Recurrentes</span>
                <span>{Math.round(returningPct * 100)}%</span>
              </div>
              <div className="h-2 rounded-full bg-ciruela/8">
                <div className="h-2 rounded-full bg-ciruela" style={{ width: `${returningPct * 100}%` }} />
              </div>
            </div>
          </div>
          <div className="mt-6 border-t border-ciruela/8 pt-4">
            <StatTile
              label="Pasivo por paquetes prepagados"
              value={`$${outstandingPrepaidLiability.toLocaleString()} MXN`}
            />
          </div>
        </Card>
      </div>
    </>
  );
}
