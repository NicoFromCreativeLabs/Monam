"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { LOCATIONS as SEED_LOCATIONS } from "@/lib/mock-data";

export interface LocationRecord {
  id: string;
  name: string;
  address: string;
  isActive: boolean;
}

const LocationsContext = createContext<{
  locations: LocationRecord[];
  updateLocation: (id: string, patch: Partial<LocationRecord>) => void;
  addLocation: (location: Omit<LocationRecord, "id">) => void;
  selectedNames: string[];
  setSelectedNames: (names: string[]) => void;
} | null>(null);

// App-wide location state — the single place `isActive` (and now the
// current view filter) lives. Activating Prado Norte, adding a third
// location, or picking a location in the switcher all update this, and
// every consumer (location switcher, booking flow, staff assignment,
// inventory) re-renders from the same source instead of each reading a
// frozen mock constant or keeping its own disconnected filter state.
export function LocationsProvider({ children }: { children: ReactNode }) {
  const [locations, setLocations] = useState<LocationRecord[]>(
    SEED_LOCATIONS.map((l) => ({ ...l })),
  );
  const [selectedNames, setSelectedNames] = useState<string[]>([SEED_LOCATIONS[0].name]);

  function updateLocation(id: string, patch: Partial<LocationRecord>) {
    setLocations((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  function addLocation(location: Omit<LocationRecord, "id">) {
    const id = location.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || `sucursal-${Date.now()}`;
    setLocations((prev) => [...prev, { ...location, id }]);
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
