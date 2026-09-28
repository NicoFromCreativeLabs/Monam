"use client";

import { useState } from "react";
import { TopBar } from "@/components/panel/TopBar";
import { Card } from "@/components/panel/Card";
import { staffIdentity, useStaffRole } from "@/components/panel/StaffRoleContext";
import { useProtocols } from "@/components/panel/ProtocolsContext";
import { useAddOns } from "@/components/panel/AddOnsContext";
import { usePendingCheckouts } from "@/components/panel/PendingCheckoutsContext";
import {
  TODAY_APPOINTMENTS,
  BACKBAR_INVENTORY,
  CLIENTS_LIST,
  CLIENT_DETAILS_BY_ID,
  CHECKOUT_TICKET,
} from "@/lib/mock-data";

type UsedProduct = { sku: string; amountMl: string };

// Protocol assessed on arrival, not pre-booked (spec §5.2/§7.3). Manual
// dosage adjustment is possible but flagged as an exception in reporting.
// Reads the live protocol menu from ProtocolsContext, so a protocol added
// or removed in Admin Settings shows up here without a reload.
export default function StaffTreatmentRecord() {
  const { role } = useStaffRole();
  const identity = staffIdentity(role);
  const { protocols } = useProtocols();
  const addOns = useAddOns();
  const { addPendingCheckout } = usePendingCheckouts();
  const client = TODAY_APPOINTMENTS[0];
  // Same per-client lookup fix as the Esthetician "Hoy" dashboard — this
  // banner used to read one shared static preview regardless of which
  // client's record was actually open.
  const clientListing = CLIENTS_LIST.find((c) => c.name === client.client);
  const clientDetail = clientListing ? CLIENT_DETAILS_BY_ID[clientListing.id] : undefined;
  const tierProtocols = protocols.filter((p) => p.tier === client.tier);
  const [protocol, setProtocol] = useState(tierProtocols[0]?.name ?? "");
  const backbarAtLocation = BACKBAR_INVENTORY.filter((b) => b.location === identity.location);
  const [usedProducts, setUsedProducts] = useState<UsedProduct[]>([{ sku: "", amountMl: "" }]);
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [completed, setCompleted] = useState(false);
  const availableAddOns = addOns.filter((a) => a.availableOn.includes(protocol));

  function toggleAddOn(id: string) {
    setSelectedAddOns((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));
  }

  function updateUsedProduct(index: number, patch: Partial<UsedProduct>) {
    setUsedProducts((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }

  // Minimum bar for a real clinical/inventory record — found missing
  // entirely in a pentest pass: a treatment could be marked complete fully
  // blank, with no notes and no backbar product logged. Doesn't require
  // every add-on/product slot filled, just that at least one backbar
  // product was actually recorded and notes aren't empty.
  const hasLoggedProduct = usedProducts.some((p) => p.sku && Number(p.amountMl) > 0);
  const hasNotes = clinicalNotes.trim().length > 0;
  const canComplete = hasLoggedProduct && hasNotes;

  // Finishing a treatment here and charging for it at Cobro/POS are two
  // different people, two different moments — this is the hand-off. Front
  // Desk never picks a bill off a static list; they only ever see this
  // specific client appear as "lista para cobro" once the esthetician ends
  // the session, and clicking it is the only way into this exact ticket.
  function finishSession() {
    const selectedProtocol = protocols.find((p) => p.name === protocol);
    const isKnownTicket = client.client === CHECKOUT_TICKET.client;
    addPendingCheckout({
      clientName: client.client,
      service: { name: protocol, price: selectedProtocol?.price ?? 0 },
      retailItems: isKnownTicket ? CHECKOUT_TICKET.retailItems : [],
      wishlist: isKnownTicket ? CHECKOUT_TICKET.wishlist : [],
      depositCredit: isKnownTicket ? CHECKOUT_TICKET.depositCredit : 0,
    });
    setCompleted(true);
  }

  return (
    <>
      <TopBar title="Registro de tratamiento" userName={identity.name} userRole={identity.role} />
      <div className="flex-1 px-8 py-6">
        <div className="mx-auto max-w-xl space-y-4">
          {clientDetail && clientDetail.skinId.allergies.length > 0 && (
            <div className="rounded-[18px] border-2 border-crepe bg-crepe/15 px-6 py-4">
              <p className="font-body text-xs font-semibold uppercase tracking-[0.14em] text-ciruela">
                Alerta de alergia
              </p>
              <p className="mt-1 font-body text-sm text-ciruela">
                {clientDetail.skinId.allergies.join(", ")}
              </p>
            </div>
          )}
          <Card title={client.client}>
            <div>
              <p className="mb-2 font-body text-xs uppercase tracking-[0.14em] text-ciruela/50">
                Protocolo realizado
              </p>
              <div className="grid grid-cols-2 gap-2">
                {tierProtocols.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setProtocol(p.name);
                      setSelectedAddOns([]);
                    }}
                    className={`rounded-lg border px-3 py-2 text-left font-body text-sm ${
                      protocol === p.name
                        ? "border-ciruela bg-ciruela text-hueso"
                        : "border-ciruela/20 text-ciruela hover:bg-ciruela/5"
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            {availableAddOns.length > 0 && (
              <div className="mt-5">
                <p className="mb-2 font-body text-xs uppercase tracking-[0.14em] text-ciruela/50">
                  Add-ons compatibles
                </p>
                <div className="space-y-2">
                  {availableAddOns.map((a) => (
                    <label
                      key={a.id}
                      className="flex items-center justify-between rounded-lg border border-ciruela/20 px-3 py-2 font-body text-sm text-ciruela"
                    >
                      <span className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedAddOns.includes(a.id)}
                          onChange={() => toggleAddOn(a.id)}
                          className="h-4 w-4 accent-ciruela"
                        />
                        <span>
                          {a.name}
                          <span className="ml-1 text-xs text-ciruela/50">· {a.function}</span>
                        </span>
                      </span>
                      <span className="text-xs text-ciruela/40">+{a.extraMinutes} min</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-5">
              <p className="mb-2 font-body text-xs uppercase tracking-[0.14em] text-ciruela/50">
                Productos usados (backbar)
              </p>
              <div className="space-y-2">
                {usedProducts.map((p, i) => (
                  <div key={i} className="flex gap-2">
                    <select
                      value={p.sku}
                      onChange={(e) => updateUsedProduct(i, { sku: e.target.value })}
                      className="flex-1 rounded-lg border border-ciruela/20 bg-hueso px-3 py-2 font-body text-sm text-ciruela focus:outline-none focus:ring-1 focus:ring-ciruela/40"
                    >
                      <option value="">Selecciona un producto</option>
                      {backbarAtLocation.map((b) => (
                        <option key={b.sku} value={b.sku}>
                          {b.product}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      placeholder="ml"
                      value={p.amountMl}
                      onChange={(e) => updateUsedProduct(i, { amountMl: e.target.value })}
                      className="w-20 rounded-lg border border-ciruela/20 bg-hueso px-3 py-2 font-body text-sm text-ciruela placeholder:text-ciruela/40 focus:outline-none focus:ring-1 focus:ring-ciruela/40"
                    />
                    {usedProducts.length > 1 && (
                      <button
                        onClick={() => setUsedProducts((prev) => prev.filter((_, idx) => idx !== i))}
                        aria-label="Quitar producto"
                        className="px-2 font-body text-sm text-ciruela/40 hover:text-crepe"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={() => setUsedProducts((prev) => [...prev, { sku: "", amountMl: "" }])}
                className="mt-2 font-body text-xs text-ciruela underline underline-offset-2"
              >
                + Agregar producto
              </button>
              <p className="mt-2 font-body text-xs text-ciruela/40">
                Se descuenta del inventario backbar y alimenta el reporte de consumo y mermas.
              </p>
            </div>

            <div className="mt-5">
              <p className="mb-2 font-body text-xs uppercase tracking-[0.14em] text-ciruela/50">
                Observaciones de piel
              </p>
              <textarea
                rows={3}
                required
                value={clinicalNotes}
                onChange={(e) => setClinicalNotes(e.target.value)}
                placeholder="Notas clínicas…"
                className="w-full rounded-lg border border-ciruela/20 bg-hueso px-3 py-2 font-body text-sm text-ciruela placeholder:text-ciruela/40 focus:outline-none focus:ring-1 focus:ring-ciruela/40"
              />
            </div>

            <div className="mt-5">
              <p className="mb-2 font-body text-xs uppercase tracking-[0.14em] text-ciruela/50">
                Intervalo de revisita recomendado
              </p>
              <select className="w-full rounded-lg border border-ciruela/20 bg-hueso px-3 py-2 font-body text-sm text-ciruela">
                <option>2 semanas</option>
                <option>4 semanas</option>
                <option>6 semanas</option>
              </select>
            </div>

            {completed ? (
              <p className="mt-6 rounded-lg bg-oliva/10 px-3 py-2 text-center font-body text-sm text-oliva">
                Tratamiento completado y registrado. {client.client} ya aparece como &ldquo;lista
                para cobro&rdquo; en el panel de Recepción.
              </p>
            ) : (
              <>
                <button
                  onClick={finishSession}
                  disabled={!canComplete}
                  className="mt-6 w-full rounded-full bg-ciruela px-5 py-3 font-body text-sm text-hueso disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Completar tratamiento
                </button>
                {!canComplete && (
                  <p className="mt-2 font-body text-xs text-ciruela/50">
                    {!hasLoggedProduct && !hasNotes
                      ? "Registra al menos un producto backbar y las notas clínicas para completar."
                      : !hasLoggedProduct
                        ? "Registra al menos un producto backbar (con cantidad en ml) para completar."
                        : "Agrega notas clínicas para completar."}
                  </p>
                )}
              </>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
