"use client";

import { useState } from "react";
import { TopBar } from "@/components/panel/TopBar";
import { Card } from "@/components/panel/Card";
import { Badge } from "@/components/panel/Badge";
import { OWNER, SETTINGS } from "@/lib/mock-data";
import { useLocations, type LocationRecord } from "@/components/panel/LocationsContext";
import {
  useProtocols,
  type ProtocolRecord,
  type ProtocolTier,
} from "@/components/panel/ProtocolsContext";

// Locations, protocols/menu, deposit rules, cancellation policy (spec §6.1).
// Values shown as editable settings, not hardcoded constants — several are
// still "to define" per spec §14 (discount threshold, deposit %).
//
// Locations are editable here — including flipping Prado Norte to active
// once it actually opens — and the change is shared app-wide via
// LocationsContext (location switcher, booking flow, staff assignment all
// read the same state), not just this page's own copy.
const emptyNewLocation = { name: "", address: "", isActive: false };
const emptyNewProtocol = { name: "", tier: "Express" as ProtocolTier, duration: 30, price: 850, cost: 200 };

export default function AdminSettings() {
  const { locations, updateLocation, addLocation } = useLocations();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ name: string; address: string; isActive: boolean }>({
    name: "",
    address: "",
    isActive: false,
  });
  const [addOpen, setAddOpen] = useState(false);
  const [newLocation, setNewLocation] = useState(emptyNewLocation);

  const { protocols, updateProtocol, addProtocol, removeProtocol } = useProtocols();
  const [editingProtocolId, setEditingProtocolId] = useState<string | null>(null);
  const [protocolDraft, setProtocolDraft] = useState<{
    tier: ProtocolTier;
    duration: string;
    price: string;
    cost: string;
  }>({ tier: "Express", duration: "", price: "", cost: "" });
  const [addProtocolOpen, setAddProtocolOpen] = useState(false);
  const [newProtocol, setNewProtocol] = useState(emptyNewProtocol);

  const [rules, setRules] = useState({
    depositRequiredFirstTime: SETTINGS.depositRequiredFirstTime,
    depositRequiredSignature: SETTINGS.depositRequiredSignature,
    cancellationWindowHours: SETTINGS.cancellationWindowHours,
    discountApprovalThresholdPct: SETTINGS.discountApprovalThresholdPct,
  });

  function startEdit(l: LocationRecord) {
    setEditingId(l.id);
    setDraft({ name: l.name, address: l.address, isActive: l.isActive });
  }

  function saveEdit(id: string) {
    updateLocation(id, draft);
    setEditingId(null);
  }

  function submitNewLocation(e: React.FormEvent) {
    e.preventDefault();
    if (!newLocation.name.trim()) return;
    addLocation({
      name: newLocation.name.trim(),
      address: newLocation.address.trim(),
      isActive: newLocation.isActive,
    });
    setNewLocation(emptyNewLocation);
    setAddOpen(false);
  }

  function startEditProtocol(p: ProtocolRecord) {
    setEditingProtocolId(p.id);
    setProtocolDraft({
      tier: p.tier,
      duration: String(p.duration),
      price: String(p.price),
      cost: String(p.cost),
    });
  }

  function saveEditProtocol(id: string) {
    updateProtocol(id, {
      tier: protocolDraft.tier,
      duration: Number(protocolDraft.duration) || 0,
      price: Number(protocolDraft.price) || 0,
      cost: Number(protocolDraft.cost) || 0,
    });
    setEditingProtocolId(null);
  }

  function submitNewProtocol(e: React.FormEvent) {
    e.preventDefault();
    if (!newProtocol.name.trim()) return;
    addProtocol(newProtocol);
    setNewProtocol(emptyNewProtocol);
    setAddProtocolOpen(false);
  }

  return (
    <>
      <TopBar title="Configuración" userName={OWNER.name} userRole={OWNER.role} allowBothLocations />
      <div className="flex-1 space-y-6 px-8 py-6">
        <Card
          title="Ubicaciones"
          action={
            <button
              onClick={() => setAddOpen((v) => !v)}
              className="rounded-full bg-ciruela px-4 py-1.5 font-body text-xs text-hueso"
            >
              {addOpen ? "Cancelar" : "Agregar ubicación"}
            </button>
          }
        >
          {addOpen && (
            <form
              onSubmit={submitNewLocation}
              className="mb-5 grid grid-cols-1 gap-3 rounded-lg border border-ciruela/15 p-4 min-[700px]:grid-cols-2"
            >
              <div>
                <label className="mb-1 block font-body text-xs uppercase tracking-[0.14em] text-ciruela/50">
                  Nombre
                </label>
                <input
                  required
                  value={newLocation.name}
                  onChange={(e) => setNewLocation((f) => ({ ...f, name: e.target.value }))}
                  placeholder="p. ej. Polanco"
                  className="w-full rounded-lg border border-ciruela/20 bg-hueso px-3 py-2 font-body text-sm text-ciruela placeholder:text-ciruela/40 focus:outline-none focus:ring-1 focus:ring-ciruela/40"
                />
              </div>
              <div>
                <label className="mb-1 block font-body text-xs uppercase tracking-[0.14em] text-ciruela/50">
                  Dirección
                </label>
                <input
                  value={newLocation.address}
                  onChange={(e) => setNewLocation((f) => ({ ...f, address: e.target.value }))}
                  placeholder="Calle, colonia, CDMX"
                  className="w-full rounded-lg border border-ciruela/20 bg-hueso px-3 py-2 font-body text-sm text-ciruela placeholder:text-ciruela/40 focus:outline-none focus:ring-1 focus:ring-ciruela/40"
                />
              </div>
              <div className="min-[700px]:col-span-2">
                <label className="flex items-center gap-2 font-body text-sm text-ciruela">
                  <input
                    type="checkbox"
                    checked={newLocation.isActive}
                    onChange={(e) => setNewLocation((f) => ({ ...f, isActive: e.target.checked }))}
                    className="h-4 w-4 accent-ciruela"
                  />
                  Sucursal activa (abierta y operando)
                </label>
                <p className="mt-1 font-body text-[11px] text-ciruela/40">
                  Déjala sin marcar para pre-cargar la sucursal antes de su apertura — igual que
                  Prado Norte — y actívala aquí mismo cuando abra.
                </p>
              </div>
              <div className="min-[700px]:col-span-2">
                <button
                  type="submit"
                  className="rounded-full bg-ciruela px-5 py-2.5 font-body text-sm text-hueso"
                >
                  Agregar sucursal
                </button>
              </div>
            </form>
          )}
          <ul className="divide-y divide-ciruela/8">
            {locations.map((l) => {
              const isEditing = editingId === l.id;
              return (
                <li key={l.id} className="py-3">
                  {isEditing ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 gap-3 min-[700px]:grid-cols-2">
                        <div>
                          <label className="mb-1 block font-body text-xs uppercase tracking-[0.14em] text-ciruela/50">
                            Nombre
                          </label>
                          <input
                            value={draft.name}
                            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                            className="w-full rounded-lg border border-ciruela/20 bg-hueso px-3 py-2 font-body text-sm text-ciruela focus:outline-none focus:ring-1 focus:ring-ciruela/40"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block font-body text-xs uppercase tracking-[0.14em] text-ciruela/50">
                            Dirección
                          </label>
                          <input
                            value={draft.address}
                            onChange={(e) => setDraft((d) => ({ ...d, address: e.target.value }))}
                            className="w-full rounded-lg border border-ciruela/20 bg-hueso px-3 py-2 font-body text-sm text-ciruela focus:outline-none focus:ring-1 focus:ring-ciruela/40"
                          />
                        </div>
                      </div>
                      <label className="flex items-center gap-2 font-body text-sm text-ciruela">
                        <input
                          type="checkbox"
                          checked={draft.isActive}
                          onChange={(e) => setDraft((d) => ({ ...d, isActive: e.target.checked }))}
                          className="h-4 w-4 accent-ciruela"
                        />
                        Sucursal activa (abierta y operando)
                      </label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveEdit(l.id)}
                          className="rounded-full bg-ciruela px-4 py-1.5 font-body text-xs text-hueso"
                        >
                          Guardar
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="rounded-full border border-ciruela/30 px-4 py-1.5 font-body text-xs text-ciruela/70"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-body text-sm text-ciruela">{l.name}</p>
                        <p className="font-body text-xs text-ciruela/50">{l.address}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge tone={l.isActive ? "positive" : "neutral"}>
                          {l.isActive ? "Activa" : "Aún no abre"}
                        </Badge>
                        <button
                          onClick={() => startEdit(l)}
                          className="font-body text-xs text-ciruela underline"
                        >
                          Editar
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>

        <Card
          title="Menú de protocolos"
          action={
            <button
              onClick={() => setAddProtocolOpen((v) => !v)}
              className="rounded-full bg-ciruela px-4 py-1.5 font-body text-xs text-hueso"
            >
              {addProtocolOpen ? "Cancelar" : "Agregar protocolo"}
            </button>
          }
        >
          {addProtocolOpen && (
            <form
              onSubmit={submitNewProtocol}
              className="mb-5 grid grid-cols-2 gap-3 rounded-lg border border-ciruela/15 p-4 min-[700px]:grid-cols-4"
            >
              <div className="col-span-2 min-[700px]:col-span-1">
                <label className="mb-1 block font-body text-xs uppercase tracking-[0.14em] text-ciruela/50">
                  Nombre
                </label>
                <input
                  required
                  value={newProtocol.name}
                  onChange={(e) => setNewProtocol((f) => ({ ...f, name: e.target.value }))}
                  placeholder="p. ej. Detox"
                  className="w-full rounded-lg border border-ciruela/20 bg-hueso px-3 py-2 font-body text-sm text-ciruela placeholder:text-ciruela/40 focus:outline-none focus:ring-1 focus:ring-ciruela/40"
                />
              </div>
              <div>
                <label className="mb-1 block font-body text-xs uppercase tracking-[0.14em] text-ciruela/50">
                  Nivel
                </label>
                <select
                  value={newProtocol.tier}
                  onChange={(e) =>
                    setNewProtocol((f) => ({
                      ...f,
                      tier: e.target.value as ProtocolTier,
                      duration: e.target.value === "Signature" ? 60 : 30,
                      price: e.target.value === "Signature" ? 1900 : 850,
                    }))
                  }
                  className="w-full rounded-lg border border-ciruela/20 bg-hueso px-3 py-2 font-body text-sm text-ciruela"
                >
                  <option value="Express">Express</option>
                  <option value="Signature">Signature</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block font-body text-xs uppercase tracking-[0.14em] text-ciruela/50">
                  Duración (min)
                </label>
                <input
                  type="number"
                  value={newProtocol.duration}
                  onChange={(e) => setNewProtocol((f) => ({ ...f, duration: Number(e.target.value) }))}
                  className="w-full rounded-lg border border-ciruela/20 bg-hueso px-3 py-2 font-body text-sm text-ciruela"
                />
              </div>
              <div>
                <label className="mb-1 block font-body text-xs uppercase tracking-[0.14em] text-ciruela/50">
                  Precio (MXN)
                </label>
                <input
                  type="number"
                  value={newProtocol.price}
                  onChange={(e) => setNewProtocol((f) => ({ ...f, price: Number(e.target.value) }))}
                  className="w-full rounded-lg border border-ciruela/20 bg-hueso px-3 py-2 font-body text-sm text-ciruela"
                />
              </div>
              <div>
                <label className="mb-1 block font-body text-xs uppercase tracking-[0.14em] text-ciruela/50">
                  Costo unitario (MXN)
                </label>
                <input
                  type="number"
                  value={newProtocol.cost}
                  onChange={(e) => setNewProtocol((f) => ({ ...f, cost: Number(e.target.value) }))}
                  className="w-full rounded-lg border border-ciruela/20 bg-hueso px-3 py-2 font-body text-sm text-ciruela"
                />
              </div>
              <div className="col-span-2 min-[700px]:col-span-4">
                <p className="mb-2 font-body text-[11px] text-ciruela/40">
                  Costo = producto backbar por tratamiento (no incluye mano de obra, comisión
                  ni renta) — alimenta el margen por protocolo en Reportes financieros.
                </p>
                <button
                  type="submit"
                  className="rounded-full bg-ciruela px-5 py-2.5 font-body text-sm text-hueso"
                >
                  Agregar protocolo
                </button>
              </div>
            </form>
          )}

          <table className="w-full font-body text-sm text-ciruela">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-ciruela/40">
                <th className="pb-2">Protocolo</th>
                <th className="pb-2">Duración</th>
                <th className="pb-2 pr-3 text-right">Precio</th>
                <th className="pb-2 pr-6 text-right">Costo unitario</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {protocols.map((p) => {
                const isEditing = editingProtocolId === p.id;
                return (
                  <tr key={p.id} className="border-t border-ciruela/8">
                    {isEditing ? (
                      <>
                        <td className="py-2">
                          {p.name}{" "}
                          <select
                            value={protocolDraft.tier}
                            onChange={(e) =>
                              setProtocolDraft((d) => ({ ...d, tier: e.target.value as ProtocolTier }))
                            }
                            className="rounded-lg border border-ciruela/20 bg-hueso px-1.5 py-0.5 font-body text-xs text-ciruela"
                          >
                            <option value="Express">Express</option>
                            <option value="Signature">Signature</option>
                          </select>
                        </td>
                        <td className="py-2">
                          <input
                            type="number"
                            value={protocolDraft.duration}
                            onChange={(e) =>
                              setProtocolDraft((d) => ({ ...d, duration: e.target.value }))
                            }
                            className="w-16 rounded border border-ciruela/25 bg-hueso px-1.5 py-1 font-body text-sm text-ciruela"
                          />{" "}
                          min
                        </td>
                        <td className="py-2 pr-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            $
                            <input
                              type="number"
                              value={protocolDraft.price}
                              onChange={(e) =>
                                setProtocolDraft((d) => ({ ...d, price: e.target.value }))
                              }
                              className="w-20 rounded border border-ciruela/25 bg-hueso px-1.5 py-1 text-right font-body text-sm text-ciruela"
                            />
                          </div>
                        </td>
                        <td className="py-2 pr-6 text-right">
                          <div className="flex items-center justify-end gap-1">
                            $
                            <input
                              type="number"
                              value={protocolDraft.cost}
                              onChange={(e) =>
                                setProtocolDraft((d) => ({ ...d, cost: e.target.value }))
                              }
                              className="w-20 rounded border border-ciruela/25 bg-hueso px-1.5 py-1 text-right font-body text-sm text-ciruela"
                            />
                          </div>
                        </td>
                        <td className="py-2 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => saveEditProtocol(p.id)}
                              className="rounded-full bg-ciruela px-2.5 py-1 font-body text-[11px] text-hueso"
                            >
                              Guardar
                            </button>
                            <button
                              onClick={() => setEditingProtocolId(null)}
                              className="rounded-full border border-ciruela/30 px-2.5 py-1 font-body text-[11px] text-ciruela/70"
                            >
                              Cancelar
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-2">
                          {p.name} <span className="text-ciruela/40">· {p.tier}</span>
                        </td>
                        <td className="py-2 text-ciruela/60">{p.duration} min</td>
                        <td className="py-2 pr-3 text-right">${p.price} MXN</td>
                        <td className="py-2 pr-6 text-right text-ciruela/60">${p.cost} MXN</td>
                        <td className="py-2 text-right">
                          <div className="flex justify-end gap-3">
                            <button
                              onClick={() => startEditProtocol(p)}
                              className="font-body text-[11px] text-ciruela underline"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => removeProtocol(p.id)}
                              className="font-body text-[11px] text-crepe underline"
                            >
                              Borrar
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>

        <div className="grid grid-cols-1 gap-6 min-[1100px]:grid-cols-2">
          <Card title="Depósitos">
            <label className="flex items-center justify-between py-2 font-body text-sm text-ciruela">
              Requerido para clientas nuevas
              <input
                type="checkbox"
                checked={rules.depositRequiredFirstTime}
                onChange={(e) =>
                  setRules((r) => ({ ...r, depositRequiredFirstTime: e.target.checked }))
                }
                className="h-4 w-4 accent-ciruela"
              />
            </label>
            <label className="flex items-center justify-between border-t border-ciruela/8 py-2 font-body text-sm text-ciruela">
              Requerido para Signature (60 min)
              <input
                type="checkbox"
                checked={rules.depositRequiredSignature}
                onChange={(e) =>
                  setRules((r) => ({ ...r, depositRequiredSignature: e.target.checked }))
                }
                className="h-4 w-4 accent-ciruela"
              />
            </label>
          </Card>

          <Card title="Cancelación y aprobaciones">
            <label className="flex items-center justify-between py-2 font-body text-sm text-ciruela">
              Ventana de cancelación sin costo
              <span className="flex items-center gap-1 text-ciruela/60">
                <input
                  type="number"
                  min={0}
                  value={rules.cancellationWindowHours}
                  onChange={(e) =>
                    setRules((r) => ({
                      ...r,
                      cancellationWindowHours: Number(e.target.value) || 0,
                    }))
                  }
                  className="w-16 rounded border border-ciruela/25 bg-hueso px-1.5 py-1 text-right font-body text-sm text-ciruela focus:outline-none focus:ring-1 focus:ring-ciruela/40"
                />
                horas
              </span>
            </label>
            <label className="flex items-center justify-between border-t border-ciruela/8 py-2 font-body text-sm text-ciruela">
              Umbral de aprobación de descuento
              <span className="flex items-center gap-1 text-ciruela/60">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={rules.discountApprovalThresholdPct}
                  onChange={(e) =>
                    setRules((r) => ({
                      ...r,
                      discountApprovalThresholdPct: Number(e.target.value) || 0,
                    }))
                  }
                  className="w-16 rounded border border-ciruela/25 bg-hueso px-1.5 py-1 text-right font-body text-sm text-ciruela focus:outline-none focus:ring-1 focus:ring-ciruela/40"
                />
                %
              </span>
            </label>
          </Card>
        </div>
      </div>
    </>
  );
}
