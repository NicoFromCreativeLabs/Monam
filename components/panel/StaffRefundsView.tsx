"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/panel/TopBar";
import { Card } from "@/components/panel/Card";
import { Badge } from "@/components/panel/Badge";
import { requestRefundAction } from "@/lib/actions/commerce";
import type { RefundableSale } from "@/lib/refunds";

const METHOD_LABEL = { CASH: "Efectivo", CARD: "Tarjeta", ONLINE: "En línea" } as const;

const inputClass =
  "w-full rounded-lg border border-ciruela/20 bg-hueso px-3 py-2 font-body text-sm text-ciruela placeholder:text-ciruela/40 focus:outline-none focus:ring-1 focus:ring-ciruela/40";

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

// Reembolsos: recent sales with a "Reembolsar" action. Front Desk asks (a
// manager approves in Aprobaciones); Owner / Clinic Manager refund directly.
// Online payments go back through Stripe; cash and card-terminal refunds are
// only recorded here — the money is handed back by the staff.
export function StaffRefundsView({
  sales,
  refundsDirectly,
}: {
  sales: RefundableSale[];
  refundsDirectly: boolean;
}) {
  const router = useRouter();
  const [target, setTarget] = useState<RefundableSale | null>(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  function open(sale: RefundableSale) {
    setTarget(sale);
    setAmount(String(sale.totalMxn - sale.refundedMxn - sale.pendingMxn));
    setReason("");
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!target) return;
    setBusy(true);
    setError(null);
    try {
      const result = await requestRefundAction({ saleId: target.id, amountMxn: Number(amount), reason });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      if (result.status === "PENDING") {
        setNotice("Solicitud enviada. Un gerente o el Admin debe aprobarla en Aprobaciones.");
      } else if (result.viaStripe) {
        setNotice(`Reembolso de $${result.amountMxn} MXN enviado a Stripe.`);
      } else {
        setNotice(
          `Reembolso de $${result.amountMxn} MXN registrado. Devuélvelo a la clienta ${
            target.paymentMethod === "CASH" ? "en efectivo" : "por la terminal o transferencia"
          }.`,
        );
      }
      setTarget(null);
      router.refresh();
    } catch {
      setError("No se pudo procesar. Intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <TopBar title="Reembolsos" />
      <div className="flex-1 px-4 py-6 min-[860px]:px-8">
        <div className="mx-auto max-w-3xl space-y-4">
          {notice && <p className="rounded-lg bg-oliva/10 px-3 py-2 font-body text-xs text-oliva">{notice}</p>}
          <Card title="Ventas recientes (14 días)">
            {sales.length === 0 ? (
              <p className="py-4 text-center font-body text-sm text-ciruela/50">Sin ventas recientes en esta sucursal.</p>
            ) : (
              <ul className="divide-y divide-ciruela/8">
                {sales.map((s) => {
                  const remaining = s.totalMxn - s.refundedMxn - s.pendingMxn;
                  return (
                    <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                      <div>
                        <p className="font-body text-sm text-ciruela">
                          {s.clientName ?? "Venta de mostrador"}{" "}
                          <span className="text-ciruela/50">· {METHOD_LABEL[s.paymentMethod]}</span>
                        </p>
                        <p className="font-body text-xs text-ciruela/50">{formatWhen(s.createdAt)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-body text-sm text-ciruela">${s.totalMxn} MXN</span>
                        {s.refundedMxn > 0 && <Badge tone="neutral">Reembolsado ${s.refundedMxn}</Badge>}
                        {s.pendingMxn > 0 && <Badge tone="warning">Pendiente ${s.pendingMxn}</Badge>}
                        {remaining > 0 && (
                          <button
                            onClick={() => open(s)}
                            className="rounded-full border border-ciruela px-3 py-1.5 font-body text-xs text-ciruela hover:bg-ciruela hover:text-hueso"
                          >
                            Reembolsar
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      </div>

      {target && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ciruela/40 px-4"
          onClick={() => !busy && setTarget(null)}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={submit}
            className="w-full max-w-sm space-y-3 rounded-2xl bg-hueso p-5 shadow-xl"
          >
            <p className="font-display text-sm text-ciruela">
              Reembolsar a {target.clientName ?? "venta de mostrador"}
            </p>
            <div>
              <label className="mb-1 block font-body text-xs uppercase tracking-[0.14em] text-ciruela/50">
                Monto (MXN)
              </label>
              <input
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={inputClass}
              />
              <p className="mt-1 font-body text-[11px] text-ciruela/50">
                Máximo ${target.totalMxn - target.refundedMxn - target.pendingMxn} MXN · {METHOD_LABEL[target.paymentMethod]}
              </p>
            </div>
            <div>
              <label className="mb-1 block font-body text-xs uppercase tracking-[0.14em] text-ciruela/50">Motivo</label>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Obligatorio"
                className={inputClass}
              />
            </div>
            <p className="font-body text-[11px] text-ciruela/50">
              {refundsDirectly
                ? target.paymentMethod === "ONLINE"
                  ? "Se reembolsa de inmediato por Stripe."
                  : "Se registra de inmediato; devuelve el dinero a mano."
                : "Se enviará a aprobación de un gerente o el Admin."}
            </p>
            {error && <p className="font-body text-xs text-[#b3392f]">{error}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setTarget(null)}
                disabled={busy}
                className="rounded-full border border-ciruela px-4 py-1.5 font-body text-xs text-ciruela hover:bg-ciruela hover:text-hueso"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={busy}
                className="rounded-full bg-ciruela px-4 py-1.5 font-body text-xs text-hueso disabled:opacity-50"
              >
                {busy ? "Procesando…" : refundsDirectly ? "Reembolsar" : "Solicitar"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
