"use client";

import { useActionState } from "react";
import { updatePassword, type ActionState } from "@/lib/actions/auth";

export function UpdatePasswordForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(updatePassword, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="mb-1 block font-body text-xs uppercase tracking-[0.14em] text-ciruela/50">
          Nueva contraseña
        </label>
        <input
          required
          name="password"
          type="password"
          minLength={8}
          autoComplete="new-password"
          className="w-full rounded-lg border border-ciruela/20 bg-hueso px-3 py-2 font-body text-sm text-ciruela focus:outline-none focus:ring-1 focus:ring-ciruela/40"
        />
      </div>
      <div>
        <label className="mb-1 block font-body text-xs uppercase tracking-[0.14em] text-ciruela/50">
          Confirmar contraseña
        </label>
        <input
          required
          name="confirmPassword"
          type="password"
          minLength={8}
          autoComplete="new-password"
          className="w-full rounded-lg border border-ciruela/20 bg-hueso px-3 py-2 font-body text-sm text-ciruela focus:outline-none focus:ring-1 focus:ring-ciruela/40"
        />
      </div>

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
