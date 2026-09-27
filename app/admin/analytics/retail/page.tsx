"use client";

import { TopBar } from "@/components/panel/TopBar";
import { GlobalFilterBar } from "@/components/panel/GlobalFilterBar";
import { Card, StatTile } from "@/components/panel/Card";
import { KpiCard } from "@/components/panel/KpiCard";
import {
  OWNER,
  ANALYTICS_RETAIL,
  RETAIL_INVENTORY,
  MARGIN_SUMMARY,
  INVENTORY_CONSUMPTION,
} from "@/lib/mock-data";

// Análisis → Retail. Nivel 1 + Nivel 2 per spec. "% del ingreso que es
// retail" and "Attach retail" are two of the client's three thesis KPIs
// ("el servicio es adquisición y el retail es el motor"). Margin/inventory
// detail below folds in what used to live on /admin/financials.
export default function AnalyticsRetail() {
  const m = MARGIN_SUMMARY;
  const retailMargin =
    RETAIL_INVENTORY.reduce((sum, p) => sum + (p.price - p.cost), 0) /
    RETAIL_INVENTORY.reduce((sum, p) => sum + p.price, 0);

  return (
    <>
      <TopBar title="Análisis · Retail" userName={OWNER.name} userRole={OWNER.role} allowBothLocations />
      <GlobalFilterBar />
      <div className="flex-1 space-y-6 px-4 py-6 min-[860px]:px-8">
        <KpiCard
          label={ANALYTICS_RETAIL.nivel1.label}
          info={ANALYTICS_RETAIL.nivel1.info}
          value={ANALYTICS_RETAIL.nivel1.value}
          deltaLabel={ANALYTICS_RETAIL.nivel1.deltaLabel}
          deltaTone={ANALYTICS_RETAIL.nivel1.deltaTone}
          target={ANALYTICS_RETAIL.nivel1.target}
          progressPct={ANALYTICS_RETAIL.nivel1.progressPct}
          semaphore={ANALYTICS_RETAIL.nivel1.semaphore}
          sparkline={ANALYTICS_RETAIL.nivel1.sparkline}
        />

        <div className="grid grid-cols-1 gap-4 min-[700px]:grid-cols-2 min-[1200px]:grid-cols-4">
          {ANALYTICS_RETAIL.nivel2.map((k) => (
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

        <Card title="Margen: servicio vs. retail">
          <div className="space-y-4">
            <div>
              <div className="mb-1 flex justify-between font-body text-xs text-ciruela/60">
                <span>Servicio (Targeted + Signature)</span>
                <span>{Math.round((1 - m.serviceCogs / 109200) * 100)}%</span>
              </div>
              <div className="h-2 rounded-full bg-ciruela/8">
                <div
                  className="h-2 rounded-full bg-ciruela"
                  style={{ width: `${(1 - m.serviceCogs / 109200) * 100}%` }}
                />
              </div>
            </div>
            <div>
              <div className="mb-1 flex justify-between font-body text-xs text-ciruela/60">
                <span>Retail</span>
                <span>{Math.round(retailMargin * 100)}%</span>
              </div>
              <div className="h-2 rounded-full bg-ciruela/8">
                <div className="h-2 rounded-full bg-crepe" style={{ width: `${retailMargin * 100}%` }} />
              </div>
            </div>
          </div>
        </Card>

        <Card title="Inventario retail — valor y consumo">
          <dl className="space-y-3 font-body text-sm text-ciruela">
            <div className="flex justify-between border-b border-ciruela/8 pb-2">
              <dt className="text-ciruela/50">Costo de retail vendido (periodo)</dt>
              <dd>${INVENTORY_CONSUMPTION.retailCogsSold.toLocaleString()} MXN</dd>
            </div>
          </dl>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <StatTile
              label="Margen bruto retail"
              value={`${Math.round(retailMargin * 100)}%`}
            />
            <StatTile
              label="SKUs con inventario"
              value={`${RETAIL_INVENTORY.length}`}
            />
          </div>
        </Card>
      </div>
    </>
  );
}
