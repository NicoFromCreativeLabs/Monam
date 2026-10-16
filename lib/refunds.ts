import "server-only";
import { prisma } from "@/lib/prisma";

export interface RefundableSale {
  id: string;
  createdAt: string; // ISO
  clientName: string | null;
  totalMxn: number;
  paymentMethod: "CASH" | "CARD" | "ONLINE";
  refundedMxn: number; // approved refunds so far
  pendingMxn: number; // refunds waiting for approval
}

// Recent sales a refund can be asked for (last 14 days at one location), with
// how much of each has already been refunded or is waiting for approval.
export async function getRecentSalesForRefund(locationId: string): Promise<RefundableSale[]> {
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const sales = await prisma.sale.findMany({
    where: { locationId, createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: {
      client: { select: { name: true } },
      approvalRequests: {
        where: { type: "REFUND", status: { in: ["APPROVED", "PENDING"] } },
        select: { amountMxn: true, status: true },
      },
    },
  });
  return sales.map((s) => ({
    id: s.id,
    createdAt: s.createdAt.toISOString(),
    clientName: s.client?.name ?? null,
    totalMxn: s.totalMxn,
    paymentMethod: s.paymentMethod,
    refundedMxn: s.approvalRequests.filter((r) => r.status === "APPROVED").reduce((a, r) => a + (r.amountMxn ?? 0), 0),
    pendingMxn: s.approvalRequests.filter((r) => r.status === "PENDING").reduce((a, r) => a + (r.amountMxn ?? 0), 0),
  }));
}
