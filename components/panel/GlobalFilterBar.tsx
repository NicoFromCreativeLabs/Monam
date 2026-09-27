"use client";

import { useEffect, useRef, useState } from "react";
import { useLocations } from "./LocationsContext";

// Persistent filter chrome for Panel + every Análisis sub-page (client spec:
// "the point is that the chrome is consistently present, not that switching
// them actually changes data"). Periodo/Comparar con/Objetivo stay local
// dropdown state only, matching that prototype-fidelity call — but "Local"
// found a real, confusing bug once P&L actually started scoping to a
// location: this exact-looking chip sat right next to the real location
// switcher in the top bar and silently did nothing when changed, which
// reads as broken once one location control on the page is real and the
// other isn't. It now reads and writes the same LocationsContext every
// other Admin screen uses, instead of a second, disconnected local value.
function FilterDropdown({
  prefix,
  options,
  defaultValue,
}: {
  prefix: string;
  options: string[];
  defaultValue: string;
}) {
  const [value, setValue] = useState(defaultValue);
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
        <span className="text-ciruela/50">{prefix}:</span>
        <span>{value}</span>
        <span className="text-[10px] text-ciruela/40">▾</span>
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute left-0 top-full z-30 mt-2 w-48 rounded-xl border border-ciruela/15 bg-hueso p-1.5 shadow-lg"
        >
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => {
                setValue(opt);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 font-body text-xs text-ciruela hover:bg-ciruela/8"
            >
              {opt}
              {opt === value && <span>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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

export function GlobalFilterBar() {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-ciruela/10 bg-hueso-deep/40 px-4 py-3 min-[860px]:px-8">
      <LocalFilterDropdown />
      <FilterDropdown
        prefix="Periodo"
        defaultValue="Mes en curso"
        options={["Mes en curso", "Mes anterior", "Trimestre en curso", "Año en curso"]}
      />
      <FilterDropdown
        prefix="Comparar con"
        defaultValue="Mes anterior"
        options={["Mes anterior", "Mismo mes año anterior", "Objetivo"]}
      />
      <span className="flex items-center gap-1.5 rounded-full border border-ciruela/10 bg-ciruela/5 px-3 py-1.5 font-body text-xs text-ciruela/70">
        <span className="text-ciruela/50">Objetivo:</span> Metas 2026
      </span>
    </div>
  );
}
