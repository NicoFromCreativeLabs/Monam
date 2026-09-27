"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUpClient, type ActionState } from "@/lib/actions/auth";

// Client self-registration (spec §8.2: "account creation happens at the
// point of confirming a slot" — this is the standalone entry point for it;
// the booking flow can route here too). Staff/Admin accounts are never
// self-service — those are created by an Owner via Personal y horarios'
// invite flow (spec §2/§10: individual named logins, provisioned not
// open-registered).
export default function SignupPage() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(signUpClient, undefined);

  return (
    <main className="flex-1 flex items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-display text-2xl tracking-[0.1em] text-ciruela">MONÂM</h1>
          <p className="mt-1 font-body text-sm text-ciruela/60">Crear cuenta</p>
        </div>

        {state?.message ? (
          <p className="rounded-lg bg-oliva/10 px-4 py-3 text-center font-body text-sm text-oliva">
            {state.message}
          </p>
        ) : (
          <form action={formAction} className="space-y-4">
            <div>
              <label className="mb-1 block font-body text-xs uppercase tracking-[0.14em] text-ciruela/50">
                Nombre completo
              </label>
              <input
                required
                name="name"
                className="w-full rounded-lg border border-ciruela/20 bg-hueso px-3 py-2 font-body text-sm text-ciruela focus:outline-none focus:ring-1 focus:ring-ciruela/40"
              />
            </div>
            <div>
              <label className="mb-1 block font-body text-xs uppercase tracking-[0.14em] text-ciruela/50">
                WhatsApp
              </label>
              <input
                required
                name="phone"
                type="tel"
                placeholder="+52 55 1234 5678"
                className="w-full rounded-lg border border-ciruela/20 bg-hueso px-3 py-2 font-body text-sm text-ciruela placeholder:text-ciruela/40 focus:outline-none focus:ring-1 focus:ring-ciruela/40"
              />
            </div>
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
              <label className="mb-1 block font-body text-xs uppercase tracking-[0.14em] text-ciruela/50">
                Contraseña
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
              {pending ? "Creando cuenta..." : "Crear cuenta"}
            </button>
          </form>
        )}

        <p className="mt-6 text-center font-body text-xs text-ciruela/50">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="text-ciruela underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </main>
  );
}
