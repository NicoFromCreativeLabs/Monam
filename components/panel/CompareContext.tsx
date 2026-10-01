"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export const COMPARE_OPTIONS = ["Mes anterior", "Mismo mes año anterior", "Objetivo"] as const;

export type CompareTo = (typeof COMPARE_OPTIONS)[number];

const CompareContext = createContext<{
  compareTo: CompareTo;
  setCompareTo: (c: CompareTo) => void;
} | null>(null);

// Same reasoning as PeriodContext for "Periodo": "Comparar con" used to be
// GlobalFilterBar's own local, disconnected dropdown state (client spec:
// "the point is that the chrome is consistently present, not that switching
// them actually changes data") — but now that every KPI's deltaLabel is
// computed live from real Local/Periodo-scoped figures, leaving the
// comparison baseline decorative reads as broken the same way Local and
// Periodo did before they were lifted. Shared here so any page can read
// which baseline ("vs. mes anterior" / "vs. mismo mes año anterior" /
// "vs. objetivo") to compute its deltas against.
export function CompareProvider({ children }: { children: ReactNode }) {
  const [compareTo, setCompareTo] = useState<CompareTo>("Mes anterior");
  return (
    <CompareContext.Provider value={{ compareTo, setCompareTo }}>{children}</CompareContext.Provider>
  );
}

export function useCompare() {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error("useCompare must be used within CompareProvider");
  return ctx;
}
