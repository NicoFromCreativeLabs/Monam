"use client";

import { createContext, useContext, type ReactNode } from "react";

export interface AddOnRecord {
  id: string;
  name: string;
  function: string;
  extraMinutes: number;
  availableOn: string[];
}

const AddOnsContext = createContext<AddOnRecord[] | null>(null);

// Read-only — no Settings UI edits add-ons yet, unlike Locations/Protocols.
// Seeded from a real AddOn+AddOnProtocol query (see app/layout.tsx) instead
// of the ADD_ONS mock array.
export function AddOnsProvider({
  addOns,
  children,
}: {
  addOns: AddOnRecord[];
  children: ReactNode;
}) {
  return <AddOnsContext.Provider value={addOns}>{children}</AddOnsContext.Provider>;
}

export function useAddOns() {
  const ctx = useContext(AddOnsContext);
  if (!ctx) throw new Error("useAddOns must be used within AddOnsProvider");
  return ctx;
}
