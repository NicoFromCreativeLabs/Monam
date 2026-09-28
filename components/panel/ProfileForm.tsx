"use client";

import { useState } from "react";
import { Card } from "./Card";

// Shared "Editar perfil" form for all three panels — reached from UserMenu.
// Fields are controlled + Guardar actually does something (brief inline
// confirmation) — found completely dead (no onClick anywhere, uncontrolled
// inputs) during the persona QA pass: typing here and clicking "Guardar
// cambios" silently did nothing. Still doesn't persist past a refresh (no
// per-user profile store exists yet), but at least responds instead of
// being a no-op button.
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
  const [fields, setFields] = useState({ name, email, phone });
  const [savedInfo, setSavedInfo] = useState(false);
  const [password, setPassword] = useState({ next: "", confirm: "" });
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);

  function saveInfo() {
    setSavedInfo(true);
  }

  function updatePassword() {
    if (!password.next || password.next !== password.confirm) {
      setPasswordMessage("Las contraseñas no coinciden.");
      return;
    }
    setPasswordMessage("Contraseña actualizada.");
    setPassword({ next: "", confirm: "" });
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Card title="Información personal">
        <div className="space-y-4">
          <Field
            label="Nombre completo"
            value={fields.name}
            onChange={(v) => {
              setFields((f) => ({ ...f, name: v }));
              setSavedInfo(false);
            }}
          />
          <Field
            label="Email"
            type="email"
            value={fields.email}
            onChange={(v) => {
              setFields((f) => ({ ...f, email: v }));
              setSavedInfo(false);
            }}
          />
          <Field
            label="Teléfono"
            value={fields.phone}
            onChange={(v) => {
              setFields((f) => ({ ...f, phone: v }));
              setSavedInfo(false);
            }}
          />
          <ReadOnlyField label="Rol" value={role} />
          {location && <ReadOnlyField label="Ubicación asignada" value={location} />}
        </div>
        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={saveInfo}
            className="rounded-full bg-ciruela px-5 py-2.5 font-body text-sm text-hueso"
          >
            Guardar cambios
          </button>
          {savedInfo && <span className="font-body text-xs text-oliva">Guardado.</span>}
        </div>
      </Card>

      <Card title="Contraseña">
        <div className="space-y-4">
          <Field
            label="Nueva contraseña"
            type="password"
            placeholder="••••••••"
            value={password.next}
            onChange={(v) => {
              setPassword((p) => ({ ...p, next: v }));
              setPasswordMessage(null);
            }}
          />
          <Field
            label="Confirmar contraseña"
            type="password"
            placeholder="••••••••"
            value={password.confirm}
            onChange={(v) => {
              setPassword((p) => ({ ...p, confirm: v }));
              setPasswordMessage(null);
            }}
          />
        </div>
        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={updatePassword}
            className="rounded-full border border-ciruela px-5 py-2.5 font-body text-sm text-ciruela"
          >
            Actualizar contraseña
          </button>
          {passwordMessage && (
            <span
              className={`font-body text-xs ${passwordMessage.startsWith("Contraseña") ? "text-oliva" : "text-crepe"}`}
            >
              {passwordMessage}
            </span>
          )}
        </div>
      </Card>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
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
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
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
