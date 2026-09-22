import { Card } from "@/components/panel/Card";
import { CLIENT_DETAIL } from "@/lib/mock-data";

// Editable — any edit here is visible to staff immediately (spec §8.3).
export default function ClientPreferences() {
  const { preferences } = CLIENT_DETAIL;

  return (
    <Card title="Mis preferencias">
      <div className="space-y-4">
        <Field label="Esteticista preferida" value={preferences.preferredEsthetician} />
        <Field label="Bebida" value={preferences.beverage} />
        <Field label="Música" value={preferences.music} />
        <Field label="Aromaterapia" value={preferences.aromatherapy} />
        <Field label="Conversación" value={preferences.conversation} />
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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="mb-1 block font-body text-xs uppercase tracking-[0.14em] text-ciruela/50">
        {label}
      </label>
      <input
        defaultValue={value}
        className="w-full rounded-lg border border-ciruela/20 bg-hueso px-3 py-2 font-body text-sm text-ciruela focus:outline-none focus:ring-1 focus:ring-ciruela/40"
      />
    </div>
  );
}
