"use client";

import { useState } from "react";
import { useProtocols } from "@/components/panel/ProtocolsContext";
import type { AddOnInput } from "@/lib/actions/addons";

const inputClass =
  "w-full rounded-lg border border-ciruela/20 bg-hueso px-3 py-2 font-body text-sm text-ciruela placeholder:text-ciruela/40 focus:outline-none focus:ring-1 focus:ring-ciruela/40";
const labelClass = "mb-1 block font-body text-xs uppercase tracking-[0.14em] text-ciruela/50";

export const EMPTY_ADD_ON: AddOnInput = { name: "", function: "", extraMinutes: 10, priceMxn: 0, costMxn: 0, availableOn: [] };

// Form shared by "Agregar add-on" (inline) and "Editar" (modal) in
// Configuración → Add-ons. Shows the server's refusal message, if any.
export function AddOnEditor({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: AddOnInput;
  submitLabel: string;
  onSubmit: (values: AddOnInput) => Promise<{ error?: string }>;
  onCancel?: () => void;
}) {
  const { protocols } = useProtocols();
  const [values, setValues] = useState(initial);
  const [minutes, setMinutes] = useState(String(initial.extraMinutes));
  const [price, setPrice] = useState(String(initial.priceMxn));
  const [cost, setCost] = useState(String(initial.costMxn));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function toggleProtocol(name: string) {
    setValues((v) => ({
      ...v,
      availableOn: v.availableOn.includes(name) ? v.availableOn.filter((n) => n !== name) : [...v.availableOn, name],
    }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const result = await onSubmit({ ...values, extraMinutes: Number(minutes), priceMxn: Number(price), costMxn: Number(cost) });
      if (result.error) setError(result.error);
    } catch {
      setError("No se pudo guardar. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-1 gap-3 min-[700px]:grid-cols-2">
      <div>
        <label className={labelClass}>Nombre</label>
        <input
          required
          value={values.name}
          onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
          placeholder="p. ej. Máscara de LED"
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>Función</label>
        <input
          value={values.function}
          onChange={(e) => setValues((v) => ({ ...v, function: e.target.value }))}
          placeholder="p. ej. Cuello y escote"
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>Minutos extra</label>
        <input
          type="number"
          min={0}
          max={120}
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>Precio adicional (MXN)</label>
        <input
          type="number"
          min={0}
          step={1}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="0 = incluido"
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>Costo por uso (MXN)</label>
        <input
          type="number"
          min={0}
          step={1}
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          placeholder="Producto que se gasta"
          className={inputClass}
        />
      </div>
      <div>
        <p className={labelClass}>Disponible en</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          {protocols.map((p) => (
            <label key={p.id} className="flex items-center gap-1.5 font-body text-sm text-ciruela">
              <input
                type="checkbox"
                className="h-4 w-4 accent-ciruela"
                checked={values.availableOn.includes(p.name)}
                onChange={() => toggleProtocol(p.name)}
              />
              {p.name}
            </label>
          ))}
        </div>
      </div>
      {error && (
        <p className="rounded-lg bg-[#b3392f]/10 px-3 py-2 font-body text-xs text-[#b3392f] min-[700px]:col-span-2">
          {error}
        </p>
      )}
      <div className="flex gap-2 min-[700px]:col-span-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-ciruela px-5 py-2.5 font-body text-sm text-hueso disabled:opacity-50"
        >
          {saving ? "Guardando…" : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-ciruela px-5 py-2.5 font-body text-sm text-ciruela"
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
