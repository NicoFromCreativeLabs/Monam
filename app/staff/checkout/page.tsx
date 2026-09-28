import { prisma } from "@/lib/prisma";
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
        treatmentRecord: { include: { esthetician: true, retailTags: { include: { product: true } } } },
      },
    });

    if (appointment && appointment.treatmentRecord) {
      const priceBySku = new Map(catalog.map((c) => [c.sku, c.price]));
      session = {
        appointmentId: appointment.id,
        clientName: appointment.client.name,
        service: {
          name: appointment.protocol?.name ?? "Facial",
          price: appointment.protocol?.priceMxn ?? 0,
        },
        retailItems: appointment.treatmentRecord.retailTags.map((t) => ({
          name: t.product.name,
          price: priceBySku.get(t.product.sku) ?? 0,
          recommendedBy: appointment.treatmentRecord!.esthetician.name,
        })),
        depositCredit: appointment.deposit?.status === "HELD" ? -appointment.deposit.amountMxn : 0,
      };
    }
  }

  return <StaffCheckoutView session={session} catalog={catalog} />;
}
