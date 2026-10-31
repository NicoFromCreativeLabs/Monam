import { prisma } from "@/lib/prisma";
import { AdminSalesView, type PaymentMethodRow, type SaleRow } from "@/components/panel/AdminSalesView";

const PAYMENT_LABEL: Record<string, string> = { CASH: "Efectivo", CARD: "Tarjeta", ONLINE: "En línea" };

function todayRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

function formatTime(d: Date) {
  return d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
}

function formatDateTime(d: Date) {
  return d.toLocaleString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

const LINE_LABEL = (li: {
  product: { name: string } | null;
  protocol: { name: string } | null;
  addOn: { name: string } | null;
}) => li.product?.name ?? li.protocol?.name ?? li.addOn?.name ?? "Paquete";

const REFUND_STATUSES: ("APPROVED" | "PENDING")[] = ["APPROVED", "PENDING"];

// Caja y cobros — owner-facing summary of what today's Cobro/POS activity
// produced: the open/closed CashRegisterSession for this location, and a
// real payment-method breakdown over today's Sale rows (replacing the
// CASH_CUT_SUMMARY/PAYMENT_METHOD_BREAKDOWN mocks). CFDI queue stays behind
// CFDI_ENABLED (feature flag, PAC vendor still TBD — spec §14).
// Transaction list looks back 90 days across every location — the table
// below is filtered client-side (by location, date range, and a text
// search over client/product/service names) rather than re-querying per
// filter change, since this volume stays small for a 2-location studio.
const LIST_WINDOW_DAYS = 90;

export default async function AdminSales() {
  const { start, end } = todayRange();
  const location = await prisma.location.findFirst({ where: { name: "Roma Norte" } });
  const listSince = new Date(start.getTime() - LIST_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const [session, todaySales, listSales] = await Promise.all([
    location
      ? prisma.cashRegisterSession.findFirst({
          where: { locationId: location.id, status: "OPEN" },
          include: { openedBy: true },
        })
      : null,
    location
      ? prisma.sale.findMany({ where: { locationId: location.id, createdAt: { gte: start, lt: end } } })
      : [],
    prisma.sale.findMany({
      where: { createdAt: { gte: listSince } },
      include: {
        client: true,
        location: true,
        closedBy: true,
        lineItems: { include: { product: true, protocol: true, addOn: true } },
        approvalRequests: { where: { type: "REFUND", status: { in: REFUND_STATUSES } }, select: { amountMxn: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const breakdown = new Map<string, { count: number; amount: number }>();
  for (const s of todaySales) {
    const entry = breakdown.get(s.paymentMethod) ?? { count: 0, amount: 0 };
    entry.count += 1;
    entry.amount += s.totalMxn;
    breakdown.set(s.paymentMethod, entry);
  }
  const paymentMethodBreakdown: PaymentMethodRow[] = (["CASH", "CARD", "ONLINE"] as const).map((m) => ({
    method: PAYMENT_LABEL[m],
    count: breakdown.get(m)?.count ?? 0,
    amount: breakdown.get(m)?.amount ?? 0,
  }));

  const sales: SaleRow[] = listSales.map((s) => {
    const refundedMxn = s.approvalRequests
      .filter((r) => r.status === "APPROVED")
      .reduce((a, r) => a + (r.amountMxn ?? 0), 0);
    const pendingRefundMxn = s.approvalRequests
      .filter((r) => r.status === "PENDING")
      .reduce((a, r) => a + (r.amountMxn ?? 0), 0);
    return {
      id: s.id,
      date: s.createdAt.toISOString().slice(0, 10),
      dateLabel: formatDateTime(s.createdAt),
      locationName: s.location.name,
      clientName: s.client?.name ?? "Mostrador",
      clientEmail: s.client?.email ?? null,
      clientPhone: s.client?.phone ?? null,
      closedByName: s.closedBy.name,
      items: s.lineItems.map((li) => ({ label: LINE_LABEL(li), priceMxn: li.priceMxn })),
      paymentMethod: PAYMENT_LABEL[s.paymentMethod] ?? s.paymentMethod,
      subtotalMxn: s.subtotalMxn,
      discountMxn: s.discountMxn,
      tipMxn: s.tipMxn,
      totalMxn: s.totalMxn,
      refundedMxn,
      pendingRefundMxn,
    };
  });

  return (
    <AdminSalesView
      locationName="Roma Norte"
      session={
        session
          ? { id: session.id, openedAt: formatTime(session.openedAt), openedBy: session.openedBy.name, openingFloat: session.openingFloatMxn }
          : null
      }
      paymentMethodBreakdown={paymentMethodBreakdown}
      sales={sales}
    />
  );
}
