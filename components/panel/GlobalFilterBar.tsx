"use client";

import { useEffect, useRef, useState } from "react";
import { useLocations } from "./LocationsContext";
import { usePeriod, PERIOD_OPTIONS } from "./PeriodContext";
import { useCompare, COMPARE_OPTIONS } from "./CompareContext";

// Persistent filter chrome for Panel + every Análisis sub-page. Originally
// per client spec, "the point is that the chrome is consistently present,
// not that switching them actually changes data" — but each chip has since
// been found to read as broken once the page next to it went real: Local
// first (this exact-looking chip sat next to the real location switcher and
// did nothing), then Periodo (P&L's own title reads by period), and now
// Comparar con, once every KPI's deltaLabel started computing live off
// Local/Periodo. Objetivo alone stays decorative — nothing on any page
// claims to let the target itself be edited from here (that's
// Configuración → Metas).

// Same visual shell as FilterDropdown above, but backed by the real
// LocationsContext instead of its own local value: "Consolidado" selects
// every active location, and picking one location selects just that one —
// the same end state the top bar's own multi-select switcher can reach,
// just via a single-choice affordance to match this bar's other chips.
function LocalFilterDropdown() {
  const { locations, selectedNames, setSelectedNames } = useLocations();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const activeLocations = locations.filter((l) => l.isActive);
  const isConsolidated = selectedNames.length > 1;
  const label = isConsolidated ? "Consolidado" : selectedNames[0];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex items-center gap-1.5 rounded-full border border-ciruela/15 bg-hueso px-3 py-1.5 font-body text-xs text-ciruela hover:bg-ciruela/5"
      >
        <span className="text-ciruela/50">Local:</span>
        <span>{label}</span>
        <span className="text-[10px] text-ciruela/40">▾</span>
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute left-0 top-full z-30 mt-2 w-48 rounded-xl border border-ciruela/15 bg-hueso p-1.5 shadow-lg"
        >
          <button
            onClick={() => {
              setSelectedNames(activeLocations.map((l) => l.name));
              setOpen(false);
            }}
            className="flex w-full items-center justify-between rounded-lg px-3 py-2 font-body text-xs text-ciruela hover:bg-ciruela/8"
          >
            Consolidado
            {isConsolidated && <span>✓</span>}
          </button>
          {locations.map((l) => (
            <button
              key={l.id}
              disabled={!l.isActive}
              onClick={() => {
                setSelectedNames([l.name]);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 font-body text-xs text-ciruela hover:bg-ciruela/8 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <span>{l.name}</span>
              {!l.isActive ? (
                <span className="text-[10px] text-ciruela/40">Próximamente</span>
              ) : (
                !isConsolidated && selectedNames[0] === l.name && <span>✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Same shell as FilterDropdown, but backed by the shared PeriodContext so a
// page like P&L can title itself by whichever period is actually selected
// instead of always reading "Agosto 2026".
function PeriodFilterDropdown() {
  const { period, setPeriod } = usePeriod();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex items-center gap-1.5 rounded-full border border-ciruela/15 bg-hueso px-3 py-1.5 font-body text-xs text-ciruela hover:bg-ciruela/5"
      >
        <span className="text-ciruela/50">Periodo:</span>
        <span>{period}</span>
        <span className="text-[10px] text-ciruela/40">▾</span>
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute left-0 top-full z-30 mt-2 w-48 rounded-xl border border-ciruela/15 bg-hueso p-1.5 shadow-lg"
        >
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => {
                setPeriod(opt);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 font-body text-xs text-ciruela hover:bg-ciruela/8"
            >
              {opt}
              {opt === period && <span>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Same shell as PeriodFilterDropdown, backed by the shared CompareContext.
function CompareFilterDropdown() {
  const { compareTo, setCompareTo } = useCompare();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex items-center gap-1.5 rounded-full border border-ciruela/15 bg-hueso px-3 py-1.5 font-body text-xs text-ciruela hover:bg-ciruela/5"
      >
        <span className="text-ciruela/50">Comparar con:</span>
        <span>{compareTo}</span>
        <span className="text-[10px] text-ciruela/40">▾</span>
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute left-0 top-full z-30 mt-2 w-48 rounded-xl border border-ciruela/15 bg-hueso p-1.5 shadow-lg"
        >
          {COMPARE_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => {
                setCompareTo(opt);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 font-body text-xs text-ciruela hover:bg-ciruela/8"
            >
              {opt}
              {opt === compareTo && <span>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function GlobalFilterBar() {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-ciruela/10 bg-hueso-deep/40 px-4 py-3 min-[860px]:px-8">
      <LocalFilterDropdown />
      <PeriodFilterDropdown />
      <CompareFilterDropdown />
      <span className="flex items-center gap-1.5 rounded-full border border-ciruela/10 bg-ciruela/5 px-3 py-1.5 font-body text-xs text-ciruela/70">
        <span className="text-ciruela/50">Objetivo:</span> Metas 2026
      </span>
    </div>
  );
}
