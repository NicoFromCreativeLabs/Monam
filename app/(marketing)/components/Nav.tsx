"use client";

import { useEffect, useState } from "react";
import type { Content, Lang } from "@/lib/content";
import { Button } from "./Button";

const LANG_LABEL: Record<Lang, string> = { en: "EN", es: "ES" };

export function Nav({
  content,
  lang,
  onLangChange,
}: {
  content: Content;
  lang: Lang;
  onLangChange: (lang: Lang) => void;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > window.innerHeight * 0.75);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { href: "#top", label: content.nav.estudio },
    { href: "#treatments", label: content.nav.treatments },
    { href: "#philosophy", label: content.nav.standard },
    { href: "#visit", label: content.nav.visit },
  ];

  const ink = scrolled ? "text-ciruela" : "text-hueso";
  const inkMuted = scrolled ? "text-ciruela/75" : "text-hueso/80";

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-colors duration-300 ${
        scrolled ? "bg-hueso/95 backdrop-blur shadow-[0_1px_0_rgba(63,2,21,0.08)]" : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-[1300px] items-center justify-between px-6 py-5 min-[860px]:px-10">
        <a href="#top" aria-label="MONÂM" className="flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={scrolled ? "/brand/monam-badge.svg" : "/brand/monam-wordmark.svg"}
            alt="MONÂM"
            className={scrolled ? "h-11 w-auto" : "h-6 w-auto"}
          />
        </a>

        <nav className="hidden items-center gap-8 min-[900px]:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className={`font-body text-[11px] uppercase tracking-[0.16em] transition-colors hover:opacity-100 ${inkMuted}`}
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-5 min-[900px]:flex">
          <div
            className={`flex overflow-hidden rounded-full border font-body text-[10px] transition-colors ${
              scrolled ? "border-ciruela/25" : "border-hueso/35"
            }`}
          >
            {(["en", "es"] as Lang[]).map((l) => (
              <button
                key={l}
                onClick={() => onLangChange(l)}
                aria-pressed={lang === l}
                className={`px-2 py-1 transition-colors ${
                  lang === l
                    ? scrolled
                      ? "bg-ciruela text-hueso"
                      : "bg-hueso text-ciruela"
                    : inkMuted
                }`}
              >
                {LANG_LABEL[l]}
              </button>
            ))}
          </div>

          <a
            href="#treatments"
            aria-label="Buscar tratamientos"
            className={`transition-colors ${ink}`}
          >
            <SearchIcon className="h-4 w-4" />
          </a>

          <Button href="#booking" variant="outline" inverted={!scrolled} className="!px-6 !py-2.5">
            {content.nav.bookNow}
          </Button>
        </div>

        <div className="flex items-center gap-3 min-[900px]:hidden">
          <a
            href="#booking"
            className={`flex min-h-9 items-center justify-center rounded-full border px-4 font-body text-xs transition-colors ${
              scrolled ? "border-ciruela text-ciruela" : "border-hueso text-hueso"
            }`}
          >
            {content.nav.bookNow}
          </a>
          <button
            onClick={() => setMobileOpen((v) => !v)}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
            className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${
              scrolled ? "border-ciruela text-ciruela" : "border-hueso text-hueso"
            }`}
          >
            {mobileOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="flex flex-col gap-1 border-t border-ciruela/10 bg-hueso px-8 py-4 min-[900px]:hidden">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setMobileOpen(false)}
              className="py-2 font-body text-sm text-ciruela"
            >
              {l.label}
            </a>
          ))}
        </nav>
      )}
    </header>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" className={className}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M20 20l-5-5" strokeLinecap="round" />
    </svg>
  );
}
