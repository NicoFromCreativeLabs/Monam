"use client";

import { useState } from "react";
import { Card } from "./Card";
import {
  updateOwnPasswordAction,
  updateOwnProfileAction,
  type ProfileKind,
} from "@/lib/actions/profile";

type Message = { ok: boolean; text: string } | null;

// Shared "Editar perfil" form for all three panels — reached from UserMenu.
// Saves to the signed-in person's real record (lib/actions/profile.ts).
// `phone` is only passed for clients: staff accounts have no phone on file,
// so the field is hidden for them instead of pretending to save it. Email is
// the login, so it's shown read-only.
export function ProfileForm({
  kind,
  name,
  email,
  phone,
  role,
  location,
}: {
  kind: ProfileKind;
  name: string;
  email: string;
  phone?: string;
  role: string;
  location?: string;
}) {
  const [fields, setFields] = useState({ name, phone: phone ?? "" });
  const [infoMessage, setInfoMessage] = useState<Message>(null);
  const [savingInfo, setSavingInfo] = useState(false);
  const [password, setPassword] = useState({ next: "", confirm: "" });
  const [passwordMessage, setPasswordMessage] = useState<Message>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  async function saveInfo() {
    setSavingInfo(true);
    try {
      const result = await updateOwnProfileAction(kind, {
        name: fields.name,
        phone: phone === undefined ? undefined : fields.phone,
      });
      setInfoMessage(result.error ? { ok: false, text: result.error } : { ok: true, text: "Guardado." });
    } finally {
      setSavingInfo(false);
    }
  }

  async function updatePassword() {
    setSavingPassword(true);
    try {
      const result = await updateOwnPasswordAction(password.next, password.confirm);
      if (result.error) {
        setPasswordMessage({ ok: false, text: result.error });
      } else {
        setPasswordMessage({ ok: true, text: "Contraseña actualizada." });
        setPassword({ next: "", confirm: "" });
      }
    } finally {
      setSavingPassword(false);
    }
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
              setInfoMessage(null);
            }}
          />
          <ReadOnlyField label="Email" value={email} />
          {phone !== undefined && (
            <Field
              label="Teléfono (WhatsApp)"
              value={fields.phone}
              onChange={(v) => {
                setFields((f) => ({ ...f, phone: v }));
                setInfoMessage(null);
              }}
            />
          )}
          <ReadOnlyField label="Rol" value={role} />
          {location && <ReadOnlyField label="Ubicación asignada" value={location} />}
        </div>
        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={saveInfo}
            disabled={savingInfo}
            className="rounded-full bg-ciruela px-5 py-2.5 font-body text-sm text-hueso disabled:opacity-50"
          >
            {savingInfo ? "Guardando…" : "Guardar cambios"}
          </button>
          {infoMessage && (
            <span className={`font-body text-xs ${infoMessage.ok ? "text-oliva" : "text-[#b3392f]"}`}>
              {infoMessage.text}
            </span>
          )}
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
            disabled={savingPassword}
            className="rounded-full border border-ciruela px-5 py-2.5 font-body text-sm text-ciruela disabled:opacity-50"
          >
            {savingPassword ? "Actualizando…" : "Actualizar contraseña"}
          </button>
          {passwordMessage && (
            <span className={`font-body text-xs ${passwordMessage.ok ? "text-oliva" : "text-[#b3392f]"}`}>
              {passwordMessage.text}
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
