"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import {
  updateProtocolAction,
  addProtocolAction,
  removeProtocolAction,
} from "@/lib/actions/catalog";

export type ProtocolTier = "Targeted" | "Signature";

export interface ProtocolRecord {
  id: string;
  name: string;
  tier: ProtocolTier;
  duration: number;
  price: number;
  cost: number;
}

const ProtocolsContext = createContext<{
  protocols: ProtocolRecord[];
  updateProtocol: (id: string, patch: Partial<ProtocolRecord>) => void;
  addProtocol: (protocol: Omit<ProtocolRecord, "id">) => void;
  removeProtocol: (id: string) => void;
} | null>(null);

// App-wide protocol menu state — the single place duration/price/cost live.
// Seeded from a real Protocol query (see app/layout.tsx). Editing in Admin
// Settings persists to Postgres via lib/actions/catalog.ts; "remove"
// deactivates rather than deletes (a protocol with real appointment/
// treatment-record history can't be hard-deleted, and shouldn't be).
export function ProtocolsProvider({
  initialProtocols,
  children,
}: {
  initialProtocols: ProtocolRecord[];
  children: ReactNode;
}) {
  const [protocols, setProtocols] = useState<ProtocolRecord[]>(initialProtocols);

  function updateProtocol(id: string, patch: Partial<ProtocolRecord>) {
    setProtocols((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    updateProtocolAction(id, patch).catch((err) => {
      console.error("Failed to persist protocol update:", err);
    });
  }

  function addProtocol(protocol: Omit<ProtocolRecord, "id">) {
    const tempId = crypto.randomUUID();
    setProtocols((prev) => [...prev, { ...protocol, id: tempId }]);
    addProtocolAction(protocol)
      .then((realId) => {
        setProtocols((prev) => prev.map((p) => (p.id === tempId ? { ...p, id: realId } : p)));
      })
      .catch((err) => {
        console.error("Failed to persist new protocol:", err);
      });
  }

  function removeProtocol(id: string) {
    setProtocols((prev) => prev.filter((p) => p.id !== id));
    removeProtocolAction(id).catch((err) => {
      console.error("Failed to persist protocol removal:", err);
    });
  }

  return (
    <ProtocolsContext.Provider value={{ protocols, updateProtocol, addProtocol, removeProtocol }}>
      {children}
    </ProtocolsContext.Provider>
  );
}

export function useProtocols() {
  const ctx = useContext(ProtocolsContext);
  if (!ctx) throw new Error("useProtocols must be used within ProtocolsProvider");
  return ctx;
}
