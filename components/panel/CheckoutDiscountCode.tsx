"use client";

import { useEffect, useRef, useState } from "react";
import { previewDiscountCodeAction, type RetailLineInput } from "@/lib/actions/commerce";
import { normalizeCode } from "@/lib/discount-codes";
import { QrScanner } from "@/components/panel/QrScanner";

export interface AppliedDiscountCode {
  code: string;
  name: string;
  summary: string;
  discountMxn: number;
}

const inputClass =
  "w-full rounded-lg border border-ciruela/20 bg-hueso px-3 py-2 font-body text-sm text-ciruela placeholder:text-ciruela/40 focus:outline-none focus:ring-1 focus:ring-ciruela/40";

// "Tengo un código": the vendedor scans the QR the client shows (or types the
// code). What it takes off is worked out on the server for this exact ticket and
// is refreshed whenever the ticket changes; the sale is checked again when charged.
export function CheckoutDiscountCode({
  applied,
  onChange,
  appointmentId,
  locationName,
  retailItems,
}: {
  applied: AppliedDiscountCode | null;
  onChange: (code: AppliedDiscountCode | null) => void;
  appointmentId: string | null;
  locationName: string;
  retailItems: RetailLineInput[];
}) {
  const [open, setOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function apply(raw: string) {
    const code = normalizeCode(raw);
    if (!code) {
      setError("Escribe o escanea el código.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await previewDiscountCodeAction({ code, appointmentId, locationName, retailItems });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onChange({ code: result.code, name: result.name, summary: result.summary, discountMxn: result.discountMxn });
      setText("");
      setOpen(false);
    } catch {
      setError("No se pudo validar el código. Intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  // The ticket changed (a product added or removed): work the discount out again.
  const ticketKey = JSON.stringify([appointmentId, retailItems]);
  const lastKey = useRef(ticketKey);
  useEffect(() => {
    if (!applied || lastKey.current === ticketKey) {
      lastKey.current = ticketKey;
      return;
    }
    lastKey.current = ticketKey;
    let cancelled = false;
    previewDiscountCodeAction({ code: applied.code, appointmentId, locationName, retailItems })
      .then((result) => {
        if (cancelled) return;
        if (result.ok) {
          onChange({ code: result.code, name: result.name, summary: result.summary, discountMxn: result.discountMxn });
        } else {
          onChange(null);
          setError(`El código ya no aplica: ${result.error}`);
          setOpen(true);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // The ticket (not the callbacks) decides when to re-check.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketKey]);

  if (applied) {
    return (
      <div className="mt-3 flex items-center justify-between rounded-lg bg-oliva/10 px-3 py-2 font-body text-xs text-oliva">
        <span>
          Código {applied.code} · {applied.summary} (−${applied.discountMxn} MXN)
        </span>
        <button onClick={() => onChange(null)} className="underline">
          Quitar
        </button>
      </div>
    );
  }

  return (
    <>
      {!open ? (
        <button onClick={() => setOpen(true)} className="mt-3 block font-body text-xs text-ciruela/70 underline hover:text-ciruela">
          Tengo un código de descuento / QR
        </button>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            apply(text);
          }}
          className="mt-3 space-y-2 rounded-lg border border-ciruela/15 p-3"
        >
          <div className="flex gap-2">
            <input
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value.toUpperCase())}
              placeholder="Código o escanea el QR"
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => setScanning(true)}
              className="shrink-0 rounded-full border border-ciruela px-3 py-1.5 font-body text-xs text-ciruela hover:bg-ciruela hover:text-hueso"
            >
              Escanear
            </button>
          </div>
          {error && <p className="font-body text-xs text-[#b3392f]">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="rounded-full bg-ciruela px-4 py-1.5 font-body text-xs text-hueso disabled:opacity-50"
            >
              {busy ? "Validando…" : "Aplicar código"}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setError(null);
              }}
              className="font-body text-xs text-ciruela/70 underline"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
      {scanning && (
        <QrScanner
          onClose={() => setScanning(false)}
          onDetect={(scanned) => {
            setScanning(false);
            setOpen(true);
            apply(scanned);
          }}
        />
      )}
    </>
  );
}
