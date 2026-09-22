import { Card } from "@/components/panel/Card";
import { CLIENT_DETAIL } from "@/lib/mock-data";

// Editable directly by the client — any edit here is visible to staff
// immediately, same as Preferencias.
export default function ClientSkinId() {
  const { skinId } = CLIENT_DETAIL;

  return (
    <Card title="Mi Skin ID">
      <p className="mb-4 font-body text-xs text-ciruela/50">
        Mantenla al día — el equipo la consulta antes de cada cita para elegir tu protocolo.
      </p>
      <div className="space-y-4">
        <Field label="Tipo de piel" value={skinId.skinType} />
        <Field label="Alergias" value={skinId.allergies.join(", ")} />
        <Field label="Medicamentos" value={skinId.medications.join(", ")} />
        <Field label="Objetivo" value={skinId.visitObjective} />
        <Field label="Exposición solar" value={skinId.sunExposure} />
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
