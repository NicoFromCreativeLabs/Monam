"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/panel/TopBar";
import { Card, StatTile } from "@/components/panel/Card";
import { Badge } from "@/components/panel/Badge";
import { openCashRegisterSessionAction, closeCashRegisterSessionAction } from "@/lib/actions/commerce";

export interface PaymentMethodRow {
  method: string;
  count: number;
  amount: number;
}

export interface CashSessionInfo {
  id: string;
  openedAt: string;
  openedBy: string;
  openingFloat: number;
}

export function AdminSalesView({
  locationName,
  session,
  paymentMethodBreakdown,
}: {
  locationName: string;
  session: CashSessionInfo | null;
  paymentMethodBreakdown: PaymentMethodRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmClose, setConfirmClose] = useState(false);
  const [openingFloat, setOpeningFloat] = useState("2000");

  const total = paymentMethodBreakdown.reduce((sum, p) => sum + p.amount, 0);
  const maxAmount = Math.max(1, ...paymentMethodBreakdown.map((p) => p.amount));
  const transactions = paymentMethodBreakdown.reduce((s, p) => s + p.count, 0);

  function openSession() {
    startTransition(async () => {
      await openCashRegisterSessionAction(locationName, Number(openingFloat) || 0);
      router.refresh();
    });
  }

  function closeSession() {
    if (!session) return;
    startTransition(async () => {
      await closeCashRegisterSessionAction(session.id, total);
      setConfirmClose(false);
      router.refresh();
    });
  }

  return (
    <>
      <TopBar title="Caja y cobros" allowBothLocations />
      <div className="flex-1 space-y-6 px-4 py-6 min-[860px]:px-8">
        <Card
          title={`Corte de caja — ${locationName}`}
          action={session ? <Badge tone="positive">Abierto</Badge> : <Badge tone="neutral">Cerrado</Badge>}
        >
          {session ? (
            <>
              <div className="grid grid-cols-2 gap-4 min-[700px]:grid-cols-4">
                <StatTile label="Abierta desde" value={session.openedAt} sub={session.openedBy} />
                <StatTile label="Fondo de apertura" value={`$${session.openingFloat.toLocaleString()} MXN`} />
                <StatTile label="Cobrado hoy" value={`$${total.toLocaleString()} MXN`} />
                <StatTile label="Transacciones" value={`${transactions}`} />
              </div>
              <button
                onClick={() => setConfirmClose(true)}
                disabled={isPending}
                className="mt-5 rounded-full bg-ciruela px-5 py-2.5 font-body text-sm text-hueso disabled:opacity-50"
              >
                Cerrar caja
              </button>
            </>
          ) : (
            <div>
              <p className="mb-3 font-body text-sm text-ciruela/60">Sin caja abierta para hoy.</p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={openingFloat}
                  onChange={(e) => setOpeningFloat(e.target.value)}
                  className="w-32 rounded-lg border border-ciruela/20 px-3 py-2 font-body text-sm text-ciruela"
                />
                <button
                  onClick={openSession}
                  disabled={isPending}
                  className="rounded-full bg-ciruela px-5 py-2.5 font-body text-sm text-hueso disabled:opacity-50"
                >
                  {isPending ? "Abriendo…" : "Abrir caja"}
                </button>
              </div>
            </div>
          )}
        </Card>

        <Card title="Cobros por método de pago — hoy">
          <ul className="space-y-3">
            {paymentMethodBreakdown.map((p) => (
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
                  <div className="h-2 rounded-full bg-ciruela" style={{ width: `${(p.amount / maxAmount) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {confirmClose && session && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ciruela/40 px-4"
          onClick={() => setConfirmClose(false)}
        >
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-xs rounded-2xl bg-hueso p-5 shadow-xl">
            <p className="font-display text-sm text-ciruela">¿Cerrar la caja?</p>
            <p className="mt-2 font-body text-sm text-ciruela/70">
              Total cobrado hoy: ${total.toLocaleString()} MXN en {transactions} transacciones. Esto
              registra el corte de caja y no se puede reabrir desde aquí.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setConfirmClose(false)}
                className="rounded-full border border-ciruela px-4 py-1.5 font-body text-xs text-ciruela hover:bg-ciruela hover:text-hueso"
              >
                Cancelar
              </button>
              <button
                onClick={closeSession}
                disabled={isPending}
                className="rounded-full bg-ciruela px-4 py-1.5 font-body text-xs text-hueso disabled:opacity-50"
              >
                {isPending ? "Cerrando…" : "Cerrar caja"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
