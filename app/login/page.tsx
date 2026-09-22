"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { OWNER, FRONT_DESK_STAFF, ESTHETICIAN_STAFF, CLIENT } from "@/lib/mock-data";

// Role-aware login — redirects to /admin, /staff, or /my per role (spec §4).
// No real auth yet (Supabase Auth wiring is backend work, not this pass) —
// this is a UI-accurate stand-in: real logins will be individually named and
// location-scoped (spec §2/§10), never a role picker like this.
// Front Desk and Esteticista are both "staff", landing on the same /staff
// shell — the query param just sets which of the two views it opens on.
const ROLES = [
  { role: "admin" as const, label: "Administración", who: OWNER.name, href: "/admin" },
  { role: "staff" as const, label: "Personal (Recepción)", who: FRONT_DESK_STAFF.name, href: "/staff" },
  {
    role: "esthetician" as const,
    label: "Personal (Esteticista)",
    who: ESTHETICIAN_STAFF.name,
    href: "/staff?role=esthetician",
  },
  { role: "client" as const, label: "Cliente", who: CLIENT.name, href: "/my" },
];

export default function LoginPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<(typeof ROLES)[number]["role"]>("client");

  const current = ROLES.find((r) => r.role === selected)!;

  return (
    <main className="flex-1 flex items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-display text-2xl tracking-[0.1em] text-ciruela">MONÂM</h1>
          <p className="mt-1 font-body text-sm text-ciruela/60">Iniciar sesión</p>
        </div>

        <div className="space-y-2">
          {ROLES.map((r) => (
            <button
              key={r.role}
              onClick={() => setSelected(r.role)}
              className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left font-body text-sm transition-colors ${
                selected === r.role
                  ? "border-ciruela bg-ciruela text-hueso"
                  : "border-ciruela/20 text-ciruela hover:bg-ciruela/5"
              }`}
            >
              <span>{r.label}</span>
              <span className={selected === r.role ? "text-hueso/70" : "text-ciruela/40"}>
                {r.who.split(" ")[0]}
              </span>
            </button>
          ))}
        </div>

        <button
          onClick={() => router.push(current.href)}
          className="mt-6 w-full rounded-full bg-ciruela px-5 py-3 font-body text-sm text-hueso"
        >
          Entrar como {current.who.split(" ")[0]}
        </button>

        <p className="mt-6 text-center font-body text-xs text-ciruela/40">
          Vista previa sin autenticación real — la integración con Supabase Auth es trabajo de
          backend pendiente.
        </p>
      </div>
    </main>
  );
}
