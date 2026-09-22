import { TopBar } from "@/components/panel/TopBar";
import { Card, StatTile } from "@/components/panel/Card";
import {
  OWNER,
  FINANCIALS_SUMMARY,
  REVENUE_BY_CATEGORY,
  MARGIN_SUMMARY,
  WEEKLY_REVENUE_TREND,
  PROTOCOL_PERFORMANCE,
  RETAIL_INVENTORY,
  OCCUPANCY_7D,
  ESTHETICIAN_OCCUPANCY,
  INVENTORY_CONSUMPTION,
} from "@/lib/mock-data";

// Revenue & occupancy report (spec §6.3) — the deep-dive screen behind the
// Dashboard's summary tiles. MONAM OS is the operational source of truth, it
// does not replace the accountant; margin figures here are COGS-only
// (product cost, not labor/commission/rent) and labeled as such.
export default function AdminFinancials() {
  const f = FINANCIALS_SUMMARY;
  const m = MARGIN_SUMMARY;
  const retailMargin =
    RETAIL_INVENTORY.reduce((sum, p) => sum + (p.price - p.cost), 0) /
    RETAIL_INVENTORY.reduce((sum, p) => sum + p.price, 0);
  const maxWeek = Math.max(...WEEKLY_REVENUE_TREND.map((w) => w.revenue));

  return (
    <>
      <TopBar title="Reportes financieros" userName={OWNER.name} userRole={OWNER.role} allowBothLocations />
      <div className="flex-1 space-y-6 px-8 py-6">
        <div className="grid grid-cols-2 gap-4 min-[1100px]:grid-cols-4">
          <StatTile label="Ingresos (periodo)" value={`$${m.revenue.toLocaleString()} MXN`} />
          <StatTile
            label="Margen bruto"
            value={`$${m.grossMargin.toLocaleString()} MXN`}
            sub={`${Math.round(m.grossMarginPct * 100)}% — solo costo de producto`}
          />
          <StatTile label="Ticket promedio" value={`$${f.averageTicket} MXN`} />
          <StatTile label="Tasa de reagenda" value={`${Math.round(f.rebookingRate * 100)}%`} />
        </div>

        <Card title="Tendencia de ingresos — últimas 8 semanas (Roma Norte)">
          <div className="flex items-end gap-2">
            {WEEKLY_REVENUE_TREND.map((w) => (
              <div key={w.week} className="flex flex-1 flex-col items-center gap-1">
                <span className="font-body text-[10px] text-ciruela/50">
                  ${Math.round(w.revenue / 1000)}k
                </span>
                <div className="flex h-28 w-full items-end rounded bg-ciruela/8">
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

        <div className="grid grid-cols-1 gap-6 min-[1100px]:grid-cols-2">
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
                        {p.protocol}{" "}
                        <span className="text-[11px] text-ciruela/40">· {p.tier}</span>
                      </td>
                      <td className="py-2 text-right text-ciruela/60">{p.timesPerformed}</td>
                      <td className="py-2 text-right text-ciruela/60">
                        ${p.revenue.toLocaleString()}
                      </td>
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
              Margen = ingreso − costo de producto backbar por tratamiento. No incluye mano de
              obra, comisión ni renta.
            </p>
          </Card>

          <Card title="Margen: servicio vs. retail">
            <div className="space-y-4">
              <div>
                <div className="mb-1 flex justify-between font-body text-xs text-ciruela/60">
                  <span>Servicio (Express + Signature)</span>
                  <span>{Math.round((m.serviceCogs > 0 ? 1 - m.serviceCogs / 109200 : 0) * 100)}%</span>
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
            <div className="mt-6 grid grid-cols-2 gap-4 border-t border-ciruela/8 pt-4">
              <StatTile
                label="Nuevas vs. recurrentes"
                value={`${Math.round(f.newVsReturning.new * 100)}% / ${Math.round(f.newVsReturning.returning * 100)}%`}
              />
              <StatTile
                label="Pasivo por paquetes"
                value={`$${f.outstandingPrepaidLiability.toLocaleString()} MXN`}
              />
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 min-[1100px]:grid-cols-2">
          <Card title="Ocupación de salas — próximos 7 días">
            <div className="flex items-end gap-2">
              {OCCUPANCY_7D.map((d) => {
                const pct = d.roomsTotal ? d.roomsBooked / d.roomsTotal : 0;
                return (
                  <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                    <div className="flex h-20 w-full items-end rounded bg-ciruela/8">
                      <div
                        className="w-full rounded bg-ciruela"
                        style={{ height: `${pct * 100}%` }}
                      />
                    </div>
                    <span className="font-body text-[11px] text-ciruela/50">{d.day}</span>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card title="Ocupación por esteticista — esta semana">
            <ul className="space-y-3">
              {ESTHETICIAN_OCCUPANCY.map((e) => {
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
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 min-[1100px]:grid-cols-2">
          <Card title="Ingresos por categoría">
            <ul className="space-y-3">
              {REVENUE_BY_CATEGORY.map((r) => {
                const max = Math.max(...REVENUE_BY_CATEGORY.map((x) => x.amount));
                return (
                  <li key={r.category}>
                    <div className="mb-1 flex justify-between font-body text-xs text-ciruela/60">
                      <span>{r.category}</span>
                      <span>${r.amount.toLocaleString()} MXN</span>
                    </div>
                    <div className="h-2 rounded-full bg-ciruela/8">
                      <div
                        className="h-2 rounded-full bg-ciruela"
                        style={{ width: `${(r.amount / max) * 100}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card title="Inventario — valor y consumo">
            <dl className="space-y-3 font-body text-sm text-ciruela">
              <div className="flex justify-between border-b border-ciruela/8 pb-2">
                <dt className="text-ciruela/50">Valor en inventario</dt>
                <dd>${f.inventoryValue.toLocaleString()} MXN</dd>
              </div>
              <div className="flex justify-between border-b border-ciruela/8 pb-2">
                <dt className="text-ciruela/50">Consumo backbar (periodo)</dt>
                <dd>${INVENTORY_CONSUMPTION.backbarValueConsumed.toLocaleString()} MXN</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ciruela/50">Costo de retail vendido</dt>
                <dd>${INVENTORY_CONSUMPTION.retailCogsSold.toLocaleString()} MXN</dd>
              </div>
            </dl>
          </Card>
        </div>

        <Card title="Exportación para contabilidad">
          <p className="font-body text-sm text-ciruela/70">
            Ventas por día, categoría y método de pago, más los insumos de comisiones —
            formato listo para el contador.
          </p>
          <button className="mt-4 rounded-full bg-ciruela px-5 py-2.5 font-body text-sm text-hueso">
            Exportar (CSV)
          </button>
        </Card>
      </div>
    </>
  );
}
