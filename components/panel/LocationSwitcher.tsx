"use client";

import { useEffect, useRef, useState } from "react";
import { useLocations } from "./LocationsContext";

// Dropdown, not a fixed pill toggle — scales to any number of future
// locations without a layout rewrite. `multiple` enables a checkbox
// multiselect (+ "todas las sucursales") for Admin; single-select (radio-
// like) for Staff, whose session is scoped to one location at a time
// (spec §2). Reads and writes the shared selection in LocationsContext —
// not just its own local state — so other screens (Inventory, and future
// consumers) can filter by whatever location(s) are picked here.
export function LocationSwitcher({ multiple = false }: { multiple?: boolean }) {
  const { locations, selectedNames: selected, setSelectedNames: setSelected } = useLocations();
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

  function toggle(name: string) {
    if (!multiple) {
      setSelected([name]);
      setOpen(false);
      return;
    }
    const next = selected.includes(name)
      ? selected.filter((n) => n !== name)
      : [...selected, name];
    setSelected(next.length === 0 ? [name] : next); // keep at least one selected
  }

  const allSelected = multiple && selected.length === activeLocations.length;

  function selectAll() {
    setSelected(activeLocations.map((l) => l.name));
  }

  const label = allSelected && activeLocations.length > 1
    ? "Todas las sucursales"
    : selected.length > 1
      ? `${selected.length} sucursales`
      : selected[0];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex items-center gap-1.5 rounded-full border border-ciruela/20 px-3 py-1.5 font-body text-xs text-ciruela hover:bg-ciruela/5"
      >
        {label}
        <span className="text-[10px] text-ciruela/40">▾</span>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 top-full z-30 mt-2 w-56 rounded-xl border border-ciruela/15 bg-hueso p-1.5 shadow-lg"
        >
          {multiple && (
            <button
              onClick={selectAll}
              className="mb-1 flex w-full items-center justify-between rounded-lg px-3 py-2 font-body text-xs text-ciruela hover:bg-ciruela/8"
            >
              Todas las sucursales
              {allSelected && <span>✓</span>}
            </button>
          )}
          <ul className="space-y-0.5">
            {locations.map((l) => {
              const isSelected = selected.includes(l.name);
              return (
                <li key={l.id}>
                  <button
                    disabled={!l.isActive}
                    onClick={() => toggle(l.name)}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 font-body text-xs text-ciruela hover:bg-ciruela/8 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                  >
                    <span className="flex items-center gap-2">
                      {multiple && (
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] ${
                            isSelected
                              ? "border-ciruela bg-ciruela text-hueso"
                              : "border-ciruela/30"
                          }`}
                        >
                          {isSelected && "✓"}
                        </span>
                      )}
                      {l.name}
                    </span>
                    {!l.isActive ? (
                      <span className="text-[10px] text-ciruela/40">Próximamente</span>
                    ) : (
                      !multiple && isSelected && <span>✓</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
