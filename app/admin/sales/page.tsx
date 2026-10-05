import { prisma } from "@/lib/prisma";
import { AdminSalesView, type PaymentMethodRow } from "@/components/panel/AdminSalesView";

const PAYMENT_LABEL: Record<string, string> = { CASH: "Efectivo", CARD: "Tarjeta", SPEI: "SPEI" };

function todayRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

function formatTime(d: Date) {
  return d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
}

// Caja y cobros — owner-facing summary of what today's Cobro/POS activity
// produced: the open/closed CashRegisterSession for this location, and a
// real payment-method breakdown over today's Sale rows (replacing the
// CASH_CUT_SUMMARY/PAYMENT_METHOD_BREAKDOWN mocks). CFDI queue stays behind
// CFDI_ENABLED (feature flag, PAC vendor still TBD — spec §14).
export default async function AdminSales() {
  const { start, end } = todayRange();
  const location = await prisma.location.findFirst({ where: { name: "Roma Norte" } });

  const [session, sales] = await Promise.all([
    location
      ? prisma.cashRegisterSession.findFirst({
          where: { locationId: location.id, status: "OPEN" },
          include: { openedBy: true },
        })
      : null,
    location
      ? prisma.sale.findMany({ where: { locationId: location.id, createdAt: { gte: start, lt: end } } })
      : [],
  ]);

  const breakdown = new Map<string, { count: number; amount: number }>();
  for (const s of sales) {
    const entry = breakdown.get(s.paymentMethod) ?? { count: 0, amount: 0 };
    entry.count += 1;
    entry.amount += s.totalMxn;
    breakdown.set(s.paymentMethod, entry);
  }
  const paymentMethodBreakdown: PaymentMethodRow[] = (["CASH", "CARD", "SPEI"] as const).map((m) => ({
    method: PAYMENT_LABEL[m],
    count: breakdown.get(m)?.count ?? 0,
    amount: breakdown.get(m)?.amount ?? 0,
  }));

  return (
    <AdminSalesView
      locationName="Roma Norte"
      session={
        session
          ? { id: session.id, openedAt: formatTime(session.openedAt), openedBy: session.openedBy.name, openingFloat: session.openingFloatMxn }
          : null
      }
      paymentMethodBreakdown={paymentMethodBreakdown}
    />
  );
}
