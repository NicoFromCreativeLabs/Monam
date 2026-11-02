"use client";

import { useEffect, useState } from "react";
import { TopBar } from "@/components/panel/TopBar";
import { GlobalFilterBar } from "@/components/panel/GlobalFilterBar";
import { Card, StatTile } from "@/components/panel/Card";
import { KpiCard } from "@/components/panel/KpiCard";
import { useLocations } from "@/components/panel/LocationsContext";
import { usePeriod } from "@/components/panel/PeriodContext";
import { useCompare } from "@/components/panel/CompareContext";
import { ANALYTICS_CLIENTAS } from "@/lib/mock-data";
import { COMPARE_TO_LABEL } from "@/lib/analytics";
import { getReportingSnapshotAction, type ReportingSnapshot } from "@/lib/actions/reporting";
import { formatRealDelta } from "@/lib/pnl-math";

// Análisis → Clientas. Nivel 1 + Nivel 2 + "Nuevas vs. recurrentes — detalle"
// all read the real reporting snapshot now. "Retención a 90 días" and "LTV
// por cohorte" stay "Sin datos" on purpose — both need months of real
// appointment/purchase history to mean anything (see getRetention90dPct and
// the comment on ClientasDetail), not a derived/projected number.
// ANALYTICS_CLIENTAS is only read for label/info copy.
export default function AnalyticsClientas() {
  const { selectedNames } = useLocations();
  const { period } = usePeriod();
  const { compareTo } = useCompare();

  const [snapshot, setSnapshot] = useState<ReportingSnapshot | null>(null);
  const [retencionTarget, setRetencionTarget] = useState<number | null>(null);

  useEffect(() => {
    getReportingSnapshotAction(selectedNames, period, compareTo).then((snap) => {
      setSnapshot(snap);
      setRetencionTarget(snap.kpiTargets["Retención a 90 días"]?.value ?? null);
    });
  }, [selectedNames.join(","), period, compareTo]); // eslint-disable-line react-hooks/exhaustive-deps

  const c = snapshot?.clientas ?? null;
  const cb = snapshot?.clientasBaseline ?? null;
  const compareLabel = COMPARE_TO_LABEL[compareTo];

  const nuevasDelta = formatRealDelta(c?.newPct ?? null, cb?.newPct ?? null, compareLabel, "pts");
  const frecuenciaDelta = formatRealDelta(c?.visitsPerMonth ?? null, cb?.visitsPerMonth ?? null, compareLabel, "pts");
  const skinIdDelta = formatRealDelta(c?.skinIdCompletePct ?? null, cb?.skinIdCompletePct ?? null, compareLabel, "pts");

  const nivel2Cards = c
    ? [
        {
          id: "nuevas-recurrentes",
          label: ANALYTICS_CLIENTAS.nivel2[0].label,
          info: ANALYTICS_CLIENTAS.nivel2[0].info,
          value: c.newPct !== null ? `${c.newPct}% / ${c.returningPct}%` : "Sin datos",
          deltaLabel: nuevasDelta.label,
          deltaTone: nuevasDelta.tone,
          target: "Meta 35% / 65%",
          progressPct: c.newPct !== null ? Math.min(100, Math.round((c.newPct / 35) * 100)) : 0,
          semaphore: c.newPct === null ? ("yellow" as const) : c.newPct >= 30 ? ("green" as const) : ("yellow" as const),
        },
        {
          id: "frecuencia-visita",
          label: ANALYTICS_CLIENTAS.nivel2[1].label,
          info: ANALYTICS_CLIENTAS.nivel2[1].info,
          value: c.visitsPerMonth !== null ? `${c.visitsPerMonth} visitas/mes` : "Sin datos",
          deltaLabel: frecuenciaDelta.label,
          deltaTone: frecuenciaDelta.tone,
          target: "Objetivo 2.0",
          progressPct: c.visitsPerMonth !== null ? Math.min(100, Math.round((c.visitsPerMonth / 2) * 100)) : 0,
          semaphore: c.visitsPerMonth === null ? ("yellow" as const) : c.visitsPerMonth >= 2 ? ("green" as const) : ("yellow" as const),
        },
        {
          id: "ltv-cohorte",
          label: ANALYTICS_CLIENTAS.nivel2[2].label,
          info: ANALYTICS_CLIENTAS.nivel2[2].info,
          value: "Sin datos",
          deltaLabel: "Necesita meses de historial por cohorte",
          deltaTone: "neutral" as const,
          target: "Objetivo $7,500",
          progressPct: 0,
          semaphore: "yellow" as const,
        },
        {
          id: "skin-id-completo",
          label: ANALYTICS_CLIENTAS.nivel2[3].label,
          info: ANALYTICS_CLIENTAS.nivel2[3].info,
          value: c.skinIdCompletePct !== null ? `${c.skinIdCompletePct}%` : "Sin datos",
          deltaLabel: skinIdDelta.label,
          deltaTone: skinIdDelta.tone,
          target: "Objetivo 90%",
          progressPct: c.skinIdCompletePct !== null ? Math.min(100, Math.round((c.skinIdCompletePct / 90) * 100)) : 0,
          semaphore:
            c.skinIdCompletePct === null ? ("yellow" as const) : c.skinIdCompletePct >= 90 ? ("green" as const) : c.skinIdCompletePct >= 60 ? ("yellow" as const) : ("red" as const),
        },
      ]
    : [];

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

        <Card title="Nuevas vs. recurrentes — detalle">
          {c?.newPct === null || c === null ? (
            <p className="py-4 text-center font-body text-sm text-ciruela/50">Sin citas en este periodo.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 min-[700px]:grid-cols-2">
              <div>
                <div className="mb-1 flex justify-between font-body text-xs text-ciruela/60">
                  <span>Nuevas</span>
                  <span>{c.newPct}%</span>
                </div>
                <div className="h-2 rounded-full bg-ciruela/8">
                  <div className="h-2 rounded-full bg-crepe" style={{ width: `${c.newPct}%` }} />
                </div>
              </div>
              <div>
                <div className="mb-1 flex justify-between font-body text-xs text-ciruela/60">
                  <span>Recurrentes</span>
                  <span>{c.returningPct}%</span>
                </div>
                <div className="h-2 rounded-full bg-ciruela/8">
                  <div className="h-2 rounded-full bg-ciruela" style={{ width: `${c.returningPct}%` }} />
                </div>
              </div>
            </div>
          )}
          <div className="mt-6 border-t border-ciruela/8 pt-4">
            <StatTile
              label="Pasivo por paquetes prepagados"
              value={`$${(c?.outstandingPrepaidLiabilityMxn ?? 0).toLocaleString()} MXN`}
              sub="Consolidado — PackagePurchase no está ligado a una sucursal"
            />
          </div>
        </Card>
      </div>
    </>
  );
}
