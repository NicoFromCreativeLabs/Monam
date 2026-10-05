import { requireStaffRole } from "@/lib/auth/dal";
import { StaffPanelShell } from "./StaffPanelShell";

export default async function StaffLayout({ children }: LayoutProps<"/staff">) {
  // Owner/Clinic Manager can open this panel too, via the admin navbar's
  // view switcher — every Server Action underneath already allows those
  // two roles (lib/actions/*.ts), so this is just the page-level door.
  await requireStaffRole(["FRONT_DESK", "ESTHETICIAN", "OWNER", "CLINIC_MANAGER"]);

  return <StaffPanelShell>{children}</StaffPanelShell>;
}
