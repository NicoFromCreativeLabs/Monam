import { Card } from "./Card";

// Shared "Editar perfil" form for all three panels — reached from UserMenu.
export function ProfileForm({
  name,
  email,
  phone,
  role,
  location,
}: {
  name: string;
  email: string;
  phone: string;
  role: string;
  location?: string;
}) {
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Card title="Información personal">
        <div className="space-y-4">
          <Field label="Nombre completo" defaultValue={name} />
          <Field label="Email" defaultValue={email} type="email" />
          <Field label="Teléfono" defaultValue={phone} />
          <ReadOnlyField label="Rol" value={role} />
          {location && <ReadOnlyField label="Ubicación asignada" value={location} />}
        </div>
        <button className="mt-6 rounded-full bg-ciruela px-5 py-2.5 font-body text-sm text-hueso">
          Guardar cambios
        </button>
      </Card>

      <Card title="Contraseña">
        <div className="space-y-4">
          <Field label="Nueva contraseña" type="password" placeholder="••••••••" />
          <Field label="Confirmar contraseña" type="password" placeholder="••••••••" />
        </div>
        <button className="mt-6 rounded-full border border-ciruela px-5 py-2.5 font-body text-sm text-ciruela">
          Actualizar contraseña
        </button>
      </Card>
    </div>
  );
}

function Field({
  label,
  defaultValue,
  type = "text",
  placeholder,
}: {
  label: string;
  defaultValue?: string;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block font-body text-xs uppercase tracking-[0.14em] text-ciruela/50">
        {label}
      </label>
      <input
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full rounded-lg border border-ciruela/20 bg-hueso px-3 py-2 font-body text-sm text-ciruela placeholder:text-ciruela/40 focus:outline-none focus:ring-1 focus:ring-ciruela/40"
      />
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="mb-1 block font-body text-xs uppercase tracking-[0.14em] text-ciruela/50">
        {label}
      </label>
      <p className="rounded-lg bg-ciruela/5 px-3 py-2 font-body text-sm text-ciruela/70">
        {value}
      </p>
    </div>
  );
}
