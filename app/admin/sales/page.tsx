"use client";

import { TopBar } from "@/components/panel/TopBar";
import { Card, StatTile } from "@/components/panel/Card";
import { Badge } from "@/components/panel/Badge";
import { OWNER, CASH_CUT_SUMMARY, PAYMENT_METHOD_BREAKDOWN, CFDI_QUEUE } from "@/lib/mock-data";

const CFDI_TONE: Record<string, "warning" | "positive"> = {
  "Pendiente de timbrado": "warning",
  Timbrado: "positive",
};

// Caja y cobros — new page under Ventas (client spec: admin-side view of the
// day's cash cut, payment-method mix, and CFDI queue). No dedicated
// admin-side "Cobro/POS" screen existed before this — checkout itself lives
// on the Staff side (/staff/checkout); this is the owner-facing summary of
// what that checkout activity produced today. UI-only mock data, same
// fidelity as the rest of the admin build.
export default function AdminSales() {
  const c = CASH_CUT_SUMMARY;
  const total = PAYMENT_METHOD_BREAKDOWN.reduce((sum, p) => sum + p.amount, 0);
  const maxAmount = Math.max(...PAYMENT_METHOD_BREAKDOWN.map((p) => p.amount));

  return (
    <>
      <TopBar title="Caja y cobros" userName={OWNER.name} userRole={OWNER.role} allowBothLocations />
      <div className="flex-1 space-y-6 px-4 py-6 min-[860px]:px-8">
        <Card
          title={`Corte de caja — ${c.location}`}
          action={<Badge tone={c.status === "Abierto" ? "positive" : "neutral"}>{c.status}</Badge>}
        >
          <div className="grid grid-cols-2 gap-4 min-[700px]:grid-cols-4">
            <StatTile label="Abierta desde" value={c.openedAt} sub={c.openedBy} />
            <StatTile label="Fondo de apertura" value={`$${c.openingFloat.toLocaleString()} MXN`} />
            <StatTile label="Cobrado hoy" value={`$${total.toLocaleString()} MXN`} />
            <StatTile
              label="Transacciones"
              value={`${PAYMENT_METHOD_BREAKDOWN.reduce((s, p) => s + p.count, 0)}`}
            />
          </div>
          <button className="mt-5 rounded-full bg-ciruela px-5 py-2.5 font-body text-sm text-hueso">
            Cerrar caja
          </button>
        </Card>

        <Card title="Cobros por método de pago — hoy">
          <ul className="space-y-3">
            {PAYMENT_METHOD_BREAKDOWN.map((p) => (
              <li key={p.method}>
                <div className="mb-1 flex justify-between font-body text-xs text-ciruela/60">
                  <span>
                    {p.method}{" "}
                    <span className="text-ciruela/40">
                      · {p.count} {p.count === 1 ? "cobro" : "cobros"}
                    </span>
                  </span>
                  <span>${p.amount.toLocaleString()} MXN</span>
                </div>
                <div className="h-2 rounded-full bg-ciruela/8">
                  <div
                    className="h-2 rounded-full bg-ciruela"
                    style={{ width: `${(p.amount / maxAmount) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="CFDI — cola de timbrado">
          <table className="w-full font-body text-sm text-ciruela">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-ciruela/40">
                <th className="pb-2">Clienta</th>
                <th className="pb-2 text-right">Monto</th>
                <th className="pb-2 text-right">Estado</th>
              </tr>
            </thead>
            <tbody>
              {CFDI_QUEUE.map((c) => (
                <tr key={c.id} className="border-t border-ciruela/8">
                  <td className="py-2.5">{c.client}</td>
                  <td className="py-2.5 text-right">${c.amount.toLocaleString()} MXN</td>
                  <td className="py-2.5 text-right">
                    <Badge tone={CFDI_TONE[c.status]}>{c.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 font-body text-xs text-ciruela/40">
            Facturación (CFDI 4.0) — placeholder de integración con PAC. No timbra facturas reales.
          </p>
        </Card>
      </div>
    </>
  );
}
