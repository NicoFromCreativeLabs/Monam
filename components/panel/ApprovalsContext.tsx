"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { APPROVALS_QUEUE as SEED_APPROVALS, type ApprovalStatus } from "@/lib/mock-data";

export type ApprovalRecord = (typeof SEED_APPROVALS)[number];

const ApprovalsContext = createContext<{
  approvals: ApprovalRecord[];
  decide: (id: string, status: Extract<ApprovalStatus, "Aprobado" | "Rechazado">) => void;
} | null>(null);

// Same pattern as LocationsContext/ProtocolsContext — one shared list so
// the dashboard's "Aprobaciones pendientes" widget and the full Control >
// Aprobaciones queue read (and decide on) the same records, instead of each
// holding its own frozen copy. Found via an admin-panel review: the
// dashboard's Aprobar/Rechazar buttons did nothing at all because they
// read a completely separate, static array from the real queue.
export function ApprovalsProvider({ children }: { children: ReactNode }) {
  const [approvals, setApprovals] = useState<ApprovalRecord[]>(SEED_APPROVALS.map((a) => ({ ...a })));

  function decide(id: string, status: Extract<ApprovalStatus, "Aprobado" | "Rechazado">) {
    setApprovals((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
  }

  return (
    <ApprovalsContext.Provider value={{ approvals, decide }}>{children}</ApprovalsContext.Provider>
  );
}

export function useApprovals() {
  const ctx = useContext(ApprovalsContext);
  if (!ctx) throw new Error("useApprovals must be used within ApprovalsProvider");
  return ctx;
}
