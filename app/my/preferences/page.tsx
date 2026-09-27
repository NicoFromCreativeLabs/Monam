import { Card } from "@/components/panel/Card";
import { CLIENT_DETAIL } from "@/lib/mock-data";

const BEVERAGE_OPTIONS = ["Té de manzanilla", "Té verde", "Té de menta/hierbabuena"];
const AROMATHERAPY_OPTIONS = ["Lavanda", "Naranja", "Eucalipto", "Lemongrass", "Menta"];
const CONVERSATION_OPTIONS = ["Conversación", "Silencio"];

// Editable — any edit here is visible to staff immediately (spec §8.3).
// "Esteticista preferida" and "Música" are intentionally not shown here —
// per client feedback, esthetician preference is internal/staff-only info,
// not something the client sets from their own panel.
export default function ClientPreferences() {
  const { preferences } = CLIENT_DETAIL;

  return (
    <Card title="Mis preferencias">
      <div className="space-y-4">
        <SelectField label="Bebida" value={preferences.beverage} options={BEVERAGE_OPTIONS} />
        <SelectField
          label="Aromaterapia"
          value={preferences.aromatherapy}
          options={AROMATHERAPY_OPTIONS}
        />
        <SelectField
          label="Conversación"
          value={preferences.conversation}
          options={CONVERSATION_OPTIONS}
        />
        <div>
          <label className="mb-1 block font-body text-xs uppercase tracking-[0.14em] text-ciruela/50">
            Lista de deseos
          </label>
          <p className="font-body text-sm text-ciruela">{preferences.wishlist.join(", ")}</p>
        </div>
      </div>
      <button className="mt-6 rounded-full bg-ciruela px-5 py-2.5 font-body text-sm text-hueso">
        Guardar cambios
      </button>
    </Card>
  );
}

function SelectField({
  label,
  value,
  options,
}: {
  label: string;
  value: string;
  options: string[];
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
        defaultValue={value}
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
