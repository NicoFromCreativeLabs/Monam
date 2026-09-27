"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { ANOMALY_FLAGS as SEED_ANOMALIES } from "@/lib/mock-data";

export type AnomalyStatus = "Abierto" | "Resuelto";
export interface AnomalyFlag {
  id: string;
  type: string;
  detail: string;
  status: AnomalyStatus;
}

const AnomaliesContext = createContext<{
  anomalies: AnomalyFlag[];
  addAnomaly: (type: string, detail: string) => void;
  resolveAnomaly: (id: string) => void;
} | null>(null);

// Shared log so anomalies detected anywhere in the app — a discount or
// refund approved above the Settings threshold, a manual commission
// reassignment at checkout, an inventory count corrected downward — all
// land in the same list Control > Anomalías shows, instead of that tab
// only ever displaying the 3 hand-written seed rows it shipped with.
export function AnomaliesProvider({ children }: { children: ReactNode }) {
  const [anomalies, setAnomalies] = useState<AnomalyFlag[]>(
    SEED_ANOMALIES.map((a) => ({ ...a })) as AnomalyFlag[],
  );

  function addAnomaly(type: string, detail: string) {
    setAnomalies((prev) => [{ id: `flag-${Date.now()}`, type, detail, status: "Abierto" }, ...prev]);
  }

  function resolveAnomaly(id: string) {
    setAnomalies((prev) => prev.map((a) => (a.id === id ? { ...a, status: "Resuelto" } : a)));
  }

  return (
    <AnomaliesContext.Provider value={{ anomalies, addAnomaly, resolveAnomaly }}>
      {children}
    </AnomaliesContext.Provider>
  );
}

export function useAnomalies() {
  const ctx = useContext(AnomaliesContext);
  if (!ctx) throw new Error("useAnomalies must be used within AnomaliesProvider");
  return ctx;
}
