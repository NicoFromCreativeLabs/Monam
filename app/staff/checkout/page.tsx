import { prisma } from "@/lib/prisma";
import { getCurrentAppUser } from "@/lib/auth/dal";
import { requireFrontDeskShift } from "@/lib/shifts";
import {
  StaffCheckoutView,
  type CheckoutCatalogItem,
  type CheckoutSession,
} from "@/components/panel/StaffCheckoutView";

export default async function StaffCheckout({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  const { session: appointmentId } = await searchParams;
  const shiftUser = await getCurrentAppUser();
  if (shiftUser) await requireFrontDeskShift(shiftUser);

  const romaNorte = await prisma.location.findFirst({ where: { name: "Roma Norte" } });
  const items = romaNorte
    ? await prisma.inventoryItem.findMany({
        where: { locationId: romaNorte.id, product: { ledger: "RETAIL", isActive: true } },
        include: { product: true },
        orderBy: { product: { name: "asc" } },
      })
    : [];
  const catalog: CheckoutCatalogItem[] = items.map((i) => ({
    sku: i.product.sku,
    product: i.product.name,
    price: i.priceMxn ?? 0,
    qty: i.qty,
  }));

  let session: CheckoutSession | null = null;

  if (appointmentId) {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        client: true,
        protocol: true,
        deposit: true,
        addOns: { include: { addOn: true } },
        packageRedemption: { include: { packagePurchase: { include: { packageOption: true } } } },
        treatmentRecord: { include: { esthetician: true, retailTags: { include: { product: true } } } },
      },
    });

    if (appointment && appointment.treatmentRecord) {
      const priceBySku = new Map(catalog.map((c) => [c.sku, c.price]));
      session = {
        appointmentId: appointment.id,
        clientId: appointment.clientId,
        locationName: "Roma Norte",
        clientName: appointment.client.name,
        service: {
          name: appointment.packageRedemption
            ? `${appointment.protocol?.name ?? "Facial"} — sesión de paquete (${appointment.packageRedemption.packagePurchase.packageOption.name})`
            : (appointment.protocol?.name ?? "Facial"),
          price: appointment.packageRedemption ? 0 : (appointment.protocol?.priceMxn ?? 0),
        },
        addOns: appointment.addOns.map((a) => ({ name: a.addOn.name, price: a.priceMxn })),
        retailItems: appointment.treatmentRecord.retailTags.map((t) => ({
          sku: t.product.sku,
          name: t.product.name,
          price: priceBySku.get(t.product.sku) ?? 0,
          recommendedBy: appointment.treatmentRecord!.esthetician.name,
        })),
        depositCredit: appointment.deposit?.status === "HELD" ? -appointment.deposit.amountMxn : 0,
      };
    }
  }

  const [currentUser, thresholdRow] = await Promise.all([
    getCurrentAppUser(),
    prisma.setting.findUnique({ where: { key: "discount.approvalThresholdPct" } }),
  ]);
  const discountThresholdPct = typeof thresholdRow?.value === "number" ? thresholdRow.value : 10;
  const canApproveDiscounts = currentUser?.role === "OWNER" || currentUser?.role === "CLINIC_MANAGER";

  return (
    <StaffCheckoutView
      session={session}
      catalog={catalog}
      locationName="Roma Norte"
      discountThresholdPct={discountThresholdPct}
      canApproveDiscounts={canApproveDiscounts}
    />
  );
}
