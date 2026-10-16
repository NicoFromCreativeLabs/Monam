"use client";

import { useEffect, useState } from "react";
import { getApprovalStatusAction, requestApprovalAction, type DiscountInput } from "@/lib/actions/commerce";

const inputClass =
  "w-full rounded-lg border border-ciruela/20 bg-hueso px-3 py-2 font-body text-sm text-ciruela placeholder:text-ciruela/40 focus:outline-none focus:ring-1 focus:ring-ciruela/40";

function discountAmount(kind: DiscountInput["kind"], value: number, subtotal: number) {
  const raw = kind === "PERCENT" ? Math.round((subtotal * value) / 100) : Math.round(value);
  return Math.min(Math.max(raw, 0), subtotal);
}

// "Aplicar descuento" at checkout. Front Desk can apply a discount up to the
// approval threshold straight away; anything above asks a manager (it appears
// in Aprobaciones) and applies by itself once approved. Owner / Clinic Manager
// apply any discount directly. A reason is always required.
export function CheckoutDiscount({
  subtotal,
  thresholdPct,
  canApprove,
  clientId,
  value,
  onChange,
}: {
  subtotal: number;
  thresholdPct: number;
  canApprove: boolean;
  clientId: string | null;
  value: DiscountInput | null;
  onChange: (discount: DiscountInput | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<DiscountInput["kind"]>("PERCENT");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // A request waiting for a manager's decision.
  const [waiting, setWaiting] = useState<{ requestId: string; draft: Omit<DiscountInput, "approvalRequestId"> } | null>(
    null,
  );

  useEffect(() => {
    if (!waiting) return;
    let stopped = false;
    const id = setInterval(async () => {
      const status = await getApprovalStatusAction(waiting.requestId).catch(() => null);
      if (stopped || !status || status === "PENDING") return;
      stopped = true;
      clearInterval(id);
      if (status === "APPROVED") {
        onChange({ ...waiting.draft, approvalRequestId: waiting.requestId });
        setOpen(false);
      } else {
        setError("Un gerente rechazó el descuento.");
      }
      setWaiting(null);
    }, 4000);
    return () => {
      stopped = true;
      clearInterval(id);
    };
    // onChange is stable enough (a state setter from the parent).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waiting]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const numeric = Number(amount);
    if (!Number.isFinite(numeric) || numeric <= 0) return setError("Escribe un descuento mayor a 0.");
    if (kind === "PERCENT" && numeric > 100) return setError("El descuento no puede pasar de 100%.");
    if (reason.trim().length < 3) return setError("Escribe el motivo del descuento.");
    const mxn = discountAmount(kind, numeric, subtotal);
    if (mxn <= 0) return setError("El descuento no puede ser mayor al total.");
    if (kind === "AMOUNT" && numeric > subtotal) return setError("El descuento no puede ser mayor al total.");

    const pct = (mxn / subtotal) * 100;
    const draft = { kind, value: numeric, reason: reason.trim() };
    if (canApprove || pct <= thresholdPct) {
      onChange(draft);
      setOpen(false);
      return;
    }
    setBusy(true);
    try {
      const { requestId } = await requestApprovalAction({
        type: "DISCOUNT",
        clientId,
        saleId: null,
        amountMxn: Math.ceil(pct),
        reason: draft.reason,
      });
      setWaiting({ requestId, draft });
    } catch {
      setError("No se pudo enviar la solicitud. Intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  if (value) {
    const mxn = discountAmount(value.kind, value.value, subtotal);
    return (
      <div className="mt-3 flex items-center justify-between rounded-lg bg-oliva/10 px-3 py-2 font-body text-xs text-oliva">
        <span>
          Descuento {value.kind === "PERCENT" ? `${value.value}%` : `$${value.value}`} (−${mxn} MXN) · {value.reason}
        </span>
        <button onClick={() => onChange(null)} className="underline">
          Quitar
        </button>
      </div>
    );
  }

  if (waiting) {
    return (
      <div className="mt-3 rounded-lg border border-ciruela/15 px-3 py-2 font-body text-xs text-ciruela/70">
        Descuento pendiente de aprobación. Un gerente o el Admin debe aprobarlo en Aprobaciones; se aplica solo al
        aprobarse.
        <button
          onClick={() => {
            setWaiting(null);
            setError(null);
          }}
          className="ml-2 underline"
        >
          Cancelar solicitud
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-3 font-body text-xs text-ciruela/70 underline hover:text-ciruela"
      >
        Aplicar descuento
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="mt-3 space-y-2 rounded-lg border border-ciruela/15 p-3">
      <div className="flex gap-2">
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as DiscountInput["kind"])}
          className={`${inputClass} w-24`}
        >
          <option value="PERCENT">%</option>
          <option value="AMOUNT">$ MXN</option>
        </select>
        <input
          type="number"
          min={0}
          step="any"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={kind === "PERCENT" ? "p. ej. 10" : "p. ej. 200"}
          className={inputClass}
        />
      </div>
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Motivo (obligatorio)"
        className={inputClass}
      />
      {!canApprove && (
        <p className="font-body text-[11px] text-ciruela/50">
          Hasta {thresholdPct}% se aplica al momento; más requiere aprobación de un gerente.
        </p>
      )}
      {error && <p className="font-body text-xs text-[#b3392f]">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-ciruela px-4 py-1.5 font-body text-xs text-hueso disabled:opacity-50"
        >
          {busy ? "Enviando…" : "Aplicar"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          className="rounded-full border border-ciruela px-4 py-1.5 font-body text-xs text-ciruela"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
