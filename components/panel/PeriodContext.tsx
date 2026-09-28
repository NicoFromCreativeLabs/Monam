"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export const PERIOD_OPTIONS = [
  "Mes en curso",
  "Mes anterior",
  "Trimestre en curso",
  "Año en curso",
] as const;

export type Period = (typeof PERIOD_OPTIONS)[number];

const PeriodContext = createContext<{
  period: Period;
  setPeriod: (p: Period) => void;
} | null>(null);

// Same reasoning as LocationsContext for "Local": GlobalFilterBar's
// "Periodo" chip used to be local-only decorative state (client spec: "the
// point is that the chrome is consistently present, not that switching them
// actually changes data"), but sitting right next to a page that titles
// itself by month (P&L's "Agosto 2026" heading) made an unchanged label read
// as broken once picked. Lifted to shared state so any page can read which
// period is selected — "Comparar con" and "Objetivo" stay local/decorative,
// since nothing on any page claims to reflect them.
export function PeriodProvider({ children }: { children: ReactNode }) {
  const [period, setPeriod] = useState<Period>("Mes en curso");
  return (
    <PeriodContext.Provider value={{ period, setPeriod }}>{children}</PeriodContext.Provider>
  );
}

export function usePeriod() {
  const ctx = useContext(PeriodContext);
  if (!ctx) throw new Error("usePeriod must be used within PeriodProvider");
  return ctx;
}
