"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export interface PendingCheckoutRetailItem {
  name: string;
  price: number;
  recommendedBy: string;
}

export interface PendingCheckout {
  id: string;
  clientName: string;
  service: { name: string; price: number };
  retailItems: PendingCheckoutRetailItem[];
  wishlist: { product: string; price: number }[];
  depositCredit: number;
  finishedAt: string;
}

const PendingCheckoutsContext = createContext<{
  pending: PendingCheckout[];
  addPendingCheckout: (checkout: Omit<PendingCheckout, "id" | "finishedAt">) => void;
  removePendingCheckout: (id: string) => void;
} | null>(null);

// A treatment finishing and someone being able to charge for it are two
// different moments handled by two different people — this context is the
// hand-off between them. An esthetician completing a treatment
// (treatment-record's "Completar tratamiento") adds an entry here; it
// shows up as a clickable "lista para cobro" item on the front-desk
// dashboard, which is the only way into that specific client's real ticket
// at checkout. Navigating to Cobro/POS directly, with nothing selected, is
// a deliberately separate, ticket-less path for a walk-in retail-only sale
// — there's no client record to attach a service charge to in that case.
export function PendingCheckoutsProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingCheckout[]>([]);

  function addPendingCheckout(checkout: Omit<PendingCheckout, "id" | "finishedAt">) {
    const now = new Date();
    const finishedAt = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    setPending((prev) => [...prev, { ...checkout, id: `chk-${Date.now()}`, finishedAt }]);
  }

  function removePendingCheckout(id: string) {
    setPending((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <PendingCheckoutsContext.Provider value={{ pending, addPendingCheckout, removePendingCheckout }}>
      {children}
    </PendingCheckoutsContext.Provider>
  );
}

export function usePendingCheckouts() {
  const ctx = useContext(PendingCheckoutsContext);
  if (!ctx) throw new Error("usePendingCheckouts must be used within PendingCheckoutsProvider");
  return ctx;
}
