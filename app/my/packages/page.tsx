import { prisma } from "@/lib/prisma";
import { requireClientOrPreview } from "@/lib/auth/dal";
import { getActivePackageBalance } from "@/lib/packages-core";
import { getAccountDiscounts } from "@/lib/client-discounts";
import { ClientPackagesView } from "@/components/panel/ClientPackagesView";

// Sessions remaining, expiry, which location redeemed each session (spec
// §8.1) — all real PackagePurchase/PackageRedemption rows now (Commerce
// phase), not the mock/client-state placeholder this page used to render.
export default async function ClientPackages({
  searchParams,
}: {
  searchParams: Promise<{ reclamar?: string }>;
}) {
  const { reclamar } = await searchParams;
  const { client } = await requireClientOrPreview();

  const [activePackage, purchases, catalog, discounts] = await Promise.all([
    getActivePackageBalance(client.id),
    prisma.packagePurchase.findMany({
      where: { clientId: client.id },
      include: {
        redemptions: { include: { appointment: { include: { location: true } } }, orderBy: { redeemedAt: "asc" } },
      },
      orderBy: { purchasedAt: "desc" },
    }),
    prisma.packageOption.findMany({ where: { isActive: true }, orderBy: { priceMxn: "asc" } }),
    getAccountDiscounts(client.id),
  ]);

  const redemptions = purchases
    .flatMap((purchase) => purchase.redemptions)
    .map((r, i) => ({
      id: r.id,
      index: i + 1,
      redeemedAt: r.redeemedAt.toISOString().slice(0, 10),
      locationName: r.appointment.location.name,
    }));

  return (
    <ClientPackagesView
      activePackage={activePackage}
      redemptions={redemptions}
      discounts={discounts}
      claimCode={reclamar ?? null}
      catalog={catalog.map((p) => ({
        id: p.id,
        name: p.name,
        sessions: p.sessions,
        tier: p.tier === "SIGNATURE" ? "Signature" : "Targeted",
        priceMxn: p.priceMxn,
        listPriceMxn: p.listPriceMxn,
      }))}
    />
  );
}
