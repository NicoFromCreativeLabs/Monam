"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import {
  addAddOnAction,
  removeAddOnAction,
  updateAddOnAction,
  type AddOnInput,
} from "@/lib/actions/addons";

export interface AddOnRecord {
  id: string;
  name: string;
  function: string;
  extraMinutes: number;
  availableOn: string[];
}

type MutationResult = { error?: string };

interface AddOnActions {
  addAddOn: (input: AddOnInput) => Promise<MutationResult>;
  updateAddOn: (id: string, input: AddOnInput) => Promise<MutationResult>;
  removeAddOn: (id: string) => Promise<MutationResult>;
}

const AddOnsContext = createContext<AddOnRecord[] | null>(null);
const AddOnActionsContext = createContext<AddOnActions | null>(null);

// Seeded from a real AddOn+AddOnProtocol query (see app/layout.tsx) and edited
// from Configuración → Add-ons. Unlike Locations/Protocols the local list is
// only changed after the server accepts the change, because a delete can be
// refused (an add-on already on a sale) and the Owner needs to see why.
export function AddOnsProvider({
  addOns: initialAddOns,
  children,
}: {
  addOns: AddOnRecord[];
  children: ReactNode;
}) {
  const [addOns, setAddOns] = useState<AddOnRecord[]>(initialAddOns);

  const actions: AddOnActions = {
    async addAddOn(input) {
      const result = await addAddOnAction(input);
      if ("error" in result) return { error: result.error };
      setAddOns((prev) => [...prev, { id: result.id, ...input, name: input.name.trim(), function: input.function.trim() }]);
      return {};
    },
    async updateAddOn(id, input) {
      const result = await updateAddOnAction(id, input);
      if (result.error) return result;
      setAddOns((prev) =>
        prev.map((a) =>
          a.id === id ? { id, ...input, name: input.name.trim(), function: input.function.trim() } : a,
        ),
      );
      return {};
    },
    async removeAddOn(id) {
      const result = await removeAddOnAction(id);
      if (result.error) return result;
      setAddOns((prev) => prev.filter((a) => a.id !== id));
      return {};
    },
  };

  return (
    <AddOnsContext.Provider value={addOns}>
      <AddOnActionsContext.Provider value={actions}>{children}</AddOnActionsContext.Provider>
    </AddOnsContext.Provider>
  );
}

export function useAddOns() {
  const ctx = useContext(AddOnsContext);
  if (!ctx) throw new Error("useAddOns must be used within AddOnsProvider");
  return ctx;
}

export function useAddOnActions() {
  const ctx = useContext(AddOnActionsContext);
  if (!ctx) throw new Error("useAddOnActions must be used within AddOnsProvider");
  return ctx;
}
