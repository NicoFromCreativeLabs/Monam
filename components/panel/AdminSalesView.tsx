"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/panel/TopBar";
import { Card, StatTile } from "@/components/panel/Card";
import { Badge } from "@/components/panel/Badge";
import { useLocations } from "@/components/panel/LocationsContext";
import {
  openCashRegisterSessionAction,
  closeCashRegisterSessionAction,
  requestRefundAction,
  openSaleClaimAction,
} from "@/lib/actions/commerce";

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

export interface SaleRow {
  id: string;
  date: string; // YYYY-MM-DD, for date-range filtering
  dateLabel: string;
  locationName: string;
  clientName: string;
  clientEmail: string | null;
  clientPhone: string | null;
  closedByName: string;
  items: { label: string; priceMxn: number }[];
  paymentMethod: string;
  subtotalMxn: number;
  discountMxn: number;
  tipMxn: number;
  totalMxn: number;
  refundedMxn: number;
  pendingRefundMxn: number;
}

export function AdminSalesView({
  locationName,
  session,
  paymentMethodBreakdown,
  sales,
}: {
  locationName: string;
  session: CashSessionInfo | null;
  paymentMethodBreakdown: PaymentMethodRow[];
  sales: SaleRow[];
}) {
  const router = useRouter();
  const { selectedNames } = useLocations();
  const [isPending, startTransition] = useTransition();
  const [confirmClose, setConfirmClose] = useState(false);
  const [openingFloat, setOpeningFloat] = useState("2000");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedSale, setSelectedSale] = useState<SaleRow | null>(null);

  const filteredSales = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sales.filter((s) => {
      if (!selectedNames.includes(s.locationName)) return false;
      if (dateFrom && s.date < dateFrom) return false;
      if (dateTo && s.date > dateTo) return false;
      if (q && !`${s.clientName} ${s.items.map((i) => i.label).join(" ")}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [sales, selectedNames, dateFrom, dateTo, search]);

  const hasFilters = search || dateFrom || dateTo;

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

        <Card title={`Transacciones (últimos 90 días) · ${filteredSales.length}`}>
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="mb-1 block font-body text-xs text-ciruela/50">Buscar clienta o producto/servicio</label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nombre de clienta, producto o servicio…"
                className="w-full rounded-lg border border-ciruela/20 px-3 py-2 font-body text-sm text-ciruela"
              />
            </div>
            <div>
              <label className="mb-1 block font-body text-xs text-ciruela/50">Desde</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="rounded-lg border border-ciruela/20 px-3 py-2 font-body text-sm text-ciruela"
              />
            </div>
            <div>
              <label className="mb-1 block font-body text-xs text-ciruela/50">Hasta</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="rounded-lg border border-ciruela/20 px-3 py-2 font-body text-sm text-ciruela"
              />
            </div>
            {hasFilters && (
              <button
                onClick={() => {
                  setSearch("");
                  setDateFrom("");
                  setDateTo("");
                }}
                className="rounded-full border border-ciruela/20 px-4 py-2 font-body text-xs text-ciruela/70 hover:bg-ciruela/5"
              >
                Limpiar filtros
              </button>
            )}
          </div>

          {filteredSales.length === 0 ? (
            <p className="py-6 text-center font-body text-sm text-ciruela/50">No hay transacciones con estos filtros.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] font-body text-sm">
                <thead>
                  <tr className="border-b border-ciruela/10 text-left text-xs uppercase tracking-[0.1em] text-ciruela/50">
                    <th className="py-2 pr-3">Fecha</th>
                    <th className="py-2 pr-3">Clienta</th>
                    <th className="py-2 pr-3">Producto / servicio</th>
                    <th className="py-2 pr-3">Sucursal</th>
                    <th className="py-2 pr-3">Método</th>
                    <th className="py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSales.map((s) => (
                    <tr
                      key={s.id}
                      onClick={() => setSelectedSale(s)}
                      className="cursor-pointer border-b border-ciruela/5 text-ciruela hover:bg-ciruela/5"
                    >
                      <td className="py-2 pr-3 whitespace-nowrap text-ciruela/70">{s.dateLabel}</td>
                      <td className="py-2 pr-3">{s.clientName}</td>
                      <td className="py-2 pr-3 text-ciruela/80">{s.items.map((i) => i.label).join(", ") || "—"}</td>
                      <td className="py-2 pr-3 text-ciruela/70">{s.locationName}</td>
                      <td className="py-2 pr-3 text-ciruela/70">{s.paymentMethod}</td>
                      <td className="py-2 text-right">${s.totalMxn.toLocaleString()} MXN</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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

      {selectedSale && <SaleDetailModal sale={selectedSale} onClose={() => setSelectedSale(null)} />}
    </>
  );
}

function SaleDetailModal({ sale, onClose }: { sale: SaleRow; onClose: () => void }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<"view" | "claim" | "refund">("view");
  const [claimReason, setClaimReason] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [refundAmount, setRefundAmount] = useState(String(sale.totalMxn - sale.refundedMxn - sale.pendingRefundMxn));
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const refundableMxn = sale.totalMxn - sale.refundedMxn - sale.pendingRefundMxn;

  function submitClaim() {
    setFormError(null);
    startTransition(async () => {
      const result = await openSaleClaimAction(sale.id, claimReason);
      if (result.error) {
        setFormError(result.error);
        return;
      }
      setFormSuccess("Reclamo registrado en Control → Anomalías.");
      router.refresh();
    });
  }

  function submitRefund() {
    setFormError(null);
    startTransition(async () => {
      const amountMxn = Number(refundAmount);
      const result = await requestRefundAction({ saleId: sale.id, amountMxn, reason: refundReason });
      if ("error" in result) {
        setFormError(result.error);
        return;
      }
      setFormSuccess(
        result.status === "PENDING" ? "Reembolso enviado a aprobación." : `Reembolso de $${result.amountMxn.toLocaleString()} MXN procesado.`,
      );
      router.refresh();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ciruela/40 px-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl bg-hueso p-5 shadow-xl"
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="font-display text-base text-ciruela">{sale.clientName}</p>
            <p className="font-body text-xs text-ciruela/50">
              {sale.dateLabel} · {sale.locationName} · cobró {sale.closedByName}
            </p>
          </div>
          <button onClick={onClose} className="font-body text-xs text-ciruela/50 hover:text-ciruela">
            Cerrar
          </button>
        </div>

        {(sale.clientEmail || sale.clientPhone) && (
          <p className="mb-3 font-body text-xs text-ciruela/60">
            {[sale.clientEmail, sale.clientPhone].filter(Boolean).join(" · ")}
          </p>
        )}

        <ul className="mb-3 space-y-1.5 border-t border-ciruela/10 pt-3 font-body text-sm text-ciruela">
          {sale.items.map((it, i) => (
            <li key={i} className="flex justify-between">
              <span>{it.label}</span>
              <span className="text-ciruela/70">${it.priceMxn.toLocaleString()} MXN</span>
            </li>
          ))}
        </ul>

        <div className="space-y-1 border-t border-ciruela/10 pt-3 font-body text-xs text-ciruela/70">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>${sale.subtotalMxn.toLocaleString()} MXN</span>
          </div>
          {sale.discountMxn > 0 && (
            <div className="flex justify-between">
              <span>Descuento</span>
              <span>-${sale.discountMxn.toLocaleString()} MXN</span>
            </div>
          )}
          {sale.tipMxn > 0 && (
            <div className="flex justify-between">
              <span>Propina</span>
              <span>${sale.tipMxn.toLocaleString()} MXN</span>
            </div>
          )}
          <div className="flex justify-between font-medium text-ciruela">
            <span>Total ({sale.paymentMethod})</span>
            <span>${sale.totalMxn.toLocaleString()} MXN</span>
          </div>
          {sale.refundedMxn > 0 && (
            <div className="flex justify-between text-oliva">
              <span>Reembolsado</span>
              <span>-${sale.refundedMxn.toLocaleString()} MXN</span>
            </div>
          )}
          {sale.pendingRefundMxn > 0 && (
            <div className="flex justify-between">
              <span>Reembolso pendiente de aprobación</span>
              <span>${sale.pendingRefundMxn.toLocaleString()} MXN</span>
            </div>
          )}
        </div>

        {mode === "view" && (
          <div className="mt-5 flex gap-2">
            <button
              onClick={() => {
                setMode("claim");
                setFormError(null);
                setFormSuccess(null);
              }}
              className="flex-1 rounded-full border border-ciruela px-4 py-2 font-body text-xs text-ciruela hover:bg-ciruela hover:text-hueso"
            >
              Abrir reclamo
            </button>
            <button
              onClick={() => {
                setMode("refund");
                setFormError(null);
                setFormSuccess(null);
              }}
              disabled={refundableMxn <= 0}
              className="flex-1 rounded-full bg-ciruela px-4 py-2 font-body text-xs text-hueso disabled:opacity-40"
            >
              Procesar reembolso
            </button>
          </div>
        )}

        {mode === "claim" && !formSuccess && (
          <div className="mt-5 space-y-2">
            <label className="block font-body text-xs text-ciruela/50">Motivo del reclamo</label>
            <textarea
              value={claimReason}
              onChange={(e) => setClaimReason(e.target.value)}
              rows={3}
              placeholder="Qué reportó la clienta…"
              className="w-full rounded-lg border border-ciruela/20 px-3 py-2 font-body text-sm text-ciruela"
            />
            {formError && <p className="font-body text-xs text-red-600">{formError}</p>}
            <div className="flex justify-end gap-2">
              <button onClick={() => setMode("view")} className="rounded-full border border-ciruela/20 px-4 py-1.5 font-body text-xs text-ciruela/70">
                Cancelar
              </button>
              <button
                onClick={submitClaim}
                disabled={isPending}
                className="rounded-full bg-ciruela px-4 py-1.5 font-body text-xs text-hueso disabled:opacity-50"
              >
                {isPending ? "Guardando…" : "Registrar reclamo"}
              </button>
            </div>
          </div>
        )}

        {mode === "refund" && !formSuccess && (
          <div className="mt-5 space-y-2">
            <label className="block font-body text-xs text-ciruela/50">Monto a reembolsar (máx. ${refundableMxn.toLocaleString()} MXN)</label>
            <input
              type="number"
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              className="w-full rounded-lg border border-ciruela/20 px-3 py-2 font-body text-sm text-ciruela"
            />
            <label className="block font-body text-xs text-ciruela/50">Motivo</label>
            <textarea
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              rows={2}
              placeholder="Por qué se reembolsa…"
              className="w-full rounded-lg border border-ciruela/20 px-3 py-2 font-body text-sm text-ciruela"
            />
            {formError && <p className="font-body text-xs text-red-600">{formError}</p>}
            <div className="flex justify-end gap-2">
              <button onClick={() => setMode("view")} className="rounded-full border border-ciruela/20 px-4 py-1.5 font-body text-xs text-ciruela/70">
                Cancelar
              </button>
              <button
                onClick={submitRefund}
                disabled={isPending}
                className="rounded-full bg-ciruela px-4 py-1.5 font-body text-xs text-hueso disabled:opacity-50"
              >
                {isPending ? "Procesando…" : "Confirmar reembolso"}
              </button>
            </div>
          </div>
        )}

        {formSuccess && <p className="mt-5 rounded-lg bg-oliva/10 px-3 py-2 font-body text-sm text-oliva">{formSuccess}</p>}
      </div>
    </div>
  );
}
