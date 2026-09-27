"use client";

import { useId, useState } from "react";

// Shared by login/signup/update-password — a show/hide toggle so someone
// typing carefully on a phone (or just unsure they typed it right) can
// check before submitting, instead of only finding out after "Correo o
// contraseña incorrectos".
export function PasswordField({
  label,
  name,
  autoComplete,
  minLength,
}: {
  label?: string;
  name: string;
  autoComplete: "current-password" | "new-password";
  minLength?: number;
}) {
  const [visible, setVisible] = useState(false);
  const id = useId();

  return (
    <div>
      {label && (
        <label
          htmlFor={id}
          className="mb-1 block font-body text-xs uppercase tracking-[0.14em] text-ciruela/50"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={id}
          required
          name={name}
          type={visible ? "text" : "password"}
          minLength={minLength}
          autoComplete={autoComplete}
          className="w-full rounded-lg border border-ciruela/20 bg-hueso px-3 py-2 pr-16 font-body text-sm text-ciruela focus:outline-none focus:ring-1 focus:ring-ciruela/40"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-0 right-0 px-3 font-body text-xs text-ciruela/50 hover:text-ciruela"
        >
          {visible ? "Ocultar" : "Mostrar"}
        </button>
      </div>
    </div>
  );
}
