"use client";

import { useStaffRole, type StaffRole } from "./StaffRoleContext";

const ROLES: StaffRole[] = ["Front Desk", "Esthetician"];
// Display labels only — StaffRole itself stays English (internal discriminant).
const ROLE_LABEL: Record<StaffRole, string> = {
  "Front Desk": "Recepción",
  Esthetician: "Esteticista",
};

// Dev-only preview switch — one Vendedor panel, two role variants (spec §7).
// A real login is location- and role-scoped already; this exists only so the
// UI-first pass can preview both variants without auth.
export function RoleToggle() {
  const { role, setRole } = useStaffRole();
  return (
    <div className="flex overflow-hidden rounded-full border border-ciruela/20 font-body text-xs">
      {ROLES.map((r) => (
        <button
          key={r}
          onClick={() => setRole(r)}
          aria-pressed={role === r}
          className={`px-3 py-1.5 ${
            role === r ? "bg-ciruela text-hueso" : "text-ciruela/70 hover:bg-ciruela/8"
          }`}
        >
          {ROLE_LABEL[r]}
        </button>
      ))}
    </div>
  );
}
