"use client";

import { createContext, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { ESTHETICIAN_STAFF, FRONT_DESK_STAFF } from "@/lib/mock-data";
import { useCurrentAppUser } from "./CurrentAppUserContext";

export type StaffRole = "Front Desk" | "Esthetician";
type PreviewRole = "esthetician" | "front-desk";

const StaffRoleContext = createContext<{ role: StaffRole } | null>(null);

// Which staff view an Owner / Clinic Manager is previewing. It arrives as
// ?role=… from the view switcher, but the sidebar links do not carry it, so it
// is also remembered for the browser session — otherwise opening any other
// staff page from the sidebar would drop back to Vendedor.
const STORAGE_KEY = "monam.previewStaffRole";
const CHANGE_EVENT = "monam-preview-role";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}
function readStored(): string | null {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function useStaffPreviewRole(): PreviewRole {
  const searchParams = useSearchParams();
  const fromUrl = searchParams.get("role");
  // The server (and the first client render) knows no stored value, so
  // hydration matches; the remembered one applies right after.
  const stored = useSyncExternalStore(subscribe, readStored, () => null);

  useEffect(() => {
    if (fromUrl === "esthetician" || fromUrl === "front-desk") {
      try {
        window.sessionStorage.setItem(STORAGE_KEY, fromUrl);
        window.dispatchEvent(new Event(CHANGE_EVENT));
      } catch {
        // storage unavailable: the URL still decides for this page
      }
    }
  }, [fromUrl]);

  const chosen = fromUrl === "esthetician" || fromUrl === "front-desk" ? fromUrl : stored;
  return chosen === "esthetician" ? "esthetician" : "front-desk";
}

// A real Front Desk or Esthetician login is locked to their own real role —
// there used to be a manual pill (RoleToggle) letting anyone flip between
// the two, which both duplicated the admin ViewSwitcher's own "Vendedor"
// preview entries and, worse, let a real Front Desk account self-select
// into the Esthetician view's screens (treatment records, clinical notes)
// that their actual role shouldn't see (spec §9's permission table). Only
// when the signed-in user is an Owner/Clinic Manager previewing the panel
// (StaffPanelShell is reachable by both, same precedent as /my's preview)
// does the view follow the preview role chosen in the admin ViewSwitcher.
export function StaffRoleProvider({ children }: { children: ReactNode }) {
  const currentUser = useCurrentAppUser();
  const preview = useStaffPreviewRole();
  const role = useMemo<StaffRole>(() => {
    if (currentUser.role === "FRONT_DESK") return "Front Desk";
    if (currentUser.role === "ESTHETICIAN") return "Esthetician";
    return preview === "esthetician" ? "Esthetician" : "Front Desk";
  }, [currentUser.role, preview]);
  return <StaffRoleContext.Provider value={{ role }}>{children}</StaffRoleContext.Provider>;
}

export function useStaffRole() {
  const ctx = useContext(StaffRoleContext);
  if (!ctx) throw new Error("useStaffRole must be used within StaffRoleProvider");
  return ctx;
}

export function staffIdentity(role: StaffRole) {
  return role === "Front Desk" ? FRONT_DESK_STAFF : ESTHETICIAN_STAFF;
}
