"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { APPROVALS_QUEUE as SEED_APPROVALS, type ApprovalStatus } from "@/lib/mock-data";
import { useBusinessRules } from "@/components/panel/BusinessRulesContext";
import { useAnomalies } from "@/components/panel/AnomaliesContext";

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
  const { rules } = useBusinessRules();
  const { addAnomaly } = useAnomalies();

  // Automatic anomaly reporting, driven by the same thresholds Settings
  // makes editable — approving a Descuento/Reembolso above the configured
  // threshold flags it without anyone having to notice and report it by
  // hand. Amounts are stored as display strings ("15%", "$1,900 MXN"), so
  // parse the number back out rather than duplicating it in a second field.
  function flagIfAnomalous(a: ApprovalRecord) {
    if (a.type === "Descuento") {
      const pct = parseFloat(a.amount);
      if (!Number.isNaN(pct) && pct > rules.anomalyDiscountThresholdPct) {
        addAnomaly(
          "Descuento inusual",
          `${a.amount} aplicado a ${a.client} — solicitó ${a.requestedBy} (umbral: ${rules.anomalyDiscountThresholdPct}%)`,
        );
      }
    } else if (a.type === "Reembolso") {
      const mxn = Number(a.amount.replace(/[^0-9.]/g, ""));
      if (!Number.isNaN(mxn) && mxn > rules.anomalyRefundThresholdMXN) {
        addAnomaly(
          "Reembolso inusual",
          `${a.amount} a ${a.client}${a.reason ? ` — ${a.reason}` : ""} (umbral: $${rules.anomalyRefundThresholdMXN.toLocaleString()} MXN)`,
        );
      }
    }
  }

  function decide(id: string, status: Extract<ApprovalStatus, "Aprobado" | "Rechazado">) {
    // The side effect (addAnomaly, which sets state on a different context)
    // must not live inside the setApprovals updater below — React (in
    // StrictMode/dev) can invoke that updater twice to check it's pure,
    // which would log the same anomaly twice. Find the record and flag it
    // once, outside the updater, then apply the pure status change.
    if (status === "Aprobado") {
      const approval = approvals.find((a) => a.id === id);
      if (approval) flagIfAnomalous(approval);
    }
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
