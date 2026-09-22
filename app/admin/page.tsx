"use client";

import { TopBar } from "@/components/panel/TopBar";
import { Card, StatTile } from "@/components/panel/Card";
import { useLocations } from "@/components/panel/LocationsContext";
import {
  DASHBOARD_REVENUE,
  OCCUPANCY_7D,
  RETAIL_ATTACH_RATE,
  EXPRESS_SIGNATURE_MIX,
  LOW_STOCK_ALERTS,
  PENDING_APPROVALS,
  PROTOCOL_RETAIL_LINK,
  OWNER,
} from "@/lib/mock-data";

// Owner home dashboard — implements the exact §6.2 spec order. Mock data
// only, but scoped to whatever location(s) the switcher in the top bar has
// selected: revenue, low-stock, and approvals filter by location (they
// carry a `location` field); occupancy, attach rate, and the
// protocol→retail link are still single Roma-Norte-only datasets in the
// mock (no per-location split exists yet), so they read as empty rather
// than silently showing Roma Norte's numbers under a Prado Norte view.
export default function AdminDashboard() {
  const { selectedNames } = useLocations();
  const hasRomaNorte = selectedNames.includes("Roma Norte");

  const revenue = DASHBOARD_REVENUE.filter((r) => selectedNames.includes(r.location));
  const lowStock = LOW_STOCK_ALERTS.filter((i) => selectedNames.includes(i.location));
  const approvals = PENDING_APPROVALS.filter((a) => selectedNames.includes(a.location));

  const revenueTotal = {
    today: revenue.reduce((sum, r) => sum + r.today, 0),
    yesterday: revenue.reduce((sum, r) => sum + r.yesterday, 0),
  };

  return (
    <>
      <TopBar
        title="Panel"
        userName={OWNER.name}
        userRole={OWNER.role}
        allowBothLocations
      />
      <div className="flex-1 space-y-6 px-8 py-6">
        {/* 1. Revenue, scoped to selected location(s) */}
        <div className="grid grid-cols-1 gap-4 min-[860px]:grid-cols-2">
          {revenue.length === 0 ? (
            <StatTile label="Ingresos — Hoy" value="$0 MXN" sub="Sin datos para esta sucursal" />
          ) : (
            revenue.map((r) => (
              <StatTile
                key={r.location}
                label={`${r.location} — Hoy`}
                value={`$${r.today.toLocaleString()} MXN`}
                sub={`Ayer: $${r.yesterday.toLocaleString()} MXN`}
              />
            ))
          )}
          {revenue.length > 1 && (
            <StatTile
              label="Total — Hoy (sucursales seleccionadas)"
              value={`$${revenueTotal.today.toLocaleString()} MXN`}
              sub={`Ayer: $${revenueTotal.yesterday.toLocaleString()} MXN`}
            />
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 min-[1100px]:grid-cols-3">
          {/* 2. 7-day occupancy */}
          <Card title="Ocupación — próximos 7 días">
            {hasRomaNorte ? (
              <div className="flex items-end gap-2">
                {OCCUPANCY_7D.map((d) => {
                  const pct = d.roomsTotal ? d.roomsBooked / d.roomsTotal : 0;
                  return (
                    <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                      <div className="flex h-24 w-full items-end rounded bg-ciruela/8">
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
            ) : (
              <EmptyLocationNote />
            )}
          </Card>

          {/* 3. Retail attach rate + Express/Signature mix */}
          <Card title="Tasa de conversión a retail">
            {hasRomaNorte ? (
              <>
                <p className="font-display text-3xl text-ciruela">
                  {Math.round(RETAIL_ATTACH_RATE * 100)}%
                </p>
                <p className="mt-4 font-body text-xs uppercase tracking-[0.14em] text-ciruela/50">
                  Express vs. Signature
                </p>
                <div className="mt-2 flex h-3 overflow-hidden rounded-full bg-ciruela/8">
                  <div
                    className="bg-ciruela"
                    style={{ width: `${EXPRESS_SIGNATURE_MIX.express * 100}%` }}
                  />
                  <div
                    className="bg-crepe"
                    style={{ width: `${EXPRESS_SIGNATURE_MIX.signature * 100}%` }}
                  />
                </div>
                <div className="mt-2 flex justify-between font-body text-[11px] text-ciruela/50">
                  <span>Express {Math.round(EXPRESS_SIGNATURE_MIX.express * 100)}%</span>
                  <span>Signature {Math.round(EXPRESS_SIGNATURE_MIX.signature * 100)}%</span>
                </div>
              </>
            ) : (
              <EmptyLocationNote />
            )}
          </Card>

          {/* 5. Pending approvals, scoped to selected location(s) */}
          <Card title="Aprobaciones pendientes">
            {approvals.length === 0 ? (
              <EmptyLocationNote text="Sin aprobaciones pendientes en esta sucursal." />
            ) : (
              <ul className="space-y-3">
                {approvals.map((a) => (
                  <li key={a.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-body text-sm text-ciruela">
                        {a.type} · {a.client}
                      </p>
                      <p className="font-body text-xs text-ciruela/50">
                        {a.requestedBy} · {a.amount}
                      </p>
                    </div>
                    <button className="rounded-full bg-ciruela px-3 py-1 font-body text-xs text-hueso">
                      Revisar
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* 4. Low-stock / expiring alerts, scoped to selected location(s) */}
        <Card title="Stock bajo y por vencer">
          {lowStock.length === 0 ? (
            <EmptyLocationNote text="Sin alertas de stock en esta sucursal." />
          ) : (
            <table className="w-full font-body text-sm text-ciruela">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-ciruela/40">
                  <th className="pb-2">Producto</th>
                  <th className="pb-2">Inventario</th>
                  <th className="pb-2">Ubicación</th>
                  <th className="pb-2 text-right">Cant. / Par</th>
                </tr>
              </thead>
              <tbody>
                {lowStock.map((item) => (
                  <tr key={item.product} className="border-t border-ciruela/8">
                    <td className="py-2">{item.product}</td>
                    <td className="py-2 text-ciruela/60">{item.ledger}</td>
                    <td className="py-2 text-ciruela/60">{item.location}</td>
                    <td className="py-2 text-right text-crepe">
                      {item.qty} / {item.par}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        {/* 6. Protocol → retail cross-metric — belongs on the first screen, per spec */}
        <Card title="Protocolo → retail (qué productos se venden después de cada tratamiento)">
          {hasRomaNorte ? (
            <table className="w-full font-body text-sm text-ciruela">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-ciruela/40">
                  <th className="pb-2">Protocolo</th>
                  <th className="pb-2">Producto retail principal</th>
                  <th className="pb-2 text-right">Tasa de conversión</th>
                </tr>
              </thead>
              <tbody>
                {PROTOCOL_RETAIL_LINK.map((row) => (
                  <tr key={row.protocol} className="border-t border-ciruela/8">
                    <td className="py-2">{row.protocol}</td>
                    <td className="py-2 text-ciruela/60">{row.topProduct}</td>
                    <td className="py-2 text-right">{Math.round(row.attachRate * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyLocationNote />
          )}
        </Card>
      </div>
    </>
  );
}

function EmptyLocationNote({ text }: { text?: string }) {
  return (
    <p className="py-6 text-center font-body text-sm text-ciruela/50">
      {text ?? "Sin datos todavía para esta sucursal."}
    </p>
  );
}
