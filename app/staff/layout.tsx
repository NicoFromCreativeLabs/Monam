import { requireStaffRole, roleLabel } from "@/lib/auth/dal";
import { isOnShift } from "@/lib/shifts";
import { StaffPanelShell } from "./StaffPanelShell";

export default async function StaffLayout({ children }: LayoutProps<"/staff">) {
  // Owner/Clinic Manager can open this panel too, via the admin navbar's
  // view switcher — every Server Action underneath already allows those
  // two roles (lib/actions/*.ts), so this is just the page-level door.
  const appUser = await requireStaffRole(["FRONT_DESK", "ESTHETICIAN", "OWNER", "CLINIC_MANAGER"], {
    allowWithoutShift: true,
  });
  // A real Front Desk / Esthetician without a check-in today only gets "Mi turno".
  const onShift = await isOnShift(appUser);

  return (
    <StaffPanelShell currentUser={{ name: appUser.name, roleLabel: roleLabel(appUser.role), role: appUser.role, onShift }}>
      {children}
    </StaffPanelShell>
  );
}
