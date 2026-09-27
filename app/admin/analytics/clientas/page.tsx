"use client";

import { TopBar } from "@/components/panel/TopBar";
import { GlobalFilterBar } from "@/components/panel/GlobalFilterBar";
import { Card, StatTile } from "@/components/panel/Card";
import { KpiCard } from "@/components/panel/KpiCard";
import { OWNER, ANALYTICS_CLIENTAS, FINANCIALS_SUMMARY } from "@/lib/mock-data";

// Análisis → Clientas. Nivel 1 + Nivel 2 per spec. "% Skin ID completo" is
// one of the client's three thesis KPIs ("el servicio es adquisición y el
// retail es el motor") — kept in Nivel 2, no special treatment needed.
export default function AnalyticsClientas() {
  const f = FINANCIALS_SUMMARY;

  return (
    <>
      <TopBar title="Análisis · Clientas" userName={OWNER.name} userRole={OWNER.role} allowBothLocations />
      <GlobalFilterBar />
      <div className="flex-1 space-y-6 px-4 py-6 min-[860px]:px-8">
        <KpiCard
          label={ANALYTICS_CLIENTAS.nivel1.label}
          info={ANALYTICS_CLIENTAS.nivel1.info}
          value={ANALYTICS_CLIENTAS.nivel1.value}
          deltaLabel={ANALYTICS_CLIENTAS.nivel1.deltaLabel}
          deltaTone={ANALYTICS_CLIENTAS.nivel1.deltaTone}
          target={ANALYTICS_CLIENTAS.nivel1.target}
          progressPct={ANALYTICS_CLIENTAS.nivel1.progressPct}
          semaphore={ANALYTICS_CLIENTAS.nivel1.semaphore}
          sparkline={ANALYTICS_CLIENTAS.nivel1.sparkline}
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
                <span>{Math.round(f.newVsReturning.new * 100)}%</span>
              </div>
              <div className="h-2 rounded-full bg-ciruela/8">
                <div
                  className="h-2 rounded-full bg-crepe"
                  style={{ width: `${f.newVsReturning.new * 100}%` }}
                />
              </div>
            </div>
            <div>
              <div className="mb-1 flex justify-between font-body text-xs text-ciruela/60">
                <span>Recurrentes</span>
                <span>{Math.round(f.newVsReturning.returning * 100)}%</span>
              </div>
              <div className="h-2 rounded-full bg-ciruela/8">
                <div
                  className="h-2 rounded-full bg-ciruela"
                  style={{ width: `${f.newVsReturning.returning * 100}%` }}
                />
              </div>
            </div>
          </div>
          <div className="mt-6 border-t border-ciruela/8 pt-4">
            <StatTile
              label="Pasivo por paquetes prepagados"
              value={`$${f.outstandingPrepaidLiability.toLocaleString()} MXN`}
            />
          </div>
        </Card>
      </div>
    </>
  );
}
