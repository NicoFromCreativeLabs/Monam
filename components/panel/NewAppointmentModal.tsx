"use client";

import { useState, useTransition } from "react";
import { useProtocols } from "@/components/panel/ProtocolsContext";
import { createManualAppointmentAction } from "@/lib/actions/booking";

export interface BookableClient {
  id: string;
  name: string;
  phone: string;
}

// Front Desk / Owner / Clinic Manager entering a booking taken by phone,
// WhatsApp, Instagram DM, or a walk-in — must land in the same calendar as
// a client's own /my/book flow, not a side spreadsheet (spec, non-negotiable
// "one source of truth, zero double entry"). Reuses createManualAppointmentAction,
// which reuses the same room/esthetician auto-assignment and EXCLUDE-constraint
// safety net as client self-booking.
export function NewAppointmentModal({
  locationName,
  clients,
  triggerClassName,
}: {
  locationName: string;
  clients: BookableClient[];
  triggerClassName?: string;
}) {
  const { protocols } = useProtocols();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [clientId, setClientId] = useState<string | null>(null);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState("10:00");
  const [duration, setDuration] = useState<"Targeted" | "Signature">("Targeted");
  const [protocolName, setProtocolName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const signatureProtocols = protocols.filter((p) => p.tier === "Signature");
  const selectedClient = clients.find((c) => c.id === clientId) ?? null;
  const filtered = query.trim()
    ? clients.filter(
        (c) => c.name.toLowerCase().includes(query.toLowerCase()) || c.phone.includes(query),
      )
    : clients;

  function reset() {
    setQuery("");
    setClientId(null);
    setDate(new Date().toISOString().slice(0, 10));
    setTime("10:00");
    setDuration("Targeted");
    setProtocolName(null);
    setError(null);
  }

  function close() {
    setOpen(false);
    reset();
  }

  function submit() {
    if (!clientId) {
      setError("Elige una clienta.");
      return;
    }
    if (duration === "Signature" && !protocolName) {
      setError("Elige un protocolo Signature.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await createManualAppointmentAction({
        clientId,
        locationName,
        date,
        time,
        durationTier: duration,
        protocolName: duration === "Signature" ? protocolName : null,
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      close();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={triggerClassName ?? "rounded-full bg-ciruela px-4 py-2 font-body text-xs text-hueso"}
      >
        + Nueva cita
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ciruela/40 px-4"
          onClick={close}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-hueso p-5 shadow-xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <p className="font-display text-sm text-ciruela">Nueva cita — {locationName}</p>
              <button onClick={close} aria-label="Cerrar" className="text-ciruela/50 hover:text-ciruela">
                ×
              </button>
            </div>

            <div className="mb-3">
              <label className="mb-1 block font-body text-xs uppercase tracking-[0.14em] text-ciruela/50">
                Clienta
              </label>
              <input
                type="text"
                value={selectedClient ? selectedClient.name : query}
                onChange={(e) => {
                  setClientId(null);
                  setQuery(e.target.value);
                }}
                placeholder="Buscar por nombre o teléfono"
                className="w-full rounded-lg border border-ciruela/20 px-3 py-2 font-body text-sm text-ciruela"
              />
              {!selectedClient && query.trim() && (
                <div className="mt-1 max-h-36 overflow-y-auto rounded-lg border border-ciruela/10">
                  {filtered.length === 0 ? (
                    <p className="px-3 py-2 font-body text-xs text-ciruela/40">Sin resultados.</p>
                  ) : (
                    filtered.slice(0, 8).map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setClientId(c.id);
                          setQuery("");
                        }}
                        className="block w-full px-3 py-2 text-left font-body text-xs text-ciruela hover:bg-ciruela/5"
                      >
                        {c.name} <span className="text-ciruela/40">· {c.phone}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="mb-3 grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block font-body text-xs uppercase tracking-[0.14em] text-ciruela/50">
                  Fecha
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-lg border border-ciruela/20 px-3 py-2 font-body text-sm text-ciruela"
                />
              </div>
              <div>
                <label className="mb-1 block font-body text-xs uppercase tracking-[0.14em] text-ciruela/50">
                  Hora
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full rounded-lg border border-ciruela/20 px-3 py-2 font-body text-sm text-ciruela"
                />
              </div>
            </div>

            <div className="mb-3">
              <label className="mb-1 block font-body text-xs uppercase tracking-[0.14em] text-ciruela/50">
                Duración
              </label>
              <div className="flex w-fit gap-1 rounded-full border border-ciruela/20 p-1 font-body text-xs">
                {(["Targeted", "Signature"] as const).map((tier) => (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => {
                      setDuration(tier);
                      if (tier === "Targeted") setProtocolName(null);
                    }}
                    aria-pressed={duration === tier}
                    className={`rounded-full px-4 py-1.5 ${
                      duration === tier ? "bg-ciruela text-hueso" : "text-ciruela/60"
                    }`}
                  >
                    {tier}
                  </button>
                ))}
              </div>
            </div>

            {duration === "Signature" && (
              <div className="mb-3">
                <label className="mb-1 block font-body text-xs uppercase tracking-[0.14em] text-ciruela/50">
                  Protocolo
                </label>
                <select
                  value={protocolName ?? ""}
                  onChange={(e) => setProtocolName(e.target.value || null)}
                  className="w-full rounded-lg border border-ciruela/20 px-3 py-2 font-body text-sm text-ciruela"
                >
                  <option value="">Elige un protocolo</option>
                  {signatureProtocols.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name} · ${p.price.toLocaleString()} MXN
                    </option>
                  ))}
                </select>
              </div>
            )}

            {error && (
              <p className="mb-3 rounded-lg bg-[#b3392f]/10 px-3 py-2 font-body text-xs text-[#b3392f]">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={submit}
              disabled={isPending}
              className="w-full rounded-full bg-ciruela px-4 py-2 font-body text-xs text-hueso disabled:opacity-50"
            >
              {isPending ? "Agendando…" : "Agendar cita"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
