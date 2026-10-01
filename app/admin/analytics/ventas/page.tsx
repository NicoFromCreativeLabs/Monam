"use client";

import { useEffect, useState } from "react";
import { TopBar } from "@/components/panel/TopBar";
import { GlobalFilterBar } from "@/components/panel/GlobalFilterBar";
import { Card } from "@/components/panel/Card";
import { KpiCard } from "@/components/panel/KpiCard";
import { useLocations } from "@/components/panel/LocationsContext";
import { usePeriod } from "@/components/panel/PeriodContext";
import { useCompare } from "@/components/panel/CompareContext";
import {
  OWNER,
  ANALYTICS_VENTAS,
  REVENUE_BY_CATEGORY_BY_LOCATION,
  WEEKLY_REVENUE_TREND_BY_LOCATION,
  PROTOCOL_PERFORMANCE_BY_LOCATION,
} from "@/lib/mock-data";
import { COMPARE_TO_LABEL } from "@/lib/analytics";
import { getReportingSnapshotAction } from "@/lib/actions/reporting";
import { ingresoNetoFromBreakdown } from "@/lib/pnl-math";

// Análisis → Ventas. Nivel 1 (headline) + Nivel 2 (supporting KPIs) per
// spec; the revenue detail below folds in what used to live on the old
// /admin/financials page (categoría, tendencia, margen por protocolo) so
// that content isn't left on an orphaned route.
//
// Nivel 1 reads the same real reporting snapshot as Panel/P&L
// (lib/reporting.ts) — real Sale/SaleLineItem aggregation, scoped to
// Local/Periodo/Comparar con. Nivel 2 and the category/trend/protocol
// detail below still read illustrative mock figures — real equivalents for
// those would need a much larger historical dataset to mean anything yet.
export default function AnalyticsVentas() {
  const { selectedNames } = useLocations();
  const { period } = usePeriod();
  const { compareTo } = useCompare();

  const [displayed, setDisplayed] = useState(0);
  const [periodTarget, setPeriodTarget] = useState<number | null>(null);
  const [baseline, setBaseline] = useState<number | null>(null);

  useEffect(() => {
    getReportingSnapshotAction(selectedNames, period, compareTo).then((snapshot) => {
      setDisplayed(ingresoNetoFromBreakdown(snapshot.pnl));
      setPeriodTarget(snapshot.kpiTargets["Ingreso neto (MTD)"]?.value ?? null);
      setBaseline(snapshot.pnlBaseline ? ingresoNetoFromBreakdown(snapshot.pnlBaseline) : null);
    });
  }, [selectedNames.join(","), period, compareTo]); // eslint-disable-line react-hooks/exhaustive-deps

  const progressPct = periodTarget ? Math.round((displayed / periodTarget) * 100) : 0;
  const diff = baseline !== null ? displayed - baseline : null;
  const deltaLabel =
    diff === null
      ? "Sin datos previos"
      : diff === 0
        ? `Sin cambio vs. ${COMPARE_TO_LABEL[compareTo]}`
        : `${diff > 0 ? "▲" : "▼"} ${Math.abs(diff).toLocaleString()} MXN vs. ${COMPARE_TO_LABEL[compareTo]}`;
  const deltaTone = diff === null || diff === 0 ? "neutral" : diff > 0 ? "positive" : "negative";

  const revenueByCategory = Object.entries(
    selectedNames.reduce<Record<string, number>>((acc, name) => {
      const byCategory = REVENUE_BY_CATEGORY_BY_LOCATION[name] ?? {};
      for (const [category, amount] of Object.entries(byCategory)) {
        acc[category] = (acc[category] ?? 0) + amount;
      }
      return acc;
    }, {}),
  ).map(([category, amount]) => ({ category, amount }));

  const weeklyRevenueTrend = (WEEKLY_REVENUE_TREND_BY_LOCATION["Roma Norte"] ?? []).map((w, i) => ({
    week: w.week,
    revenue: selectedNames.reduce(
      (sum, name) => sum + (WEEKLY_REVENUE_TREND_BY_LOCATION[name]?.[i]?.revenue ?? 0),
      0,
    ),
  }));

  const protocolPerformance = (PROTOCOL_PERFORMANCE_BY_LOCATION["Roma Norte"] ?? []).map((p, i) => ({
    protocol: p.protocol,
    tier: p.tier,
    timesPerformed: selectedNames.reduce(
      (sum, name) => sum + (PROTOCOL_PERFORMANCE_BY_LOCATION[name]?.[i]?.timesPerformed ?? 0),
      0,
    ),
    revenue: selectedNames.reduce(
      (sum, name) => sum + (PROTOCOL_PERFORMANCE_BY_LOCATION[name]?.[i]?.revenue ?? 0),
      0,
    ),
    cost: selectedNames.reduce(
      (sum, name) => sum + (PROTOCOL_PERFORMANCE_BY_LOCATION[name]?.[i]?.cost ?? 0),
      0,
    ),
  }));

  const maxWeek = Math.max(...weeklyRevenueTrend.map((w) => w.revenue));
  const maxCategory = Math.max(...revenueByCategory.map((r) => r.amount));

  return (
    <>
      <TopBar title="Análisis · Ventas" userName={OWNER.name} userRole={OWNER.role} allowBothLocations />
      <GlobalFilterBar />
      <div className="flex-1 space-y-6 px-4 py-6 min-[860px]:px-8">
        <KpiCard
          label={ANALYTICS_VENTAS.nivel1.label}
          info={ANALYTICS_VENTAS.nivel1.info}
          value={`$${displayed.toLocaleString()}`}
          sub={periodTarget ? `vs. objetivo $${periodTarget.toLocaleString()}` : "sin objetivo configurado"}
          deltaLabel={deltaLabel}
          deltaTone={deltaTone}
          target={periodTarget ? `Objetivo $${periodTarget.toLocaleString()} · ${progressPct}% de avance` : ""}
          progressPct={progressPct}
          semaphore={progressPct >= 100 ? "green" : progressPct >= 70 ? "yellow" : "red"}
        />

        <div className="grid grid-cols-1 gap-4 min-[700px]:grid-cols-2 min-[1200px]:grid-cols-4">
          {ANALYTICS_VENTAS.nivel2.map((k) => (
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
          <Card title="Ingresos por categoría">
            <ul className="space-y-3">
              {revenueByCategory.map((r) => (
                <li key={r.category}>
                  <div className="mb-1 flex justify-between font-body text-xs text-ciruela/60">
                    <span>{r.category}</span>
                    <span>${r.amount.toLocaleString()} MXN</span>
                  </div>
                  <div className="h-2 rounded-full bg-ciruela/8">
                    <div
                      className="h-2 rounded-full bg-ciruela"
                      style={{ width: `${(r.amount / maxCategory) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Tendencia de ingresos — últimas 8 semanas">
            <div className="flex items-end gap-2">
              {weeklyRevenueTrend.map((w) => (
                <div key={w.week} className="flex flex-1 flex-col items-center gap-1">
                  <span className="font-body text-[10px] text-ciruela/50">
                    ${Math.round(w.revenue / 1000)}k
                  </span>
                  <div className="flex h-24 w-full items-end rounded bg-ciruela/8">
                    <div
                      className="w-full rounded bg-ciruela"
                      style={{ height: `${(w.revenue / maxWeek) * 100}%` }}
                    />
                  </div>
                  <span className="font-body text-[11px] text-ciruela/50">{w.week}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Card title="Ingresos y margen por protocolo">
          <table className="w-full font-body text-sm text-ciruela">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-ciruela/40">
                <th className="pb-2">Protocolo</th>
                <th className="pb-2 text-right">Veces</th>
                <th className="pb-2 text-right">Ingreso</th>
                <th className="pb-2 text-right">Margen</th>
              </tr>
            </thead>
            <tbody>
              {protocolPerformance.map((p) => {
                const margin = p.revenue - p.cost;
                const marginPct = p.revenue ? margin / p.revenue : 0;
                return (
                  <tr key={p.protocol} className="border-t border-ciruela/8">
                    <td className="py-2">
                      {p.protocol} <span className="text-[11px] text-ciruela/40">· {p.tier}</span>
                    </td>
                    <td className="py-2 text-right text-ciruela/60">{p.timesPerformed}</td>
                    <td className="py-2 text-right text-ciruela/60">${p.revenue.toLocaleString()}</td>
                    <td className="py-2 text-right">
                      ${margin.toLocaleString()}{" "}
                      <span className="text-ciruela/40">({Math.round(marginPct * 100)}%)</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-3 font-body text-xs text-ciruela/40">
            Margen = ingreso − costo de producto backbar por tratamiento. No incluye mano de obra,
            comisión ni renta. Ingresos y costos se suman por sucursal según lo seleccionado en
            &ldquo;Local&rdquo; — Consolidado es la suma real de las sucursales activas.
          </p>
        </Card>
      </div>
    </>
  );
}
