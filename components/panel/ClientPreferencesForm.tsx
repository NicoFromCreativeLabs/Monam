"use client";

import { useState } from "react";
import { Card } from "@/components/panel/Card";
import { updateOwnPreferencesAction, type PreferencesInput } from "@/lib/actions/clients";

const BEVERAGE_OPTIONS = ["Té de manzanilla", "Té verde", "Té de menta/hierbabuena"];
const AROMATHERAPY_OPTIONS = ["Lavanda", "Naranja", "Eucalipto", "Lemongrass", "Menta"];
const CONVERSATION_OPTIONS = ["Conversación", "Silencio"];

// Editable — any edit here is visible to staff immediately (spec §8.3).
// "Esteticista preferida" and "Música" are intentionally not shown here —
// per client feedback, esthetician preference is internal/staff-only info,
// not something the client sets from their own panel. Real read/write now
// (Client & Clinical phase) — `initial` is the real ClientPreference row,
// or blank defaults for a client with none saved yet.
export function ClientPreferencesForm({
  initial,
  wishlist,
}: {
  initial: PreferencesInput;
  wishlist: string[];
}) {
  const [form, setForm] = useState(initial);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    try {
      await updateOwnPreferencesAction(form);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title="Mis preferencias">
      <div className="space-y-4">
        <SelectField
          label="Bebida"
          value={form.beverage}
          options={BEVERAGE_OPTIONS}
          onChange={(v) => update("beverage", v)}
        />
        <SelectField
          label="Aromaterapia"
          value={form.aromatherapy}
          options={AROMATHERAPY_OPTIONS}
          onChange={(v) => update("aromatherapy", v)}
        />
        <SelectField
          label="Conversación"
          value={form.conversation}
          options={CONVERSATION_OPTIONS}
          onChange={(v) => update("conversation", v)}
        />
        <div>
          <label className="mb-1 block font-body text-xs uppercase tracking-[0.14em] text-ciruela/50">
            Lista de deseos
          </label>
          <p className="font-body text-sm text-ciruela">
            {wishlist.length > 0 ? wishlist.join(", ") : "Sin productos en tu lista todavía."}
          </p>
        </div>
      </div>
      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-full bg-ciruela px-5 py-2.5 font-body text-sm text-hueso disabled:opacity-50"
        >
          {saving ? "Guardando…" : "Guardar cambios"}
        </button>
        {saved && <span className="font-body text-xs text-oliva">Guardado.</span>}
      </div>
    </Card>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  const allOptions = value && !options.includes(value) ? [value, ...options] : options;
  return (
    <div>
      <label className="mb-1 block font-body text-xs uppercase tracking-[0.14em] text-ciruela/50">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-ciruela/20 bg-hueso px-3 py-2 font-body text-sm text-ciruela focus:outline-none focus:ring-1 focus:ring-ciruela/40"
      >
        <option value="">Selecciona…</option>
        {allOptions.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}
