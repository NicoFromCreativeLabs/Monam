"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { BUSINESS_RULES_EXTRA } from "@/lib/mock-data";

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
// ApprovalsContext can actually compare a decided Descuento/Reembolso
// against them and auto-flag an anomaly. A local useState in Settings
// (the original implementation) can't be read from outside that page.
export function BusinessRulesProvider({ children }: { children: ReactNode }) {
  const [rules, setRules] = useState<BusinessRules>({ ...BUSINESS_RULES_EXTRA });

  function updateRules(patch: Partial<BusinessRules>) {
    setRules((prev) => ({ ...prev, ...patch }));
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
