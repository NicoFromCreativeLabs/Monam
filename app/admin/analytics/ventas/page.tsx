"use client";

import { useEffect, useState } from "react";
import { TopBar } from "@/components/panel/TopBar";
import { GlobalFilterBar } from "@/components/panel/GlobalFilterBar";
import { Card } from "@/components/panel/Card";
import { KpiCard } from "@/components/panel/KpiCard";
import { useLocations } from "@/components/panel/LocationsContext";
import { usePeriod } from "@/components/panel/PeriodContext";
import { useCompare } from "@/components/panel/CompareContext";
import { ANALYTICS_VENTAS } from "@/lib/mock-data";
import { COMPARE_TO_LABEL } from "@/lib/analytics";
import { getReportingSnapshotAction, type ReportingSnapshot } from "@/lib/actions/reporting";
import { ingresoNetoFromBreakdown, formatRealDelta } from "@/lib/pnl-math";

// Análisis → Ventas. Nivel 1 (headline) + Nivel 2 (supporting KPIs) + the
// revenue detail below (categoría, tendencia, margen por protocolo) all read
// the real reporting snapshot (lib/reporting.ts — real Sale/SaleLineItem
// aggregation, scoped to Local/Periodo/Comparar con). Nothing on this page
// is mocked anymore — ANALYTICS_VENTAS.nivel2 is only read for its label/info
// copy, every value/delta/target comes from the snapshot.
export default function AnalyticsVentas() {
  const { selectedNames } = useLocations();
  const { period } = usePeriod();
  const { compareTo } = useCompare();

  const [snapshot, setSnapshot] = useState<ReportingSnapshot | null>(null);
  const [periodTarget, setPeriodTarget] = useState<number | null>(null);
  const [baseline, setBaseline] = useState<number | null>(null);

  useEffect(() => {
    getReportingSnapshotAction(selectedNames, period, compareTo).then((snap) => {
      setSnapshot(snap);
      setPeriodTarget(snap.kpiTargets["Ingreso neto (MTD)"]?.value ?? null);
      setBaseline(snap.pnlBaseline ? ingresoNetoFromBreakdown(snap.pnlBaseline) : null);
    });
  }, [selectedNames.join(","), period, compareTo]); // eslint-disable-line react-hooks/exhaustive-deps

  const displayed = snapshot ? ingresoNetoFromBreakdown(snapshot.pnl) : 0;
  const progressPct = periodTarget ? Math.round((displayed / periodTarget) * 100) : 0;
  const diff = baseline !== null ? displayed - baseline : null;
  const deltaLabel =
    diff === null
      ? "Sin datos previos"
      : diff === 0
        ? `Sin cambio vs. ${COMPARE_TO_LABEL[compareTo]}`
        : `${diff > 0 ? "▲" : "▼"} ${Math.abs(diff).toLocaleString()} MXN vs. ${COMPARE_TO_LABEL[compareTo]}`;
  const deltaTone = diff === null || diff === 0 ? "neutral" : diff > 0 ? "positive" : "negative";

  const n2 = snapshot?.ventas.nivel2 ?? null;
  const n2b = snapshot?.ventasBaseline ?? null;
  const compareLabel = COMPARE_TO_LABEL[compareTo];

  const mezclaDelta = formatRealDelta(n2?.retailPct ?? null, n2b?.retailPct ?? null, compareLabel, "pts");
  const targetedDelta = formatRealDelta(n2?.targetedPct ?? null, n2b?.targetedPct ?? null, compareLabel, "pts");
  const descuentosDelta = formatRealDelta(n2?.descuentosPct ?? null, n2b?.descuentosPct ?? null, compareLabel, "pts");
  const ticketDelta = formatRealDelta(n2?.ticketPorVisita ?? null, n2b?.ticketPorVisita ?? null, compareLabel, "$");

  const nivel2Cards = n2
    ? [
        {
          id: "mezcla",
          label: ANALYTICS_VENTAS.nivel2[0].label,
          info: ANALYTICS_VENTAS.nivel2[0].info,
          value: `${n2.servicioPct}% servicio · ${n2.retailPct}% retail · ${n2.addOnsPct}% add-ons${n2.paquetesPct ? ` · ${n2.paquetesPct}% paquetes` : ""}`,
          deltaLabel: mezclaDelta.label,
          deltaTone: mezclaDelta.tone,
          target: "Meta retail ≥ 30%",
          progressPct: Math.min(100, Math.round((n2.retailPct / 30) * 100)),
          semaphore: n2.retailPct >= 30 ? ("green" as const) : n2.retailPct >= 20 ? ("yellow" as const) : ("red" as const),
        },
        {
          id: "targeted-signature",
          label: ANALYTICS_VENTAS.nivel2[1].label,
          info: ANALYTICS_VENTAS.nivel2[1].info,
          value: `${n2.targetedPct}% / ${n2.signaturePct}%`,
          deltaLabel: targetedDelta.label,
          deltaTone: targetedDelta.tone,
          target: "Meta 55% / 45%",
          progressPct: Math.min(100, Math.round((n2.targetedPct / 55) * 100)),
          semaphore: n2.targetedPct <= 60 ? ("green" as const) : ("yellow" as const),
        },
        {
          id: "descuentos-pct",
          label: ANALYTICS_VENTAS.nivel2[2].label,
          info: ANALYTICS_VENTAS.nivel2[2].info,
          value: `${n2.descuentosPct}%`,
          deltaLabel: descuentosDelta.label,
          deltaTone: descuentosDelta.tone,
          target: "Objetivo ≤ 3%",
          progressPct: Math.min(100, Math.round((3 / Math.max(0.1, n2.descuentosPct)) * 100)),
          semaphore: n2.descuentosPct <= 3 ? ("green" as const) : n2.descuentosPct <= 5 ? ("yellow" as const) : ("red" as const),
        },
        {
          id: "ticket-visita",
          label: ANALYTICS_VENTAS.nivel2[3].label,
          info: ANALYTICS_VENTAS.nivel2[3].info,
          value: n2.ticketPorVisita !== null ? `$${n2.ticketPorVisita.toLocaleString()} MXN` : "Sin datos",
          deltaLabel: ticketDelta.label,
          deltaTone: ticketDelta.tone,
          target: "",
          progressPct: 0,
          semaphore: "yellow" as const,
        },
      ]
    : [];

  const revenueByCategory = snapshot?.ventas.revenueByCategory ?? [];
  const weeklyRevenueTrend = snapshot?.ventasWeeklyTrend ?? [];
  const protocolPerformance = snapshot?.ventas.protocolPerformance ?? [];

  const maxWeek = Math.max(1, ...weeklyRevenueTrend.map((w) => w.revenue));
  const maxCategory = Math.max(1, ...revenueByCategory.map((r) => r.amount));

  return (
    <>
      <TopBar title="Análisis · Ventas" allowBothLocations />
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
          <Card title="Ingresos por categoría">
            {revenueByCategory.every((r) => r.amount === 0) ? (
              <p className="py-4 text-center font-body text-sm text-ciruela/50">Sin ventas en este periodo.</p>
            ) : (
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
            )}
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
          {protocolPerformance.length === 0 ? (
            <p className="py-4 text-center font-body text-sm text-ciruela/50">
              Sin servicios cobrados en este periodo.
            </p>
          ) : (
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
          )}
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
