"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { updateTerminalSettingsAction } from "@/lib/actions/settings";

export interface TerminalSettings {
  enabled: boolean; // off until BBVA activates modo ECR and real connection details are filled in
  bridgeUrl: string; // e.g. http://192.168.1.50:4321 — see terminal-bridge/README.md
  terminalIp: string;
  terminalPort: number;
  fuc: string;
  terminalId: string;
}

export const EMPTY_TERMINAL_SETTINGS: TerminalSettings = {
  enabled: false,
  bridgeUrl: "",
  terminalIp: "",
  terminalPort: 0,
  fuc: "",
  terminalId: "",
};

// Keyed by location name — each store has its own physical terminal on its
// own LAN, so its IP/port/FUC/terminal ID (and whether it's turned on) are
// never shared across locations. A location with nothing saved yet just
// reads as EMPTY_TERMINAL_SETTINGS (disabled, every field blank).
export type TerminalSettingsByLocation = Record<string, TerminalSettings>;

const TerminalSettingsContext = createContext<{
  settingsByLocation: TerminalSettingsByLocation;
  getSettings: (locationName: string) => TerminalSettings;
  updateSettings: (locationName: string, patch: Partial<TerminalSettings>) => void;
} | null>(null);

// Same fire-and-forget persist pattern as BusinessRulesContext. Seeded from
// the "terminal.redsysEcr:<location>" Setting rows (see lib/catalog-cache.ts).
export function TerminalSettingsProvider({
  initialSettingsByLocation,
  children,
}: {
  initialSettingsByLocation: TerminalSettingsByLocation;
  children: ReactNode;
}) {
  const [settingsByLocation, setSettingsByLocation] = useState<TerminalSettingsByLocation>(
    initialSettingsByLocation,
  );

  function getSettings(locationName: string): TerminalSettings {
    return settingsByLocation[locationName] ?? EMPTY_TERMINAL_SETTINGS;
  }

  function updateSettings(locationName: string, patch: Partial<TerminalSettings>) {
    setSettingsByLocation((prev) => ({
      ...prev,
      [locationName]: { ...(prev[locationName] ?? EMPTY_TERMINAL_SETTINGS), ...patch },
    }));
    updateTerminalSettingsAction(locationName, patch).catch((err) => {
      console.error("Failed to persist terminal settings update:", err);
    });
  }

  return (
    <TerminalSettingsContext.Provider value={{ settingsByLocation, getSettings, updateSettings }}>
      {children}
    </TerminalSettingsContext.Provider>
  );
}

export function useTerminalSettings() {
  const ctx = useContext(TerminalSettingsContext);
  if (!ctx) throw new Error("useTerminalSettings must be used within TerminalSettingsProvider");
  return ctx;
}
