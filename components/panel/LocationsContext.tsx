"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { updateLocationAction, addLocationAction } from "@/lib/actions/catalog";

export interface LocationRoom {
  id: string;
  name: string;
}

export interface LocationRecord {
  id: string;
  name: string;
  address: string;
  isActive: boolean;
  rentCost: number;
  maintenanceCost: number;
  rooms: LocationRoom[];
}

const LocationsContext = createContext<{
  locations: LocationRecord[];
  updateLocation: (id: string, patch: Partial<LocationRecord>) => void;
  addLocation: (location: Omit<LocationRecord, "id">) => void;
  selectedNames: string[];
  setSelectedNames: (names: string[]) => void;
} | null>(null);

// App-wide location state — the single place `isActive` (and now the
// current view filter) lives. Seeded from a real Location query (see
// app/layout.tsx), not a frozen mock array — activating Prado Norte, adding
// a third location, or editing rent/maintenance now persist to Postgres via
// lib/actions/catalog.ts, not just this session's memory. Local state still
// updates optimistically so the UI doesn't wait on the round trip; if the
// write fails, the error is logged and the next navigation's real fetch
// corrects the local copy.
export function LocationsProvider({
  initialLocations,
  children,
}: {
  initialLocations: LocationRecord[];
  children: ReactNode;
}) {
  const [locations, setLocations] = useState<LocationRecord[]>(initialLocations);
  const [selectedNames, setSelectedNames] = useState<string[]>(
    initialLocations[0] ? [initialLocations[0].name] : [],
  );

  function updateLocation(id: string, patch: Partial<LocationRecord>) {
    setLocations((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
    updateLocationAction(id, patch).catch((err) => {
      console.error("Failed to persist location update:", err);
    });
  }

  function addLocation(location: Omit<LocationRecord, "id">) {
    const tempId = crypto.randomUUID();
    setLocations((prev) => [...prev, { ...location, id: tempId }]);
    addLocationAction(location)
      .then((realId) => {
        setLocations((prev) => prev.map((l) => (l.id === tempId ? { ...l, id: realId } : l)));
      })
      .catch((err) => {
        console.error("Failed to persist new location:", err);
      });
  }

  return (
    <LocationsContext.Provider
      value={{ locations, updateLocation, addLocation, selectedNames, setSelectedNames }}
    >
      {children}
    </LocationsContext.Provider>
  );
}

export function useLocations() {
  const ctx = useContext(LocationsContext);
  if (!ctx) throw new Error("useLocations must be used within LocationsProvider");
  return ctx;
}
