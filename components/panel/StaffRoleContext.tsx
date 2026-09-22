"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { ESTHETICIAN_STAFF, FRONT_DESK_STAFF } from "@/lib/mock-data";

export type StaffRole = "Front Desk" | "Esthetician";

const StaffRoleContext = createContext<{
  role: StaffRole;
  setRole: (r: StaffRole) => void;
} | null>(null);

export function StaffRoleProvider({ children }: { children: ReactNode }) {
  // Sets which staff view opens first, per the ?role= the login screen sent
  // (Recepción vs Esteticista) — the in-panel pill still switches freely
  // after that, this only decides the starting view.
  const searchParams = useSearchParams();
  const [role, setRole] = useState<StaffRole>(
    searchParams.get("role") === "esthetician" ? "Esthetician" : "Front Desk"
  );
  return (
    <StaffRoleContext.Provider value={{ role, setRole }}>{children}</StaffRoleContext.Provider>
  );
}

export function useStaffRole() {
  const ctx = useContext(StaffRoleContext);
  if (!ctx) throw new Error("useStaffRole must be used within StaffRoleProvider");
  return ctx;
}

export function staffIdentity(role: StaffRole) {
  return role === "Front Desk" ? FRONT_DESK_STAFF : ESTHETICIAN_STAFF;
}
