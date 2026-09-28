"use client";

import { useState } from "react";
import { Card } from "@/components/panel/Card";
import { CLIENT_DETAIL } from "@/lib/mock-data";

const BEVERAGE_OPTIONS = ["Té de manzanilla", "Té verde", "Té de menta/hierbabuena"];
const AROMATHERAPY_OPTIONS = ["Lavanda", "Naranja", "Eucalipto", "Lemongrass", "Menta"];
const CONVERSATION_OPTIONS = ["Conversación", "Silencio"];

// Editable — any edit here is visible to staff immediately (spec §8.3).
// "Esteticista preferida" and "Música" are intentionally not shown here —
// per client feedback, esthetician preference is internal/staff-only info,
// not something the client sets from their own panel. Fields are controlled
// and "Guardar cambios" actually responds — found completely dead (no
// onClick, every field uncontrolled) during the persona QA pass.
export default function ClientPreferences() {
  const { preferences } = CLIENT_DETAIL;
  const [form, setForm] = useState({
    beverage: preferences.beverage,
    aromatherapy: preferences.aromatherapy,
    conversation: preferences.conversation,
  });
  const [saved, setSaved] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
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
          <p className="font-body text-sm text-ciruela">{preferences.wishlist.join(", ")}</p>
        </div>
      </div>
      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={() => setSaved(true)}
          className="rounded-full bg-ciruela px-5 py-2.5 font-body text-sm text-hueso"
        >
          Guardar cambios
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
  // Existing mock values can carry extra detail (e.g. an allergy note on the
  // beverage field) that doesn't map onto the fixed option list — keep it
  // selectable instead of silently discarding it.
  const allOptions = options.includes(value) ? options : [value, ...options];
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
        {allOptions.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}
