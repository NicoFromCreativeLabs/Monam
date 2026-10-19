"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCurrentAppUser } from "./CurrentAppUserContext";
import { Sidebar, type NavSection } from "./Sidebar";
import { useStaffRole } from "./StaffRoleContext";

// Vendedor IA — one panel, two role variants that show/hide modules (spec §7.1).
const FRONT_DESK_ITEMS: NavSection[] = [
  {
    items: [
      { href: "/staff", label: "Hoy" },
      { href: "/staff/shift", label: "Mi turno" },
      { href: "/staff/check-in", label: "Check-in" },
      { href: "/staff/checkout", label: "Cobro / POS" },
      { href: "/staff/refunds", label: "Reembolsos" },
    ],
  },
  {
    heading: "Operación",
    items: [
      { href: "/staff/inventory", label: "Inventario" },
      { href: "/staff/open-product", label: "Abrir producto" },
    ],
  },
  {
    heading: "Mi cuenta",
    items: [
      { href: "/staff/schedule", label: "Mi horario" },
      { href: "/staff/commission", label: "Mi comisión", disabled: true },
    ],
  },
];

const ESTHETICIAN_ITEMS: NavSection[] = [
  {
    items: [
      { href: "/staff", label: "Hoy" },
      { href: "/staff/shift", label: "Mi turno" },
    ],
  },
  {
    heading: "Clientes",
    items: [
      { href: "/staff/clients", label: "Perfil del cliente" },
      { href: "/staff/treatment-record", label: "Registro de tratamiento" },
      { href: "/staff/open-product", label: "Abrir producto" },
      { href: "/staff/retail-tags", label: "Recomendaciones de compra" },
    ],
  },
  {
    heading: "Mi cuenta",
    items: [
      { href: "/staff/schedule", label: "Mi horario" },
      { href: "/staff/commission", label: "Mi comisión", disabled: true },
    ],
  },
];

// Before checking in, a Front Desk / Esthetician login only has these.
const CHECK_IN_ONLY: NavSection[] = [{ items: [{ href: "/staff/shift", label: "Mi turno" }] }];
const OPEN_WITHOUT_SHIFT = ["/staff/shift", "/staff/profile"];

export function StaffSidebarShell({ children }: { children: ReactNode }) {
  const { role } = useStaffRole();
  const currentUser = useCurrentAppUser();
  const pathname = usePathname();
  const blocked = currentUser.onShift === false && !OPEN_WITHOUT_SHIFT.some((p) => pathname.startsWith(p));
  const sections = currentUser.onShift === false ? CHECK_IN_ONLY : role === "Front Desk" ? FRONT_DESK_ITEMS : ESTHETICIAN_ITEMS;

  return (
    <div className="flex min-h-full flex-1">
      <Sidebar sections={sections} brandHref="/staff" />
      <div className="flex min-w-0 flex-1 flex-col">
        {blocked ? (
          <div className="flex flex-1 items-center justify-center px-4 py-12">
            <div className="max-w-sm rounded-[18px] border border-ciruela/10 bg-hueso px-6 py-8 text-center">
              <p className="font-display text-xl text-ciruela">Registra tu entrada</p>
              <p className="mt-2 font-body text-sm text-ciruela/60">
                Para empezar a trabajar hoy, primero registra tu entrada.
              </p>
              <Link
                href="/staff/shift"
                className="mt-5 inline-block rounded-full bg-ciruela px-5 py-2.5 font-body text-sm text-hueso"
              >
                Ir a Mi turno
              </Link>
            </div>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
