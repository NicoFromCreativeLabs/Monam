"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signIn, type ActionState } from "@/lib/actions/auth";
import { PasswordField } from "@/components/panel/PasswordField";

// Real Supabase Auth sign-in — one form for every role. Where it lands
// (/admin, /staff, or /my) is decided server-side in the signIn action from
// the AppUser/Client row, never from anything the client chooses (spec §2:
// individual named logins, never a role picker).
export default function LoginPage() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(signIn, undefined);

  return (
    <main className="flex-1 flex items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-display text-2xl tracking-[0.1em] text-ciruela">MONÂM</h1>
          <p className="mt-1 font-body text-sm text-ciruela/60">Iniciar sesión</p>
        </div>

        <form action={formAction} className="space-y-4">
          <div>
            <label className="mb-1 block font-body text-xs uppercase tracking-[0.14em] text-ciruela/50">
              Correo
            </label>
            <input
              required
              name="email"
              type="email"
              autoComplete="email"
              className="w-full rounded-lg border border-ciruela/20 bg-hueso px-3 py-2 font-body text-sm text-ciruela focus:outline-none focus:ring-1 focus:ring-ciruela/40"
            />
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="block font-body text-xs uppercase tracking-[0.14em] text-ciruela/50">
                Contraseña
              </label>
              <Link href="/forgot-password" className="font-body text-xs text-ciruela/60 underline">
                ¿Contraseña olvidada?
              </Link>
            </div>
            <PasswordField name="password" autoComplete="current-password" />
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
            {pending ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="mt-6 text-center font-body text-xs text-ciruela/50">
          ¿Eres clienta nueva?{" "}
          <Link href="/signup" className="text-ciruela underline">
            Crea tu cuenta
          </Link>
        </p>
      </div>
    </main>
  );
}
