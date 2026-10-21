import { prisma } from "@/lib/prisma";
import { requireStaffRole } from "@/lib/auth/dal";
import { discountSummary, modeKey } from "@/lib/discount-codes";
import { AdminDiscountsView, type DiscountCodeRow } from "@/components/panel/AdminDiscountsView";

// Descuentos: create discount codes with a QR the client shows at the front desk.
export default async function AdminDiscounts() {
  await requireStaffRole(["OWNER", "CLINIC_MANAGER"]);

  const [codes, usage, claimCounts, addOns, products] = await Promise.all([
    prisma.discountCode.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.discountRedemption.groupBy({ by: ["codeId"], _count: true, _sum: { amountMxn: true } }),
    prisma.clientDiscount.groupBy({ by: ["codeId"], _count: true }),
    prisma.addOn.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.product.findMany({
      where: { ledger: "RETAIL", isActive: true },
      orderBy: { name: "asc" },
      select: { sku: true, name: true },
    }),
  ]);

  const rows: DiscountCodeRow[] = codes.map((c) => {
    const u = usage.find((x) => x.codeId === c.id);
    return {
      id: c.id,
      code: c.code,
      name: c.name,
      summary: discountSummary(c),
      validFrom: c.validFrom ? c.validFrom.toISOString() : null,
      validUntil: c.validUntil ? c.validUntil.toISOString() : null,
      maxUses: c.maxUses,
      onePerClient: c.onePerClient,
      isActive: c.isActive,
      mode: modeKey(c),
      claimUntil: c.claimUntil ? c.claimUntil.toISOString() : null,
      listed: c.listed,
      claims: claimCounts.find((x) => x.codeId === c.id)?._count ?? 0,
      uses: u?._count ?? 0,
      givenMxn: u?._sum.amountMxn ?? 0,
    };
  });

  return <AdminDiscountsView codes={rows} addOns={addOns} products={products} />;
}
