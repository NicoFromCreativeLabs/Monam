import { requireStaffRole } from "@/lib/auth/dal";
import { StaffPanelShell } from "./StaffPanelShell";

export default async function StaffLayout({ children }: LayoutProps<"/staff">) {
  await requireStaffRole(["FRONT_DESK", "ESTHETICIAN"]);

  return <StaffPanelShell>{children}</StaffPanelShell>;
}
