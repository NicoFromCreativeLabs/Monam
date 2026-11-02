"use client";

import { useEffect, useState } from "react";
import { TopBar } from "@/components/panel/TopBar";
import { GlobalFilterBar } from "@/components/panel/GlobalFilterBar";
import { Card, StatTile } from "@/components/panel/Card";
import { KpiCard } from "@/components/panel/KpiCard";
import { useLocations } from "@/components/panel/LocationsContext";
import { usePeriod } from "@/components/panel/PeriodContext";
import { useCompare } from "@/components/panel/CompareContext";
import { ANALYTICS_RETAIL } from "@/lib/mock-data";
import { COMPARE_TO_LABEL } from "@/lib/analytics";
import { getReportingSnapshotAction, type ReportingSnapshot } from "@/lib/actions/reporting";
import { ingresoNetoFromBreakdown, formatRealDelta } from "@/lib/pnl-math";

// Análisis → Retail. Nivel 1 + Nivel 2 + the margin/inventory detail below
// all read the real reporting snapshot now (lib/reporting.ts —
// getRetailDetail). ANALYTICS_RETAIL is only read for label/info copy.
export default function AnalyticsRetail() {
  const { selectedNames } = useLocations();
  const { period } = usePeriod();
  const { compareTo } = useCompare();

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
  const compareLabel = COMPARE_TO_LABEL[compareTo];
  // No real KpiTarget exists for "% del ingreso que es retail" specifically
  // — "Attach retail (≤ 7 días)" measures something different (% of
  // tickets with a retail line, not % of revenue). Left without an
  // Objetivo rather than borrowing a target that means something else.
  const pctTarget: number | null = null;
  const pctProgressPct = 0;
  const pctDelta = formatRealDelta(snapshot ? pctIngresoRetail : null, pctIngresoRetailBaseline, compareLabel, "pts");

  const r = snapshot?.retail ?? null;
  const rb = snapshot?.retailBaseline ?? null;
  const attachDelta = formatRealDelta(snapshot?.rates.attachRetail ?? null, snapshot?.ratesBaseline?.attachRetail ?? null, compareLabel, "pts");
  const conversionDelta = formatRealDelta(r?.conversionProtocoloProducto ?? null, rb?.conversionProtocoloProducto ?? null, compareLabel, "pts");
  const unidadesDelta = formatRealDelta(r?.unidadesPorTicket ?? null, rb?.unidadesPorTicket ?? null, compareLabel, "pts");
  const sellThroughDelta = formatRealDelta(r?.sellThroughPct ?? null, rb?.sellThroughPct ?? null, compareLabel, "pts");

  const nivel2Cards = r
    ? [
        {
          id: "attach-retail-2",
          label: ANALYTICS_RETAIL.nivel2[0].label,
          info: ANALYTICS_RETAIL.nivel2[0].info,
          value: snapshot?.rates.attachRetail !== null && snapshot?.rates.attachRetail !== undefined ? `${snapshot.rates.attachRetail}%` : "Sin datos",
          deltaLabel: attachDelta.label,
          deltaTone: attachDelta.tone,
          target: "Objetivo 40%",
          progressPct: snapshot?.rates.attachRetail ? Math.min(100, Math.round((snapshot.rates.attachRetail / 40) * 100)) : 0,
          semaphore: ("yellow" as const),
        },
        {
          id: "conversion-protocolo-producto",
          label: ANALYTICS_RETAIL.nivel2[1].label,
          info: ANALYTICS_RETAIL.nivel2[1].info,
          value: r.conversionProtocoloProducto !== null ? `${r.conversionProtocoloProducto}%` : "Sin datos",
          deltaLabel: conversionDelta.label,
          deltaTone: conversionDelta.tone,
          target: "Objetivo 45%",
          progressPct: r.conversionProtocoloProducto !== null ? Math.min(100, Math.round((r.conversionProtocoloProducto / 45) * 100)) : 0,
          semaphore: ("yellow" as const),
        },
        {
          id: "unidades-ticket",
          label: ANALYTICS_RETAIL.nivel2[2].label,
          info: ANALYTICS_RETAIL.nivel2[2].info,
          value: r.unidadesPorTicket !== null ? `${r.unidadesPorTicket} uds` : "Sin datos",
          deltaLabel: unidadesDelta.label,
          deltaTone: unidadesDelta.tone,
          target: "Objetivo 1.6",
          progressPct: r.unidadesPorTicket !== null ? Math.min(100, Math.round((r.unidadesPorTicket / 1.6) * 100)) : 0,
          semaphore: ("yellow" as const),
        },
        {
          id: "sell-through-sku",
          label: ANALYTICS_RETAIL.nivel2[3].label,
          info: ANALYTICS_RETAIL.nivel2[3].info,
          value: r.sellThroughPct !== null ? `${r.sellThroughPct}%` : "Sin datos",
          deltaLabel: sellThroughDelta.label,
          deltaTone: sellThroughDelta.tone,
          target: "Objetivo 70%",
          progressPct: r.sellThroughPct !== null ? Math.min(100, Math.round((r.sellThroughPct / 70) * 100)) : 0,
          semaphore: ("yellow" as const),
        },
      ]
    : [];

  return (
    <>
      <TopBar title="Análisis · Retail" allowBothLocations />
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
                <span>{r?.retailMarginPct !== null && r?.retailMarginPct !== undefined ? `${r.retailMarginPct}%` : "Sin datos"}</span>
              </div>
              <div className="h-2 rounded-full bg-ciruela/8">
                <div className="h-2 rounded-full bg-crepe" style={{ width: `${r?.retailMarginPct ?? 0}%` }} />
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
            <StatTile label="Margen bruto retail" value={r?.retailMarginPct !== null && r?.retailMarginPct !== undefined ? `${r.retailMarginPct}%` : "Sin datos"} />
            <StatTile label="SKUs con inventario" value={`${r?.skusConInventario ?? 0}`} />
          </div>
        </Card>
      </div>
    </>
  );
}
