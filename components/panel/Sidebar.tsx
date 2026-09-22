"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePanelNav } from "./PanelNavContext";

export type NavItem = {
  href: string;
  label: string;
  disabled?: boolean; // Phase 2 module, not in Fase 1
};

export type NavSection = {
  heading?: string;
  items: NavItem[];
};

export function Sidebar({
  sections,
  brandHref,
}: {
  sections: NavSection[];
  brandHref: string;
}) {
  const pathname = usePathname();
  const { open, close } = usePanelNav();

  const content = (
    <>
      <div className="flex items-center justify-between">
        <Link href={brandHref} className="font-display text-lg tracking-[0.12em] text-ciruela">
          MONÂM
        </Link>
        <button
          onClick={close}
          aria-label="Cerrar menú"
          className="flex h-8 w-8 items-center justify-center rounded-full text-ciruela lg:hidden"
        >
          ✕
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-6">
        {sections.map((section, i) => (
          <div key={section.heading ?? i}>
            {section.heading && (
              <p className="mb-2 font-body text-[11px] uppercase tracking-[0.16em] text-ciruela/40">
                {section.heading}
              </p>
            )}
            <ul className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const active = pathname === item.href;
                if (item.disabled) {
                  return (
                    <li key={item.href}>
                      <span className="flex items-center justify-between rounded-lg px-3 py-2 font-body text-sm text-ciruela/30">
                        {item.label}
                        <span className="rounded-full bg-ciruela/5 px-2 py-0.5 text-[10px] text-ciruela/40">
                          Fase 2
                        </span>
                      </span>
                    </li>
                  );
                }
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={close}
                      className={`block rounded-lg px-3 py-2 font-body text-sm transition-colors ${
                        active
                          ? "bg-ciruela text-hueso"
                          : "text-ciruela/75 hover:bg-ciruela/8"
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </>
  );

  return (
    <>
      {/* Desktop — static column */}
      <aside className="hidden w-64 shrink-0 flex-col gap-8 border-r border-ciruela/10 bg-hueso px-6 py-8 lg:flex">
        {content}
      </aside>

      {/* Mobile — off-canvas drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Cerrar menú"
            onClick={close}
            className="absolute inset-0 bg-ciruela/40"
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col gap-8 overflow-y-auto bg-hueso px-6 py-8 shadow-xl">
            {content}
          </aside>
        </div>
      )}
    </>
  );
}
