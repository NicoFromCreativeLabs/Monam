import { prisma } from "@/lib/prisma";
import { requireStaffRole } from "@/lib/auth/dal";
import { getRecentSalesForRefund } from "@/lib/refunds";
import { requireFrontDeskShift } from "@/lib/shifts";
import { StaffRefundsView } from "@/components/panel/StaffRefundsView";

export default async function StaffRefunds() {
  const user = await requireStaffRole(["FRONT_DESK", "OWNER", "CLINIC_MANAGER"]);
  await requireFrontDeskShift(user);
  const location = await prisma.location.findFirst({ where: { name: "Roma Norte" } });
  const sales = location ? await getRecentSalesForRefund(location.id) : [];

  return (
    <StaffRefundsView sales={sales} refundsDirectly={user.role === "OWNER" || user.role === "CLINIC_MANAGER"} />
  );
}
