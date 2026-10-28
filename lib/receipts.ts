import "server-only";
import { prisma } from "@/lib/prisma";
import type { ReceiptLine } from "@/lib/email/receipt";

// Shared by the welcome/receipt email (lib/actions/commerce.ts) and the
// "Descargar PDF" route (app/api/receipts/[saleId]/pdf/route.ts) — same
// ticket, two renderings, one query/mapping so they can't drift.
export interface ReceiptData {
  clientName: string;
  clientEmail: string | null;
  locationName: string;
  dateLabel: string;
  lines: ReceiptLine[];
  discountMxn: number;
  totalMxn: number;
}

export async function getReceiptData(saleId: string): Promise<ReceiptData | null> {
  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: {
      lineItems: { include: { protocol: true, addOn: true, product: true } },
      location: true,
      client: true,
    },
  });
  if (!sale || !sale.client) return null;

  return {
    clientName: sale.client.name,
    clientEmail: sale.client.email,
    locationName: sale.location.name,
    dateLabel: sale.createdAt.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" }),
    lines: sale.lineItems.map((li) => ({
      label: li.protocol?.name ?? li.addOn?.name ?? li.product?.name ?? "Artículo",
      priceMxn: li.priceMxn,
    })),
    discountMxn: sale.discountMxn,
    totalMxn: sale.totalMxn,
  };
}
