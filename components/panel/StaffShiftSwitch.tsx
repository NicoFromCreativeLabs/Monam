"use client";

import { useStaffRole } from "@/components/panel/StaffRoleContext";
import { StaffShiftView, type StaffShiftViewProps } from "@/components/panel/StaffShiftView";
import { StaffFrontDeskShiftView, type FrontDeskShiftData } from "@/components/panel/StaffFrontDeskShiftView";

// Shows the shift screen of the role being worked (or previewed): the
// esthetician's sede + cabina, or the front desk's sede + cash register.
export function StaffShiftSwitch({
  esthetician,
  frontDesk,
}: {
  esthetician: StaffShiftViewProps | null;
  frontDesk: FrontDeskShiftData | null;
}) {
  const { role } = useStaffRole();
  if (role === "Esthetician" && esthetician) return <StaffShiftView {...esthetician} />;
  if (role === "Front Desk" && frontDesk) return <StaffFrontDeskShiftView {...frontDesk} />;
  return null;
}
