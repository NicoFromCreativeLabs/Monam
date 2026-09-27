"use client";

import { TopBar } from "@/components/panel/TopBar";
import { GlobalFilterBar } from "@/components/panel/GlobalFilterBar";
import { Card } from "@/components/panel/Card";
import { KpiCard } from "@/components/panel/KpiCard";
import {
  OWNER,
  ANALYTICS_VENTAS,
  REVENUE_BY_CATEGORY,
  WEEKLY_REVENUE_TREND,
  PROTOCOL_PERFORMANCE,
} from "@/lib/mock-data";

// Análisis → Ventas. Nivel 1 (headline) + Nivel 2 (supporting KPIs) per
// spec; the revenue detail below folds in what used to live on the old
// /admin/financials page (categoría, tendencia, margen por protocolo) so
// that content isn't left on an orphaned route.
export default function AnalyticsVentas() {
  const maxWeek = Math.max(...WEEKLY_REVENUE_TREND.map((w) => w.revenue));
  const maxCategory = Math.max(...REVENUE_BY_CATEGORY.map((r) => r.amount));

  return (
    <>
      <TopBar title="Análisis · Ventas" userName={OWNER.name} userRole={OWNER.role} allowBothLocations />
      <GlobalFilterBar />
      <div className="flex-1 space-y-6 px-4 py-6 min-[860px]:px-8">
        <KpiCard
          label={ANALYTICS_VENTAS.nivel1.label}
          info={ANALYTICS_VENTAS.nivel1.info}
          value={ANALYTICS_VENTAS.nivel1.value}
          sub={ANALYTICS_VENTAS.nivel1.sub}
          deltaLabel={ANALYTICS_VENTAS.nivel1.deltaLabel}
          deltaTone={ANALYTICS_VENTAS.nivel1.deltaTone}
          target={ANALYTICS_VENTAS.nivel1.target}
          progressPct={ANALYTICS_VENTAS.nivel1.progressPct}
          semaphore={ANALYTICS_VENTAS.nivel1.semaphore}
          sparkline={ANALYTICS_VENTAS.nivel1.sparkline}
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
              {REVENUE_BY_CATEGORY.map((r) => (
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
              {WEEKLY_REVENUE_TREND.map((w) => (
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
              {PROTOCOL_PERFORMANCE.map((p) => {
                const margin = p.revenue - p.cost;
                const marginPct = margin / p.revenue;
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
            comisión ni renta.
          </p>
        </Card>
      </div>
    </>
  );
}
