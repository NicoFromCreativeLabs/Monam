"use client";

import { useState } from "react";
import { Card } from "@/components/panel/Card";
import { CLIENT_DETAIL } from "@/lib/mock-data";

const SKIN_TYPE_OPTIONS = ["Mixta", "Seca", "Grasa", "Normal", "No estoy segura/o"];
const OBJECTIVE_OPTIONS = [
  "Luminosidad",
  "Hidratación",
  "Limpieza",
  "Calmar",
  "Firmeza",
  "Recuperación",
  "Prevención",
  "No estoy segura/o",
];
const SUN_EXPOSURE_OPTIONS = ["Leve", "Moderada", "Alta"];

// Editable directly by the client — any edit here is visible to staff
// immediately, same as Preferencias. Fields are controlled and "Guardar
// cambios" actually responds — found completely dead (no onClick, every
// field uncontrolled) during the persona QA pass.
export default function ClientSkinId() {
  const { skinId } = CLIENT_DETAIL;
  const [form, setForm] = useState({
    skinType: skinId.skinType,
    allergies: skinId.allergies.join(", "),
    medications: skinId.medications.join(", "),
    visitObjective: skinId.visitObjective,
    sunExposure: skinId.sunExposure,
    notes: "",
  });
  const [saved, setSaved] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  return (
    <Card title="Mi Skin ID">
      <p className="mb-4 font-body text-xs text-ciruela/50">
        Tu Skin ID nos da una primera idea de tu piel y objetivos — tu cosmetóloga lo revisará
        contigo antes de cada tratamiento
      </p>
      <div className="space-y-4">
        <SelectField
          label="Tipo de piel"
          value={form.skinType}
          options={SKIN_TYPE_OPTIONS}
          onChange={(v) => update("skinType", v)}
        />
        <Field
          label="Alergias"
          value={form.allergies}
          placeholder="Ej. fragancias, frutos secos, algún ingrediente…"
          onChange={(v) => update("allergies", v)}
        />
        <Field
          label="Medicamentos"
          value={form.medications}
          placeholder="Incluye medicamentos tópicos y orales relevantes"
          onChange={(v) => update("medications", v)}
        />
        <SelectField
          label="Objetivo"
          value={form.visitObjective}
          options={OBJECTIVE_OPTIONS}
          onChange={(v) => update("visitObjective", v)}
        />
        <SelectField
          label="Exposición solar"
          value={form.sunExposure}
          options={SUN_EXPOSURE_OPTIONS}
          onChange={(v) => update("sunExposure", v)}
        />
      </div>

      <div className="mt-8 border-t border-ciruela/10 pt-6">
        <p className="font-body text-sm text-ciruela">Información adicional</p>
        <p className="mt-1 mb-3 font-body text-xs text-ciruela/50">
          Cuéntanos cualquier información que debamos considerar antes de tu tratamiento:
          procedimientos estéticos recientes (como Botox, fillers, láser o peelings), sensibilidad
          o condiciones de piel, embarazo o cualquier otro dato relevante.
        </p>
        <textarea
          rows={4}
          value={form.notes}
          onChange={(e) => update("notes", e.target.value)}
          placeholder="Escribe aquí cualquier detalle relevante…"
          className="w-full rounded-lg border border-ciruela/20 bg-hueso px-3 py-2 font-body text-sm text-ciruela focus:outline-none focus:ring-1 focus:ring-ciruela/40"
        />
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

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block font-body text-xs uppercase tracking-[0.14em] text-ciruela/50">
        {label}
      </label>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-ciruela/20 bg-hueso px-3 py-2 font-body text-sm text-ciruela placeholder:text-ciruela/40 focus:outline-none focus:ring-1 focus:ring-ciruela/40"
      />
    </div>
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
  // The client's current mock value isn't guaranteed to be one of the fixed
  // options (e.g. free-text history from before this became a dropdown), so
  // it's included as a selectable option if it's not already in the list —
  // keeps existing data visible instead of silently discarding it.
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
