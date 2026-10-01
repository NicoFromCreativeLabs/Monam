"use client";

import { useEffect, useState } from "react";
import { TopBar } from "@/components/panel/TopBar";
import { GlobalFilterBar } from "@/components/panel/GlobalFilterBar";
import { Card, StatTile } from "@/components/panel/Card";
import { KpiCard } from "@/components/panel/KpiCard";
import { useLocations } from "@/components/panel/LocationsContext";
import { usePeriod } from "@/components/panel/PeriodContext";
import { useCompare } from "@/components/panel/CompareContext";
import { OWNER, ANALYTICS_RETAIL, RETAIL_INVENTORY } from "@/lib/mock-data";
import { COMPARE_TO_LABEL } from "@/lib/analytics";
import { getReportingSnapshotAction, type ReportingSnapshot } from "@/lib/actions/reporting";
import { ingresoNetoFromBreakdown, formatRealDelta } from "@/lib/pnl-math";

// Análisis → Retail. Nivel 1 + Nivel 2 per spec. "% del ingreso que es
// retail" and "Attach retail" are two of the client's three thesis KPIs
// ("el servicio es adquisición y el retail es el motor"). Margin/inventory
// detail below folds in what used to live on /admin/financials.
//
// Nivel 1, servicio-margin, and retail COGS all read the real reporting
// snapshot (same lib/reporting.ts source as Panel/P&L). Catalog-level
// retail margin (price vs. cost per SKU, not transactional) still reads
// RETAIL_INVENTORY — a separate, smaller gap from the Inventario real-data
// pass, not wired here.
export default function AnalyticsRetail() {
  const { selectedNames } = useLocations();
  const { period } = usePeriod();
  const { compareTo } = useCompare();

  const retailInventory = RETAIL_INVENTORY.filter((i) => selectedNames.includes(i.location));
  const retailMargin =
    retailInventory.reduce((sum, p) => sum + (p.price - p.cost), 0) /
    retailInventory.reduce((sum, p) => sum + p.price, 0);

  const [snapshot, setSnapshot] = useState<ReportingSnapshot | null>(null);

  useEffect(() => {
    getReportingSnapshotAction(selectedNames, period, compareTo).then(setSnapshot);
  }, [selectedNames.join(","), period, compareTo]); // eslint-disable-line react-hooks/exhaustive-deps

  const neto = snapshot ? ingresoNetoFromBreakdown(snapshot.pnl) : 0;
  const servicioIngreso = snapshot ? snapshot.pnl.serviciosTargeted + snapshot.pnl.serviciosSignature + snapshot.pnl.addOns : 0;
  const servicioCosto = snapshot ? snapshot.pnl.backbarTeorico : 0;
  const servicioMarginPct = servicioIngreso ? Math.round((1 + servicioCosto / servicioIngreso) * 100) : 0;
  const retailCogsSold = snapshot ? -snapshot.pnl.costoRetailVendido : 0;
  const pctIngresoRetail = snapshot && neto ? Math.round((snapshot.pnl.retail / neto) * 100) : 0;

  const netoBaseline = snapshot?.pnlBaseline ? ingresoNetoFromBreakdown(snapshot.pnlBaseline) : 0;
  const pctIngresoRetailBaseline =
    snapshot?.pnlBaseline && netoBaseline ? Math.round((snapshot.pnlBaseline.retail / netoBaseline) * 100) : null;
  // No real KpiTarget exists for "% del ingreso que es retail" specifically
  // — "Attach retail (≤ 7 días)" measures something different (% of
  // tickets with a retail line, not % of revenue). Left without an
  // Objetivo rather than borrowing a target that means something else.
  const pctTarget: number | null = null;
  const pctProgressPct = 0;
  const pctDelta = formatRealDelta(snapshot ? pctIngresoRetail : null, pctIngresoRetailBaseline, COMPARE_TO_LABEL[compareTo], "pts");

  return (
    <>
      <TopBar title="Análisis · Retail" userName={OWNER.name} userRole={OWNER.role} allowBothLocations />
      <GlobalFilterBar />
      <div className="flex-1 space-y-6 px-4 py-6 min-[860px]:px-8">
        <KpiCard
          label={ANALYTICS_RETAIL.nivel1.label}
          info={ANALYTICS_RETAIL.nivel1.info}
          value={snapshot ? `${pctIngresoRetail}%` : "Cargando…"}
          deltaLabel={pctDelta.label}
          deltaTone={pctDelta.tone}
          target={pctTarget ? `Objetivo ${pctTarget}% · ${pctProgressPct}% de avance` : ""}
          progressPct={pctProgressPct}
          semaphore={pctProgressPct >= 100 ? "green" : pctProgressPct >= 70 ? "yellow" : "red"}
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
                <span>{servicioMarginPct}%</span>
              </div>
              <div className="h-2 rounded-full bg-ciruela/8">
                <div className="h-2 rounded-full bg-ciruela" style={{ width: `${servicioMarginPct}%` }} />
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
              <dd>${retailCogsSold.toLocaleString()} MXN</dd>
            </div>
          </dl>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <StatTile
              label="Margen bruto retail"
              value={`${Math.round(retailMargin * 100)}%`}
            />
            <StatTile
              label="SKUs con inventario"
              value={`${retailInventory.length}`}
            />
          </div>
        </Card>
      </div>
    </>
  );
}
