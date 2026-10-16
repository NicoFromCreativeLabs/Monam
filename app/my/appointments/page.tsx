import { prisma } from "@/lib/prisma";
import { requireClientOrPreview } from "@/lib/auth/dal";
import {
  ClientAppointmentsView,
  type UpcomingAppointmentView,
  type PastAppointmentView,
  type PurchaseView,
  type RecommendationView,
} from "@/components/panel/ClientAppointmentsView";

function formatDate(d: Date) {
  return d.toISOString().slice(0, 10);
}
function formatTime(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default async function ClientAppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ depositoConfirmado?: string }>;
}) {
  const { client } = await requireClientOrPreview();
  const { depositoConfirmado } = await searchParams;
  const now = new Date();

  const [upcomingRows, pastRows, purchaseRows, recommendationRows] = await Promise.all([
    prisma.appointment.findMany({
      where: { clientId: client.id, startAt: { gte: now }, status: { notIn: ["CANCELLED", "NO_SHOW"] } },
      include: { protocol: true, location: true, deposit: true },
      orderBy: { startAt: "asc" },
    }),
    prisma.appointment.findMany({
      where: { clientId: client.id, startAt: { lt: now }, status: { notIn: ["CANCELLED", "NO_SHOW"] } },
      include: { protocol: true, location: true },
      orderBy: { startAt: "desc" },
      take: 10,
    }),
    // Real Sale/SaleLineItem rows, not the CLIENT_PURCHASES mock — a client
    // with zero real purchases must see an empty list, never fabricated
    // history (this was the actual bug: the mock rendered unconditionally
    // for every client, including one who'd never bought anything).
    prisma.saleLineItem.findMany({
      where: { type: "RETAIL", sale: { clientId: client.id } },
      include: { product: true, sale: true },
      orderBy: { sale: { createdAt: "desc" } },
      take: 3,
    }),
    // Same story for post-facial recommendations — real
    // RetailRecommendationTag rows tied to this client's own
    // TreatmentRecords, not a mock list everyone sees.
    prisma.retailRecommendationTag.findMany({
      where: { treatmentRecord: { appointment: { clientId: client.id } } },
      include: { product: true, treatmentRecord: { include: { protocol: true } }, saleLineItems: true },
      orderBy: { taggedAt: "desc" },
    }),
  ]);

  const upcoming: UpcomingAppointmentView[] = upcomingRows.map((a) => ({
    id: a.id,
    protocolTier: `${a.protocol?.name ?? a.durationTier} (${a.durationTier === "SIGNATURE" ? 60 : 30} min)`,
    date: formatDate(a.startAt),
    time: formatTime(a.startAt),
    location: a.location.name,
    depositPaid: a.deposit !== null,
  }));

  const past: PastAppointmentView[] = pastRows.map((a) => ({
    id: a.id,
    protocol: a.protocol?.name ?? a.durationTier,
    date: formatDate(a.startAt),
    time: formatTime(a.startAt),
    location: a.location.name,
  }));

  const purchases: PurchaseView[] = purchaseRows.map((li) => ({
    product: li.product?.name ?? "Producto",
    date: formatDate(li.sale.createdAt),
    price: li.priceMxn,
  }));

  const recommendations: RecommendationView[] = recommendationRows.map((tag) => ({
    product: tag.product.name,
    protocol: tag.treatmentRecord.protocol.name,
    visitDate: formatDate(tag.treatmentRecord.completedAt),
    alreadyPurchased: tag.saleLineItems.length > 0,
  }));

  return (
    <>
      {depositoConfirmado === "1" && (
        <div className="mb-4 rounded-lg bg-ciruela/10 px-4 py-3 font-body text-sm text-ciruela">
          Pago recibido — tu cita se está confirmando. Si no aparece en unos segundos, el estudio
          la confirmará por WhatsApp.
        </div>
      )}
      <ClientAppointmentsView upcoming={upcoming} past={past} purchases={purchases} recommendations={recommendations} />
    </>
  );
}
