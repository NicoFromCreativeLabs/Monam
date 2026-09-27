"use client";

import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";
import { PANEL_ALERTS as SEED_ALERTS } from "@/lib/mock-data";

export interface PanelAlert {
  id: string;
  text: string;
  severity: "warning" | "info";
}

const STORAGE_KEY = "monam:panel-alerts";

function seedAlerts(): PanelAlert[] {
  return SEED_ALERTS.map((a) => ({ ...a }));
}

function loadFromStorage(): PanelAlert[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as PanelAlert[];
  } catch {
    // ignore — fall through to seed
  }
  return seedAlerts();
}

// Module-level store (not component state) so an action taken in one panel
// — e.g. Staff removing a recommended retail item at checkout — can
// surface as an alert on the Admin "Panel" dashboard without a real
// backend. There's no in-app link between the Staff and Admin panels
// (different roles in real use), so this persists to localStorage and
// listens for the `storage` event: that's what makes a change show up in
// an already-open Admin tab, or after a fresh load in a new one.
let cachedAlerts: PanelAlert[] = typeof window === "undefined" ? seedAlerts() : loadFromStorage();
const listeners = new Set<() => void>();

// A stable snapshot equal to what SSR always renders (the server has no
// localStorage, so it always renders the seed). getServerSnapshot must
// return exactly this, never `cachedAlerts` — once any alert has ever been
// added on a given browser, `cachedAlerts` diverges from the seed at
// module-load time (before hydration even runs), and returning it from
// getServerSnapshot was throwing a real hydration-mismatch error on every
// load of the Admin panel from then on. useSyncExternalStore's contract is
// exactly this two-snapshot handshake: match the server on the hydration
// pass via getServerSnapshot, then immediately re-render with the real
// client value via getSnapshot — no manual re-sync needed once separated.
const SEED_SNAPSHOT: PanelAlert[] = seedAlerts();

function emitChange() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key !== STORAGE_KEY) return;
    cachedAlerts = loadFromStorage();
    emitChange();
  });
}

function getSnapshot() {
  return cachedAlerts;
}

function getServerSnapshot() {
  return SEED_SNAPSHOT;
}

function addAlertToStore(text: string, severity: PanelAlert["severity"] = "warning") {
  cachedAlerts = [{ id: `al-${Date.now()}`, text, severity }, ...cachedAlerts];
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cachedAlerts));
  } catch {
    // localStorage unavailable (private mode, etc.) — alert still shows for this session.
  }
  emitChange();
}

const PanelAlertsContext = createContext<{
  alerts: PanelAlert[];
  addAlert: (text: string, severity?: PanelAlert["severity"]) => void;
} | null>(null);

export function PanelAlertsProvider({ children }: { children: ReactNode }) {
  const alerts = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return (
    <PanelAlertsContext.Provider value={{ alerts, addAlert: addAlertToStore }}>
      {children}
    </PanelAlertsContext.Provider>
  );
}

export function usePanelAlerts() {
  const ctx = useContext(PanelAlertsContext);
  if (!ctx) throw new Error("usePanelAlerts must be used within PanelAlertsProvider");
  return ctx;
}
