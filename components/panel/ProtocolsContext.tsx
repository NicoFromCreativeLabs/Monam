"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { PROTOCOLS as SEED_PROTOCOLS } from "@/lib/mock-data";

export type ProtocolTier = "Express" | "Signature";

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

// "+" is meaningful here (Glow vs. Glow+ are different protocols) so it
// maps to "-plus" rather than being stripped — otherwise "Glow"/"Glow+" and
// "Purify"/"Purify+" collide on the same slug and React throws duplicate
// key warnings.
function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/\+/g, "-plus")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || `protocolo-${Date.now()}`
  );
}

// App-wide protocol menu state — the single place duration/price/cost live.
// Editing them in Admin Settings updates this, and Treatment Record (and
// any other consumer) re-renders from the same source instead of each
// reading a frozen mock constant — same pattern as LocationsContext.
export function ProtocolsProvider({ children }: { children: ReactNode }) {
  const [protocols, setProtocols] = useState<ProtocolRecord[]>(
    SEED_PROTOCOLS.map((p) => ({ ...p, id: slugify(p.name) })),
  );

  function updateProtocol(id: string, patch: Partial<ProtocolRecord>) {
    setProtocols((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function addProtocol(protocol: Omit<ProtocolRecord, "id">) {
    setProtocols((prev) => [...prev, { ...protocol, id: slugify(protocol.name) }]);
  }

  function removeProtocol(id: string) {
    setProtocols((prev) => prev.filter((p) => p.id !== id));
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
