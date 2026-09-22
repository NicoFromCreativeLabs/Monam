"use client";

import type { ReactNode } from "react";
import { Sidebar, type NavSection } from "./Sidebar";
import { useStaffRole } from "./StaffRoleContext";

// Vendedor IA — one panel, two role variants that show/hide modules (spec §7.1).
const FRONT_DESK_ITEMS: NavSection[] = [
  {
    items: [
      { href: "/staff", label: "Hoy" },
      { href: "/staff/check-in", label: "Check-in" },
      { href: "/staff/checkout", label: "Cobro / POS" },
    ],
  },
  {
    heading: "Operación",
    items: [{ href: "/staff/inventory", label: "Inventario" }],
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
    items: [{ href: "/staff", label: "Hoy" }],
  },
  {
    heading: "Clientes",
    items: [
      { href: "/staff/clients", label: "Perfil del cliente" },
      { href: "/staff/treatment-record", label: "Registro de tratamiento" },
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

export function StaffSidebarShell({ children }: { children: ReactNode }) {
  const { role } = useStaffRole();
  const sections = role === "Front Desk" ? FRONT_DESK_ITEMS : ESTHETICIAN_ITEMS;

  return (
    <div className="flex min-h-full flex-1">
      <Sidebar sections={sections} brandHref="/staff" />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
