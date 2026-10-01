import { prisma } from "@/lib/prisma";
import { AdminPanelView } from "@/components/panel/AdminPanelView";
import { getReportingSnapshotAction } from "@/lib/actions/reporting";
import { getTodayAppointments } from "@/lib/appointments";

// Panel (Hoy) — rebuilt per client review, Sep 2026. Three visually
// distinct bands — Pulso (KPIs), Requiere acción (tasks), Hoy (today's
// operational detail). Pulso now reads a real reporting snapshot (real
// Sale/CommissionEntry/Appointment aggregation, lib/reporting.ts) instead
// of mock figures — see the user's explicit call to wire this up even
// though the business has almost no transaction history yet, so most
// numbers read near-zero until real usage accumulates. Requiere acción and
// the day's agenda read real ApprovalRequest/Alert/Appointment rows too.
export default async function AdminPanelPage() {
  const locations = await prisma.location.findMany({ orderBy: { createdAt: "asc" } });

  const [snapshot, pendingApprovals, inventoryItems, alerts, romaNorte] = await Promise.all([
    getReportingSnapshotAction(locations.map((l) => l.name), "Mes en curso", "Mes anterior"),
    prisma.approvalRequest.findMany({
      where: { status: "PENDING" },
      include: { requestedBy: true, client: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.inventoryItem.findMany({ select: { qty: true, par: true } }),
    prisma.alert.findMany({ where: { readAt: null }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.location.findFirst({ where: { name: "Roma Norte" } }),
  ]);
  const lowStockCount = inventoryItems.filter((i) => i.qty < i.par).length;

  const todayAppointments = romaNorte ? await getTodayAppointments(romaNorte.id) : [];

  return (
    <AdminPanelView
      initialSnapshot={snapshot}
      pendingApprovals={pendingApprovals.map((a) => ({
        id: a.id,
        type: a.type === "DISCOUNT" ? "Descuento" : a.type === "REFUND" ? "Reembolso" : a.type === "COMP" ? "Cortesía" : "Ajuste de inventario",
        client: a.client?.name ?? "—",
        amount: a.amountMxn ? `$${a.amountMxn.toLocaleString()} MXN` : "—",
        requestedBy: a.requestedBy.name,
        reason: a.reason ?? "",
      }))}
      lowStockCount={lowStockCount}
      alerts={alerts.map((a) => ({ id: a.id, text: a.text }))}
      todayAppointments={todayAppointments.map((a) => ({
        id: a.id,
        time: a.time,
        client: a.clientName,
        tier: a.tier,
        room: a.room,
        esthetician: a.esthetician,
        status: a.status,
      }))}
    />
  );
}
