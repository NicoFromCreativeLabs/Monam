"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

// Mobile drawer state for the Sidebar — spec §4 requires the same data to
// render at phone/tablet/desktop density, which for Admin/Staff means the
// fixed sidebar collapses to an off-canvas drawer below the lg breakpoint.
const PanelNavContext = createContext<{
  open: boolean;
  toggle: () => void;
  close: () => void;
} | null>(null);

export function PanelNavProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <PanelNavContext.Provider
      value={{ open, toggle: () => setOpen((v) => !v), close: () => setOpen(false) }}
    >
      {children}
    </PanelNavContext.Provider>
  );
}

export function usePanelNav() {
  const ctx = useContext(PanelNavContext);
  if (!ctx) throw new Error("usePanelNav must be used within PanelNavProvider");
  return ctx;
}
