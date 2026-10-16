import { prisma } from "@/lib/prisma";
import { requireStaffRole } from "@/lib/auth/dal";
import { getRecentSalesForRefund } from "@/lib/refunds";
import { StaffRefundsView } from "@/components/panel/StaffRefundsView";

export default async function StaffRefunds() {
  const user = await requireStaffRole(["FRONT_DESK", "OWNER", "CLINIC_MANAGER"]);
  const location = await prisma.location.findFirst({ where: { name: "Roma Norte" } });
  const sales = location ? await getRecentSalesForRefund(location.id) : [];

  return (
    <StaffRefundsView sales={sales} refundsDirectly={user.role === "OWNER" || user.role === "CLINIC_MANAGER"} />
  );
}
