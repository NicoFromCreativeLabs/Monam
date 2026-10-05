"use client";

import { createContext, useContext, type ReactNode } from "react";

export interface CurrentAppUser {
  name: string;
  roleLabel: string;
}

const CurrentAppUserContext = createContext<CurrentAppUser | null>(null);

// Populated once, server-side, by app/admin/layout.tsx and app/staff/layout.tsx
// from the real signed-in AppUser (requireStaffRole's return value) — not the
// static OWNER mock (admin panels) or the role-label-only staffIdentity()
// stand-in (staff panels), both of which showed the same name no matter who
// was actually logged in. Same fix CurrentClientContext already made for /my.
export function CurrentAppUserProvider({
  value,
  children,
}: {
  value: CurrentAppUser;
  children: ReactNode;
}) {
  return (
    <CurrentAppUserContext.Provider value={value}>{children}</CurrentAppUserContext.Provider>
  );
}

export function useCurrentAppUser() {
  const ctx = useContext(CurrentAppUserContext);
  if (!ctx) throw new Error("useCurrentAppUser must be used within CurrentAppUserProvider");
  return ctx;
}
