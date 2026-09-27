"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { STAFF_ROSTER as SEED_ROSTER, type StaffMember } from "@/lib/mock-data";

const StaffRosterContext = createContext<{
  roster: StaffMember[];
  addStaff: (member: Omit<StaffMember, "id">) => void;
  updateStaff: (id: string, patch: Partial<StaffMember>) => void;
  toggleStatus: (id: string) => void;
} | null>(null);

// App-wide so Admin Analytics → P&L can sum active salaries into the
// "Nómina base" line live — same pattern as LocationsContext/
// ProtocolsContext: Admin Staff edits this, P&L reads the same state
// instead of a frozen mock constant.
export function StaffRosterProvider({ children }: { children: ReactNode }) {
  const [roster, setRoster] = useState<StaffMember[]>(SEED_ROSTER.map((s) => ({ ...s })));

  function addStaff(member: Omit<StaffMember, "id">) {
    setRoster((prev) => [...prev, { ...member, id: `st-${Date.now()}` }]);
  }

  function updateStaff(id: string, patch: Partial<StaffMember>) {
    setRoster((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  function toggleStatus(id: string) {
    setRoster((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: s.status === "Activo" ? "Inactivo" : "Activo" } : s)),
    );
  }

  return (
    <StaffRosterContext.Provider value={{ roster, addStaff, updateStaff, toggleStatus }}>
      {children}
    </StaffRosterContext.Provider>
  );
}

export function useStaffRoster() {
  const ctx = useContext(StaffRosterContext);
  if (!ctx) throw new Error("useStaffRoster must be used within StaffRosterProvider");
  return ctx;
}
