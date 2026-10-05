"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getSwitchableRole } from "@/lib/actions/auth";

const VIEWS = [
  { match: "/admin", href: "/admin", label: "Admin" },
  { match: "/staff", href: "/staff?role=front-desk", label: "Vendedor" },
  { match: "/staff", href: "/staff?role=esthetician", label: "Esteticista" },
  { match: "/my", href: "/my", label: "Cliente" },
] as const;

// Owner/Clinic Manager only — every destination's own gate already lets
// those two roles through, so this is just a navigation shortcut, not a new
// authorization path (see getSwitchableRole in lib/actions/auth.ts).
export function ViewSwitcher() {
  const [role, setRole] = useState<"OWNER" | "CLINIC_MANAGER" | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    getSwitchableRole().then(setRole);
  }, []);

  if (!role) return null;

  const current = VIEWS.find((v) => pathname.startsWith(v.match))?.label ?? "Admin";

  return (
    <select
      value={current}
      onChange={(e) => {
        const next = VIEWS.find((v) => v.label === e.target.value);
        if (next) router.push(next.href);
      }}
      aria-label="Cambiar de vista"
      className="rounded-full border border-ciruela/20 bg-hueso px-3 py-1.5 font-body text-xs text-ciruela"
    >
      {VIEWS.map((v) => (
        <option key={v.label} value={v.label}>
          {v.label}
        </option>
      ))}
    </select>
  );
}
