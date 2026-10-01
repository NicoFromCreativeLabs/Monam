"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { StaffMember } from "@/lib/mock-data";
import { inviteStaffAction, updateStaffAction, toggleStaffStatusAction } from "@/lib/actions/staff";

const StaffRosterContext = createContext<{
  roster: StaffMember[];
  addStaff: (member: Omit<StaffMember, "id"> & { email: string }) => void;
  updateStaff: (id: string, patch: Partial<StaffMember>) => void;
  toggleStatus: (id: string) => void;
} | null>(null);

// App-wide so Admin Analytics → P&L can sum active salaries into the
// "Nómina base" line live — same pattern as LocationsContext/
// ProtocolsContext: Admin Staff edits this, P&L reads the same state.
// Seeded from real AppUser + StaffLocationAssignment rows (app/layout.tsx);
// edits persist via lib/actions/staff.ts, same fire-and-forget,
// optimistic-then-replace-id pattern as ProtocolsContext.addProtocol.
export function StaffRosterProvider({
  initialRoster,
  children,
}: {
  initialRoster: StaffMember[];
  children: ReactNode;
}) {
  const [roster, setRoster] = useState<StaffMember[]>(initialRoster);

  function addStaff(member: Omit<StaffMember, "id"> & { email: string }) {
    const tempId = crypto.randomUUID();
    setRoster((prev) => [...prev, { ...member, id: tempId }]);
    inviteStaffAction({
      name: member.name,
      email: member.email,
      roleLabel: member.role,
      locationLabel: member.location,
      salaryMxn: member.salary,
    })
      .then((result) => {
        if ("error" in result) {
          console.error("Failed to invite staff member:", result.error);
          setRoster((prev) => prev.filter((s) => s.id !== tempId));
          return;
        }
        setRoster((prev) => prev.map((s) => (s.id === tempId ? { ...s, id: result.userId } : s)));
      })
      .catch((err) => {
        console.error("Failed to invite staff member:", err);
        setRoster((prev) => prev.filter((s) => s.id !== tempId));
      });
  }

  function updateStaff(id: string, patch: Partial<StaffMember>) {
    setRoster((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    const current = roster.find((s) => s.id === id);
    if (!current) return;
    const next = { ...current, ...patch };
    updateStaffAction(id, { roleLabel: next.role, locationLabel: next.location, salaryMxn: next.salary }).catch(
      (err) => console.error("Failed to persist staff update:", err),
    );
  }

  function toggleStatus(id: string) {
    // Matches the button's own label logic: "Inactivo" is the only state
    // that reads as "Reactivar"; "Activo" and "Invitado" both read as
    // "Desactivar" and move to "Inactivo".
    setRoster((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: s.status === "Inactivo" ? "Activo" : "Inactivo" } : s)),
    );
    toggleStaffStatusAction(id).catch((err) => console.error("Failed to persist status toggle:", err));
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
