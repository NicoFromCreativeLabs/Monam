"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { ESTHETICIAN_STAFF, FRONT_DESK_STAFF } from "@/lib/mock-data";
import { useCurrentAppUser } from "./CurrentAppUserContext";

export type StaffRole = "Front Desk" | "Esthetician";

const StaffRoleContext = createContext<{ role: StaffRole } | null>(null);

// A real Front Desk or Esthetician login is locked to their own real role —
// there used to be a manual pill (RoleToggle) letting anyone flip between
// the two, which both duplicated the admin ViewSwitcher's own "Vendedor"
// preview entries and, worse, let a real Front Desk account self-select
// into the Esthetician view's screens (treatment records, clinical notes)
// that their actual role shouldn't see (spec §9's permission table). Only
// when the signed-in user is an Owner/Clinic Manager previewing the panel
// (StaffPanelShell is reachable by both, same precedent as /my's preview)
// does the view fall back to the ?role= the admin ViewSwitcher's "Vendedor"
// entries already navigate with.
export function StaffRoleProvider({ children }: { children: ReactNode }) {
  const currentUser = useCurrentAppUser();
  const searchParams = useSearchParams();
  const role = useMemo<StaffRole>(() => {
    if (currentUser.role === "FRONT_DESK") return "Front Desk";
    if (currentUser.role === "ESTHETICIAN") return "Esthetician";
    return searchParams.get("role") === "esthetician" ? "Esthetician" : "Front Desk";
  }, [currentUser.role, searchParams]);
  return <StaffRoleContext.Provider value={{ role }}>{children}</StaffRoleContext.Provider>;
}

export function useStaffRole() {
  const ctx = useContext(StaffRoleContext);
  if (!ctx) throw new Error("useStaffRole must be used within StaffRoleProvider");
  return ctx;
}

export function staffIdentity(role: StaffRole) {
  return role === "Front Desk" ? FRONT_DESK_STAFF : ESTHETICIAN_STAFF;
}
