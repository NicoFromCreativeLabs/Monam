import { prisma } from "@/lib/prisma";
import { AdminPanelView } from "@/components/panel/AdminPanelView";
import { getReportingSnapshotAction } from "@/lib/actions/reporting";
import { getTodayAppointments } from "@/lib/appointments";
import { flagForgottenShifts } from "@/lib/shift-alerts";
import { getOpenAlerts } from "@/lib/alerts";

// Panel (Hoy) — rebuilt per client review, Sep 2026. Three visually
// distinct bands — Pulso (KPIs), Requiere acción (tasks), Hoy (today's
// operational detail). Pulso now reads a real reporting snapshot (real
// Sale/CommissionEntry/Appointment aggregation, lib/reporting.ts) instead
// of mock figures — see the user's explicit call to wire this up even
// though the business has almost no transaction history yet, so most
// numbers read near-zero until real usage accumulates. Requiere acción and
// the day's agenda read real ApprovalRequest/Alert/Appointment rows too.
export default async function AdminPanelPage() {
  // flagForgottenShifts only needs to finish before getOpenAlerts below (it
  // writes the Alert rows that read), not before the location list — so it
  // runs alongside that query instead of blocking the whole page first.
  const [locations] = await Promise.all([
    prisma.location.findMany({ orderBy: { createdAt: "asc" } }),
    flagForgottenShifts(),
  ]);
  const romaNorte = locations.find((l) => l.name === "Roma Norte");

  const [snapshot, pendingApprovals, alerts, todayAppointments] = await Promise.all([
    getReportingSnapshotAction(locations.map((l) => l.name), "Mes en curso", "Mes anterior"),
    prisma.approvalRequest.findMany({
      where: { status: "PENDING" },
      include: { requestedBy: true, client: true },
      orderBy: { createdAt: "desc" },
    }),
    getOpenAlerts(),
    romaNorte ? getTodayAppointments(romaNorte.id) : Promise.resolve([]),
  ]);

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
      alerts={alerts}
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
