"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { updateBusinessRulesAction } from "@/lib/actions/settings";

export interface BusinessRules {
  commissionServicePct: number;
  commissionRetailPct: number;
  anomalyDiscountThresholdPct: number;
  anomalyRefundThresholdMXN: number;
}

const BusinessRulesContext = createContext<{
  rules: BusinessRules;
  updateRules: (patch: Partial<BusinessRules>) => void;
} | null>(null);

// Same pattern as LocationsContext — the anomaly thresholds an Owner edits
// in Settings need to be readable somewhere other than that page, so
// decideApprovalAction can actually compare a decided Descuento/Reembolso
// against them and auto-flag an anomaly. Seeded from real CommissionRule/
// Setting rows (see app/layout.tsx); edits persist via
// updateBusinessRulesAction, same fire-and-forget pattern as
// ProtocolsContext/LocationsContext.
export function BusinessRulesProvider({
  initialRules,
  children,
}: {
  initialRules: BusinessRules;
  children: ReactNode;
}) {
  const [rules, setRules] = useState<BusinessRules>(initialRules);

  function updateRules(patch: Partial<BusinessRules>) {
    setRules((prev) => ({ ...prev, ...patch }));
    updateBusinessRulesAction(patch).catch((err) => {
      console.error("Failed to persist business rules update:", err);
    });
  }

  return (
    <BusinessRulesContext.Provider value={{ rules, updateRules }}>
      {children}
    </BusinessRulesContext.Provider>
  );
}

export function useBusinessRules() {
  const ctx = useContext(BusinessRulesContext);
  if (!ctx) throw new Error("useBusinessRules must be used within BusinessRulesProvider");
  return ctx;
}
