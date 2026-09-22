"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CLIENT } from "@/lib/mock-data";
import { UserMenu } from "./UserMenu";

const LINKS = [
  { href: "/my", label: "Inicio" },
  { href: "/my/book", label: "Reservar" },
  { href: "/my/appointments", label: "Mis citas" },
  { href: "/my/skin-id", label: "Mi Skin ID" },
  { href: "/my/packages", label: "Paquetes" },
];

// Less-frequent account settings live in the profile menu instead of the
// main nav, to keep the primary tab strip short and scannable.
const PROFILE_LINKS = [
  { href: "/my/preferences", label: "Preferencias" },
  { href: "/my/purchases", label: "Compras" },
  { href: "/my/consent", label: "Centro de consentimiento" },
  { href: "/my/payment", label: "Métodos de pago" },
];

export function ClientNav() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-ciruela/10 bg-hueso">
      <div className="mx-auto flex max-w-[1000px] items-center justify-between px-6 py-4">
        <Link href="/my" className="font-display text-lg tracking-[0.12em] text-ciruela">
          MONÂM
        </Link>
        <UserMenu
          userName={CLIENT.name}
          userRole={CLIENT.role}
          profileHref="/my/profile"
          links={PROFILE_LINKS}
        />
      </div>
      <nav className="mx-auto flex max-w-[1000px] gap-1 overflow-x-auto px-6 pb-3">
        {LINKS.map((l) => {
          const active = pathname === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 font-body text-xs ${
                active ? "bg-ciruela text-hueso" : "text-ciruela/60 hover:bg-ciruela/8"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
