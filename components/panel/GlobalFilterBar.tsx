"use client";

import { useEffect, useRef, useState } from "react";

// Persistent filter chrome for Panel + every Análisis sub-page (client spec:
// "the point is that the chrome is consistently present, not that switching
// them actually changes data"). Local dropdown state only — no real
// filtering, no shared context — matching prototype fidelity.
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

export function GlobalFilterBar() {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-ciruela/10 bg-hueso-deep/40 px-4 py-3 min-[860px]:px-8">
      <FilterDropdown
        prefix="Local"
        defaultValue="Consolidado"
        options={["Consolidado", "Roma Norte", "Prado Norte"]}
      />
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
