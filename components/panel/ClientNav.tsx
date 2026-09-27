"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CLIENT } from "@/lib/mock-data";
import { UserMenu } from "./UserMenu";
import { useScrollEdgeFade } from "./useScrollEdgeFade";

const LINKS = [
  { href: "/my", label: "Inicio" },
  { href: "/my/book", label: "Reservar" },
  { href: "/my/appointments", label: "Mi rutina" },
  { href: "/my/skin-id", label: "Mi Skin ID" },
  { href: "/my/packages", label: "Paquetes" },
];

// Less-frequent account settings live in the profile menu instead of the
// main nav, to keep the primary tab strip short and scannable. Purchases
// used to be its own entry here — folded into "Mi rutina" instead (spec:
// routine + purchase history + recommendations belong in one place).
const PROFILE_LINKS = [
  { href: "/my/preferences", label: "Preferencias" },
  { href: "/my/consent", label: "Centro de consentimiento" },
  { href: "/my/payment", label: "Métodos de pago" },
];

export function ClientNav() {
  const pathname = usePathname();
  const { ref, showLeft, showRight } = useScrollEdgeFade<HTMLElement>();
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
      <div className="relative">
        <nav ref={ref} className="mx-auto flex max-w-[1000px] gap-1 overflow-x-auto px-6 pb-3">
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
        {showLeft && (
          <div className="pointer-events-none absolute inset-y-0 bottom-3 left-0 w-8 bg-gradient-to-r from-hueso to-transparent" />
        )}
        {showRight && (
          <div className="pointer-events-none absolute inset-y-0 bottom-3 right-0 w-8 bg-gradient-to-l from-hueso to-transparent" />
        )}
      </div>
    </header>
  );
}
