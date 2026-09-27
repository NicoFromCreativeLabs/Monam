"use client";

import { useState } from "react";
import { TopBar } from "@/components/panel/TopBar";
import { Card } from "@/components/panel/Card";
import { Badge } from "@/components/panel/Badge";
import {
  OWNER,
  SETTINGS,
  ADD_ONS,
  KPI_TARGETS,
  PERMISSIONS_MATRIX,
  BUSINESS_RULES_EXTRA,
} from "@/lib/mock-data";
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
const emptyNewLocation = { name: "", address: "", isActive: false, rentCost: "", maintenanceCost: "" };
const emptyNewProtocol = { name: "", tier: "Targeted" as ProtocolTier, duration: 30, price: 850, cost: 200 };

export default function AdminSettings() {
  const { locations, updateLocation, addLocation } = useLocations();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{
    name: string;
    address: string;
    isActive: boolean;
    rentCost: string;
    maintenanceCost: string;
  }>({
    name: "",
    address: "",
    isActive: false,
    rentCost: "",
    maintenanceCost: "",
  });
  const [addOpen, setAddOpen] = useState(false);
  const [newLocation, setNewLocation] = useState(emptyNewLocation);

  const { protocols, updateProtocol, addProtocol, removeProtocol } = useProtocols();
  const [protocolEditModal, setProtocolEditModal] = useState<{
    id: string;
    name: string;
    tier: ProtocolTier;
    duration: string;
    price: string;
    cost: string;
  } | null>(null);
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
    setDraft({
      name: l.name,
      address: l.address,
      isActive: l.isActive,
      rentCost: String(l.rentCost),
      maintenanceCost: String(l.maintenanceCost),
    });
  }

  function saveEdit(id: string) {
    updateLocation(id, {
      name: draft.name,
      address: draft.address,
      isActive: draft.isActive,
      rentCost: Number(draft.rentCost) || 0,
      maintenanceCost: Number(draft.maintenanceCost) || 0,
    });
    setEditingId(null);
  }

  function submitNewLocation(e: React.FormEvent) {
    e.preventDefault();
    if (!newLocation.name.trim()) return;
    addLocation({
      name: newLocation.name.trim(),
      address: newLocation.address.trim(),
      isActive: newLocation.isActive,
      rentCost: Number(newLocation.rentCost) || 0,
      maintenanceCost: Number(newLocation.maintenanceCost) || 0,
    });
    setNewLocation(emptyNewLocation);
    setAddOpen(false);
  }

  // Editing happens in a modal, not inline table inputs — a select plus
  // three number inputs squeezed into one row breaks down on mobile widths.
  function openEditProtocol(p: ProtocolRecord) {
    setProtocolEditModal({
      id: p.id,
      name: p.name,
      tier: p.tier,
      duration: String(p.duration),
      price: String(p.price),
      cost: String(p.cost),
    });
  }

  function saveEditProtocol() {
    if (!protocolEditModal) return;
    const { id, tier, duration, price, cost } = protocolEditModal;
    updateProtocol(id, {
      tier,
      duration: Number(duration) || 0,
      price: Number(price) || 0,
      cost: Number(cost) || 0,
    });
    setProtocolEditModal(null);
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
              <div>
                <label className="mb-1 block font-body text-xs uppercase tracking-[0.14em] text-ciruela/50">
                  Costo de renta (MXN/mes)
                </label>
                <input
                  type="number"
                  value={newLocation.rentCost}
                  onChange={(e) => setNewLocation((f) => ({ ...f, rentCost: e.target.value }))}
                  placeholder="0"
                  className="w-full rounded-lg border border-ciruela/20 bg-hueso px-3 py-2 font-body text-sm text-ciruela placeholder:text-ciruela/40 focus:outline-none focus:ring-1 focus:ring-ciruela/40"
                />
              </div>
              <div>
                <label className="mb-1 block font-body text-xs uppercase tracking-[0.14em] text-ciruela/50">
                  Costo de mantenimiento (MXN/mes)
                </label>
                <input
                  type="number"
                  value={newLocation.maintenanceCost}
                  onChange={(e) => setNewLocation((f) => ({ ...f, maintenanceCost: e.target.value }))}
                  placeholder="0"
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
                      <div className="grid grid-cols-1 gap-3 min-[700px]:grid-cols-2">
                        <div>
                          <label className="mb-1 block font-body text-xs uppercase tracking-[0.14em] text-ciruela/50">
                            Costo de renta (MXN/mes)
                          </label>
                          <input
                            type="number"
                            value={draft.rentCost}
                            onChange={(e) => setDraft((d) => ({ ...d, rentCost: e.target.value }))}
                            className="w-full rounded-lg border border-ciruela/20 bg-hueso px-3 py-2 font-body text-sm text-ciruela focus:outline-none focus:ring-1 focus:ring-ciruela/40"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block font-body text-xs uppercase tracking-[0.14em] text-ciruela/50">
                            Costo de mantenimiento (MXN/mes)
                          </label>
                          <input
                            type="number"
                            value={draft.maintenanceCost}
                            onChange={(e) =>
                              setDraft((d) => ({ ...d, maintenanceCost: e.target.value }))
                            }
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
                        <p className="mt-0.5 font-body text-xs text-ciruela/40">
                          Renta ${l.rentCost.toLocaleString()} MXN · Mantenimiento $
                          {l.maintenanceCost.toLocaleString()} MXN
                        </p>
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
                  <option value="Targeted">Targeted</option>
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

          <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] whitespace-nowrap font-body text-sm text-ciruela">
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
              {protocols.map((p) => (
                <tr key={p.id} className="border-t border-ciruela/8">
                  <td className="py-2">
                    {p.name} <span className="text-ciruela/40">· {p.tier}</span>
                  </td>
                  <td className="py-2 text-ciruela/60">{p.duration} min</td>
                  <td className="py-2 pr-3 text-right">${p.price} MXN</td>
                  <td className="py-2 pr-6 text-right text-ciruela/60">${p.cost} MXN</td>
                  <td className="py-2 text-right">
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => openEditProtocol(p)}
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
                </tr>
              ))}
            </tbody>
          </table>
          </div>
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

        <Card title="Add-ons">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] whitespace-nowrap font-body text-sm text-ciruela">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-ciruela/40">
                <th className="pb-2">Add-on</th>
                <th className="pb-2">Función</th>
                <th className="pb-2 text-right">Minutos extra</th>
                <th className="pb-2 text-right">Disponible en</th>
              </tr>
            </thead>
            <tbody>
              {ADD_ONS.map((a) => (
                <tr key={a.id} className="border-t border-ciruela/8">
                  <td className="py-2.5">{a.name}</td>
                  <td className="py-2.5 text-ciruela/60">{a.function}</td>
                  <td className="py-2.5 text-right text-ciruela/60">+{a.extraMinutes} min</td>
                  <td className="py-2.5 text-right text-ciruela/50">{a.availableOn.join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </Card>

        <Card title="Reglas de comisión y umbrales de anomalía">
          <dl className="grid grid-cols-1 gap-4 min-[700px]:grid-cols-2">
            <div className="flex items-center justify-between border-b border-ciruela/8 pb-2 font-body text-sm text-ciruela">
              <dt>Comisión — servicio</dt>
              <dd className="text-ciruela/60">{BUSINESS_RULES_EXTRA.commissionServicePct}%</dd>
            </div>
            <div className="flex items-center justify-between border-b border-ciruela/8 pb-2 font-body text-sm text-ciruela">
              <dt>Comisión — retail</dt>
              <dd className="text-ciruela/60">{BUSINESS_RULES_EXTRA.commissionRetailPct}%</dd>
            </div>
            <div className="flex items-center justify-between font-body text-sm text-ciruela">
              <dt>Umbral de anomalía — descuento</dt>
              <dd className="text-ciruela/60">{BUSINESS_RULES_EXTRA.anomalyDiscountThresholdPct}%</dd>
            </div>
            <div className="flex items-center justify-between font-body text-sm text-ciruela">
              <dt>Umbral de anomalía — reembolso</dt>
              <dd className="text-ciruela/60">
                ${BUSINESS_RULES_EXTRA.anomalyRefundThresholdMXN.toLocaleString()} MXN
              </dd>
            </div>
          </dl>
          <p className="mt-4 font-body text-xs text-ciruela/40">
            Valores de referencia — la edición en vivo de reglas de comisión es Fase 2.
          </p>
        </Card>

        <Card title="Objetivos por KPI">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] whitespace-nowrap font-body text-sm text-ciruela">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-ciruela/40">
                <th className="pb-2">KPI</th>
                <th className="pb-2 text-right">Objetivo</th>
                <th className="pb-2 text-right">Vigencia</th>
              </tr>
            </thead>
            <tbody>
              {KPI_TARGETS.map((k) => (
                <tr key={k.kpi} className="border-t border-ciruela/8">
                  <td className="py-2.5">{k.kpi}</td>
                  <td className="py-2.5 text-right">{k.target}</td>
                  <td className="py-2.5 text-right text-ciruela/50">{k.vigencia}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          <p className="mt-3 font-body text-xs text-ciruela/40">
            Alimenta la columna &ldquo;Objetivo&rdquo; en Análisis → P&L y el avance mostrado en
            cada tarjeta de KPI. Edición de objetivos es Fase 2.
          </p>
        </Card>

        <Card title="Permisos por rol">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] whitespace-nowrap font-body text-sm text-ciruela">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-ciruela/40">
                  <th className="pb-2 pr-4">Área</th>
                  {PERMISSIONS_MATRIX.roles.map((r) => (
                    <th key={r} className="pb-2 pr-4 text-left">
                      {r}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERMISSIONS_MATRIX.rows.map((row) => (
                  <tr key={row.area} className="border-t border-ciruela/8">
                    <td className="py-2.5 pr-4">{row.area}</td>
                    {row.access.map((val, i) => (
                      <td key={i} className="py-2.5 pr-4 text-ciruela/60">
                        {val}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 font-body text-xs text-ciruela/40">
            Matriz de referencia — edición granular de permisos por rol es Fase 2.
          </p>
        </Card>
      </div>

      {protocolEditModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ciruela/40 px-4"
          onClick={() => setProtocolEditModal(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-hueso p-5 shadow-xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <p className="font-display text-sm text-ciruela">Editar protocolo</p>
              <button
                onClick={() => setProtocolEditModal(null)}
                aria-label="Cerrar"
                className="text-ciruela/50 hover:text-ciruela"
              >
                ×
              </button>
            </div>
            <p className="mb-4 font-body text-xs text-ciruela/50">{protocolEditModal.name}</p>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="mb-1 block font-body text-xs uppercase tracking-[0.14em] text-ciruela/50">
                  Nivel
                </label>
                <select
                  value={protocolEditModal.tier}
                  onChange={(e) =>
                    setProtocolEditModal((m) =>
                      m ? { ...m, tier: e.target.value as ProtocolTier } : m,
                    )
                  }
                  className="w-full rounded-lg border border-ciruela/20 bg-hueso px-3 py-2 font-body text-sm text-ciruela"
                >
                  <option value="Targeted">Targeted</option>
                  <option value="Signature">Signature</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block font-body text-xs uppercase tracking-[0.14em] text-ciruela/50">
                  Duración (min)
                </label>
                <input
                  type="number"
                  value={protocolEditModal.duration}
                  onChange={(e) =>
                    setProtocolEditModal((m) => (m ? { ...m, duration: e.target.value } : m))
                  }
                  className="w-full rounded-lg border border-ciruela/20 bg-hueso px-3 py-2 font-body text-sm text-ciruela focus:outline-none focus:ring-1 focus:ring-ciruela/40"
                />
              </div>
              <div>
                <label className="mb-1 block font-body text-xs uppercase tracking-[0.14em] text-ciruela/50">
                  Precio (MXN)
                </label>
                <input
                  type="number"
                  value={protocolEditModal.price}
                  onChange={(e) =>
                    setProtocolEditModal((m) => (m ? { ...m, price: e.target.value } : m))
                  }
                  className="w-full rounded-lg border border-ciruela/20 bg-hueso px-3 py-2 font-body text-sm text-ciruela focus:outline-none focus:ring-1 focus:ring-ciruela/40"
                />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block font-body text-xs uppercase tracking-[0.14em] text-ciruela/50">
                  Costo unitario (MXN)
                </label>
                <input
                  type="number"
                  value={protocolEditModal.cost}
                  onChange={(e) =>
                    setProtocolEditModal((m) => (m ? { ...m, cost: e.target.value } : m))
                  }
                  className="w-full rounded-lg border border-ciruela/20 bg-hueso px-3 py-2 font-body text-sm text-ciruela focus:outline-none focus:ring-1 focus:ring-ciruela/40"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setProtocolEditModal(null)}
                className="rounded-full border border-ciruela px-4 py-1.5 font-body text-xs text-ciruela hover:bg-ciruela hover:text-hueso"
              >
                Cancelar
              </button>
              <button
                onClick={saveEditProtocol}
                className="rounded-full bg-ciruela px-4 py-1.5 font-body text-xs text-hueso"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
