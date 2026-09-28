"use client";

import { createContext, useContext, type ReactNode } from "react";

export interface CurrentClient {
  name: string;
  email: string;
  phone: string;
}

const CurrentClientContext = createContext<CurrentClient | null>(null);

// Populated once, server-side, by app/my/layout.tsx's requireClient() call —
// the real authenticated Client row, not the static CLIENT mock. Found
// during the persona QA pass: every /my page read the same hardcoded
// "Valentina Reyes" regardless of which account was actually logged in, so
// two different real client logins showed byte-identical dashboards. Booking
// history, packages, and Skin ID are still shared illustrative data (no
// per-client Appointment/Sale rows exist yet) — this only fixes identity.
export function CurrentClientProvider({
  value,
  children,
}: {
  value: CurrentClient;
  children: ReactNode;
}) {
  return (
    <CurrentClientContext.Provider value={value}>{children}</CurrentClientContext.Provider>
  );
}

export function useCurrentClient() {
  const ctx = useContext(CurrentClientContext);
  if (!ctx) throw new Error("useCurrentClient must be used within CurrentClientProvider");
  return ctx;
}
