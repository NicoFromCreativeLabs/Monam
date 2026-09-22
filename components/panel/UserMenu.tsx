"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function UserMenu({
  userName,
  userRole,
  profileHref,
  links = [],
}: {
  userName: string;
  userRole: string;
  profileHref: string;
  links?: { label: string; href: string }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-full border-l border-ciruela/15 pl-2 min-[860px]:pl-4"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ciruela font-body text-xs text-hueso">
          {initials}
        </div>
        <div className="hidden text-left leading-tight min-[860px]:block">
          <p className="font-body text-xs text-ciruela">{userName}</p>
          <p className="font-body text-[11px] text-ciruela/50">{userRole}</p>
        </div>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-2 w-52 rounded-xl border border-ciruela/15 bg-hueso p-1.5 shadow-lg"
        >
          <div className="border-b border-ciruela/10 px-3 py-2 min-[860px]:hidden">
            <p className="font-body text-xs text-ciruela">{userName}</p>
            <p className="font-body text-[11px] text-ciruela/50">{userRole}</p>
          </div>
          <button
            role="menuitem"
            onClick={() => {
              setOpen(false);
              router.push(profileHref);
            }}
            className="block w-full rounded-lg px-3 py-2 text-left font-body text-sm text-ciruela hover:bg-ciruela/8"
          >
            Editar perfil
          </button>
          {links.length > 0 && (
            <div className="my-1 border-t border-ciruela/10" />
          )}
          {links.map((l) => (
            <button
              key={l.href}
              role="menuitem"
              onClick={() => {
                setOpen(false);
                router.push(l.href);
              }}
              className="block w-full rounded-lg px-3 py-2 text-left font-body text-sm text-ciruela hover:bg-ciruela/8"
            >
              {l.label}
            </button>
          ))}
          {links.length > 0 && (
            <div className="my-1 border-t border-ciruela/10" />
          )}
          <button
            role="menuitem"
            onClick={() => {
              setOpen(false);
              router.push("/login");
            }}
            className="block w-full rounded-lg px-3 py-2 text-left font-body text-sm text-crepe hover:bg-crepe/10"
          >
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
