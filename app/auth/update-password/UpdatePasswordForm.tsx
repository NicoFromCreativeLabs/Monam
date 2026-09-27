"use client";

import { useActionState } from "react";
import { updatePassword, type ActionState } from "@/lib/actions/auth";
import { PasswordField } from "@/components/panel/PasswordField";

export function UpdatePasswordForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(updatePassword, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <PasswordField
        label="Nueva contraseña"
        name="password"
        autoComplete="new-password"
        minLength={8}
      />
      <PasswordField
        label="Confirmar contraseña"
        name="confirmPassword"
        autoComplete="new-password"
        minLength={8}
      />

      {state?.error && (
        <p className="rounded-lg bg-[#b3392f]/10 px-3 py-2 font-body text-xs text-[#b3392f]">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-ciruela px-5 py-3 font-body text-sm text-hueso disabled:opacity-50"
      >
        {pending ? "Guardando..." : "Guardar contraseña"}
      </button>
    </form>
  );
}
