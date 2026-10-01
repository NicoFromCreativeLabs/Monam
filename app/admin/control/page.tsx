import { prisma } from "@/lib/prisma";
import {
  AdminControlView,
  type ApprovalRow,
  type AnomalyRow,
  type IncidentRow,
  type AuditLogRow,
} from "@/components/panel/AdminControlView";

const APPROVAL_TYPE_LABEL: Record<string, string> = {
  DISCOUNT: "Descuento",
  REFUND: "Reembolso",
  COMP: "Cortesía",
  INVENTORY_ADJUSTMENT: "Ajuste de inventario",
};

const APPROVAL_STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendiente",
  APPROVED: "Aprobado",
  REJECTED: "Rechazado",
};

function formatDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

// Control - fuses the old /admin/approvals and /admin/audit-log into one
// page with sub-sections, per client spec. Aprobaciones (ApprovalRequest),
// Anomalias (AnomalyFlag - a dedicated table, separate from Alert, which is
// Panel's own operational notification stream), and Incidentes clinicos
// (ClinicalIncident) are all real now. Historial reads the real AuditLog
// table too - it only ever gets written by anonymizeClientAction today
// (lib/actions/clients.ts, ARCO deletion), so it starts empty and fills in
// as privacy-relevant actions happen; broader write-side instrumentation
// (every mutation, not just ARCO) is follow-up work, not this pass.
export default async function AdminControl() {
  const [approvals, anomalies, incidents, auditLog] = await Promise.all([
    prisma.approvalRequest.findMany({
      include: { requestedBy: true, client: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.anomalyFlag.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.clinicalIncident.findMany({
      include: { client: true, treatmentRecord: { include: { protocol: true, esthetician: true } } },
      orderBy: { occurredAt: "desc" },
    }),
    prisma.auditLog.findMany({ include: { actor: true }, orderBy: { createdAt: "desc" }, take: 100 }),
  ]);

  const approvalRows: ApprovalRow[] = approvals.map((a) => ({
    id: a.id,
    type: APPROVAL_TYPE_LABEL[a.type] ?? a.type,
    client: a.client?.name ?? "-",
    requestedBy: a.requestedBy.name,
    amount: a.amountMxn ? `$${a.amountMxn.toLocaleString()} MXN` : "-",
    date: formatDate(a.createdAt),
    status: APPROVAL_STATUS_LABEL[a.status] ?? a.status,
  }));

  const anomalyRows: AnomalyRow[] = anomalies.map((a) => ({
    id: a.id,
    type: a.type,
    detail: a.detail,
    status: a.status === "RESOLVED" ? "Resuelto" : "Abierto",
  }));

  const incidentRows: IncidentRow[] = incidents.map((i) => ({
    id: i.id,
    client: i.client.name,
    type: i.type,
    protocol: i.treatmentRecord?.protocol?.name ?? "-",
    esthetician: i.treatmentRecord?.esthetician.name ?? "-",
    date: formatDate(i.occurredAt),
    status: i.status === "RESOLVED" ? "Resuelto" : "Abierto",
  }));

  const auditLogRows: AuditLogRow[] = auditLog.map((l) => ({
    id: l.id,
    actor: l.actor?.name ?? "Sistema",
    action: l.action,
    entity: l.entityType,
    timestamp: l.createdAt.toISOString().slice(0, 16).replace("T", " "),
  }));

  return (
    <AdminControlView
      approvals={approvalRows}
      anomalies={anomalyRows}
      incidents={incidentRows}
      auditLog={auditLogRows}
    />
  );
}
