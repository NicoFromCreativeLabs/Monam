"use client";

import { useState } from "react";
import { TopBar } from "@/components/panel/TopBar";
import { Card } from "@/components/panel/Card";
import { Badge } from "@/components/panel/Badge";
import { OWNER, ESTHETICIAN_OCCUPANCY, type StaffMember } from "@/lib/mock-data";
import { useLocations } from "@/components/panel/LocationsContext";
import { useStaffRoster } from "@/components/panel/StaffRosterContext";

// All roles the roster can hold — Admin included, so ownership/admin rights
// can be granted or moved between people from this same screen.
const ROLE_OPTIONS = ["Admin", "Recepción", "Esteticista", "Gerente de clínica", "Contador"] as const;

// Equipo → Personal y horarios (renamed from "Personal" per client admin
// review). Roster, roles, location assignment (spec §6.1) plus a light
// weekly-hours summary — full shift scheduling/editing is out of scope for
// this pass, this is a read-only rollup of hours booked vs. available.
// Individual named logins only — no shared accounts, ever (spec §10).
export default function AdminStaff() {
  const { locations } = useLocations();
  const LOCATION_OPTIONS = [...locations.map((l) => l.name), "Ambas"];
  const { roster, addStaff, updateStaff, toggleStatus } = useStaffRoster();
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<{
    name: string;
    email: string;
    role: string;
    location: string;
    salary: string;
  }>({
    name: "",
    email: "",
    role: ROLE_OPTIONS[1],
    location: locations[0].name,
    salary: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ role: string; location: string; salary: string }>({
    role: "",
    location: "",
    salary: "",
  });

  function submitInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return;
    addStaff({
      name: form.name.trim(),
      email: form.email.trim(),
      role: form.role,
      location: form.location,
      status: "Invitado",
      salary: Number(form.salary) || 0,
    });
    setForm({ name: "", email: "", role: ROLE_OPTIONS[1], location: locations[0].name, salary: "" });
    setFormOpen(false);
  }

  function startEdit(s: StaffMember) {
    setEditingId(s.id);
    setDraft({ role: s.role, location: s.location, salary: String(s.salary) });
  }

  function saveEdit(id: string) {
    updateStaff(id, { role: draft.role, location: draft.location, salary: Number(draft.salary) || 0 });
    setEditingId(null);
  }

  return (
    <>
      <TopBar title="Personal y horarios" userName={OWNER.name} userRole={OWNER.role} allowBothLocations />
      <div className="flex-1 space-y-6 px-4 py-6 min-[860px]:px-8">
        <Card
          title="Roster"
          action={
            <button
              onClick={() => setFormOpen((v) => !v)}
              className="rounded-full bg-ciruela px-4 py-1.5 font-body text-xs text-hueso"
            >
              {formOpen ? "Cancelar" : "Invitar persona"}
            </button>
          }
        >
          {formOpen && (
            <form
              onSubmit={submitInvite}
              className="mb-5 grid grid-cols-1 gap-3 rounded-lg border border-ciruela/15 p-4 min-[700px]:grid-cols-2"
            >
              <div>
                <label className="mb-1 block font-body text-xs uppercase tracking-[0.14em] text-ciruela/50">
                  Nombre completo
                </label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-lg border border-ciruela/20 bg-hueso px-3 py-2 font-body text-sm text-ciruela focus:outline-none focus:ring-1 focus:ring-ciruela/40"
                />
              </div>
              <div>
                <label className="mb-1 block font-body text-xs uppercase tracking-[0.14em] text-ciruela/50">
                  Email
                </label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full rounded-lg border border-ciruela/20 bg-hueso px-3 py-2 font-body text-sm text-ciruela focus:outline-none focus:ring-1 focus:ring-ciruela/40"
                />
              </div>
              <div>
                <label className="mb-1 block font-body text-xs uppercase tracking-[0.14em] text-ciruela/50">
                  Rol
                </label>
                <select
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                  className="w-full rounded-lg border border-ciruela/20 bg-hueso px-3 py-2 font-body text-sm text-ciruela"
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                {form.role === "Gerente de clínica" && (
                  <p className="mt-1 font-body text-[11px] text-ciruela/40">
                    Rol inactivo hasta que abra Prado Norte (spec §2).
                  </p>
                )}
              </div>
              <div>
                <label className="mb-1 block font-body text-xs uppercase tracking-[0.14em] text-ciruela/50">
                  Ubicación asignada
                </label>
                <select
                  value={form.location}
                  onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                  className="w-full rounded-lg border border-ciruela/20 bg-hueso px-3 py-2 font-body text-sm text-ciruela"
                >
                  {LOCATION_OPTIONS.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block font-body text-xs uppercase tracking-[0.14em] text-ciruela/50">
                  Salario mensual (MXN)
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.salary}
                  onChange={(e) => setForm((f) => ({ ...f, salary: e.target.value }))}
                  placeholder="0"
                  className="w-full rounded-lg border border-ciruela/20 bg-hueso px-3 py-2 font-body text-sm text-ciruela placeholder:text-ciruela/40 focus:outline-none focus:ring-1 focus:ring-ciruela/40"
                />
              </div>
              <div className="min-[700px]:col-span-2">
                <button
                  type="submit"
                  className="rounded-full bg-ciruela px-5 py-2.5 font-body text-sm text-hueso"
                >
                  Enviar invitación
                </button>
                <p className="mt-2 font-body text-[11px] text-ciruela/40">
                  Login individual y con alcance de ubicación — nunca una cuenta compartida
                  (spec §10). El salario alimenta &ldquo;Nómina base&rdquo; en Análisis → P&L.
                </p>
              </div>
            </form>
          )}

          <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] whitespace-nowrap font-body text-sm text-ciruela">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-ciruela/40">
                <th className="pb-2">Nombre</th>
                <th className="pb-2">Rol</th>
                <th className="pb-2">Ubicación</th>
                <th className="pb-2 text-right">Salario</th>
                <th className="pb-2">Estado</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {roster.map((s) => {
                const isEditing = editingId === s.id;
                return (
                  <tr key={s.id} className="border-t border-ciruela/8">
                    <td className="py-3">{s.name}</td>
                    {isEditing ? (
                      <>
                        <td className="py-2">
                          <select
                            value={draft.role}
                            onChange={(e) => setDraft((d) => ({ ...d, role: e.target.value }))}
                            className="rounded-lg border border-ciruela/20 bg-hueso px-2 py-1 font-body text-sm text-ciruela"
                          >
                            {ROLE_OPTIONS.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2">
                          <select
                            value={draft.location}
                            onChange={(e) => setDraft((d) => ({ ...d, location: e.target.value }))}
                            className="rounded-lg border border-ciruela/20 bg-hueso px-2 py-1 font-body text-sm text-ciruela"
                          >
                            {LOCATION_OPTIONS.map((name) => (
                              <option key={name} value={name}>
                                {name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            $
                            <input
                              type="number"
                              min={0}
                              value={draft.salary}
                              onChange={(e) => setDraft((d) => ({ ...d, salary: e.target.value }))}
                              className="w-20 rounded border border-ciruela/25 bg-hueso px-1.5 py-1 text-right font-body text-sm text-ciruela"
                            />
                          </div>
                        </td>
                        <td className="py-3">
                          <Badge tone={s.status === "Activo" ? "positive" : s.status === "Invitado" ? "info" : "neutral"}>
                            {s.status}
                          </Badge>
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => saveEdit(s.id)}
                              className="rounded-full bg-ciruela px-2.5 py-1 font-body text-[11px] text-hueso"
                            >
                              Guardar
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="rounded-full border border-ciruela/30 px-2.5 py-1 font-body text-[11px] text-ciruela/70"
                            >
                              Cancelar
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-3 text-ciruela/60">{s.role}</td>
                        <td className="py-3 text-ciruela/60">{s.location}</td>
                        <td className="py-3 text-right text-ciruela/60">
                          ${s.salary.toLocaleString()} MXN
                        </td>
                        <td className="py-3">
                          <Badge tone={s.status === "Activo" ? "positive" : s.status === "Invitado" ? "info" : "neutral"}>
                            {s.status}
                          </Badge>
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex justify-end gap-3">
                            <button
                              onClick={() => startEdit(s)}
                              className="font-body text-[11px] text-ciruela underline"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => toggleStatus(s.id)}
                              className="font-body text-[11px] text-ciruela underline"
                            >
                              {s.status === "Inactivo" ? "Reactivar" : "Desactivar"}
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
          </div>
        </Card>

        <Card title="Horarios — semana en curso">
          <ul className="space-y-3">
            {ESTHETICIAN_OCCUPANCY.map((e) => {
              const pct = e.hoursBooked / e.hoursAvailable;
              return (
                <li key={e.name}>
                  <div className="mb-1 flex justify-between font-body text-xs text-ciruela">
                    <span>{e.name}</span>
                    <span className="text-ciruela/50">
                      {e.hoursBooked}h agendadas / {e.hoursAvailable}h disponibles
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-ciruela/8">
                    <div className="h-2 rounded-full bg-ciruela" style={{ width: `${pct * 100}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-4 font-body text-xs text-ciruela/40">
            Vista de solo lectura — la edición de turnos individuales es Fase 2.
          </p>
        </Card>
      </div>
    </>
  );
}
