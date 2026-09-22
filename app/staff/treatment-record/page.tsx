"use client";

import { useState } from "react";
import { TopBar } from "@/components/panel/TopBar";
import { Card } from "@/components/panel/Card";
import { staffIdentity, useStaffRole } from "@/components/panel/StaffRoleContext";
import { useProtocols } from "@/components/panel/ProtocolsContext";
import { TODAY_APPOINTMENTS, BACKBAR_INVENTORY } from "@/lib/mock-data";

type UsedProduct = { sku: string; amountMl: string };

// Protocol assessed on arrival, not pre-booked (spec §5.2/§7.3). Manual
// dosage adjustment is possible but flagged as an exception in reporting.
// Reads the live protocol menu from ProtocolsContext, so a protocol added
// or removed in Admin Settings shows up here without a reload.
export default function StaffTreatmentRecord() {
  const { role } = useStaffRole();
  const identity = staffIdentity(role);
  const { protocols } = useProtocols();
  const client = TODAY_APPOINTMENTS[0];
  const tierProtocols = protocols.filter((p) => p.tier === client.tier);
  const [protocol, setProtocol] = useState(tierProtocols[0]?.name ?? "");
  const backbarAtLocation = BACKBAR_INVENTORY.filter((b) => b.location === identity.location);
  const [usedProducts, setUsedProducts] = useState<UsedProduct[]>([{ sku: "", amountMl: "" }]);

  function updateUsedProduct(index: number, patch: Partial<UsedProduct>) {
    setUsedProducts((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }

  return (
    <>
      <TopBar title="Registro de tratamiento" userName={identity.name} userRole={identity.role} />
      <div className="flex-1 px-8 py-6">
        <div className="mx-auto max-w-xl">
          <Card title={client.client}>
            <div>
              <p className="mb-2 font-body text-xs uppercase tracking-[0.14em] text-ciruela/50">
                Protocolo realizado
              </p>
              <div className="grid grid-cols-2 gap-2">
                {tierProtocols.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setProtocol(p.name)}
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

            <button className="mt-6 w-full rounded-full bg-ciruela px-5 py-3 font-body text-sm text-hueso">
              Completar tratamiento
            </button>
          </Card>
        </div>
      </div>
    </>
  );
}
