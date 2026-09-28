import { notFound } from "next/navigation";
import { TopBar } from "@/components/panel/TopBar";
import { AdminClientDetailForm, type AdminClientDetailData } from "@/components/panel/AdminClientDetailForm";
import { prisma } from "@/lib/prisma";
import { OWNER } from "@/lib/mock-data";

const CONSENT_TYPE_LABEL: Record<string, string> = {
  TREATMENT: "Tratamiento y responsabilidad",
  PHOTO_USE: "Uso de fotografía",
  PRIVACY_NOTICE: "Aviso de privacidad",
};

function formatDate(d: Date) {
  return d.toISOString().slice(0, 10);
}
function formatDateTime(d: Date) {
  return d.toISOString().slice(0, 16).replace("T", " ");
}

// Record detail — real Client row by :id now (Client & Clinical phase).
// Historial/Consentimientos/Auditoría read real append-only tables — they
// show empty for most clients today simply because no real appointment or
// audited-action history exists yet (Booking/Treatment phases), not
// because they're still mocked.
export default async function AdminClientDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      skinId: true,
      preferences: true,
      consents: { include: { document: true }, orderBy: { acceptedAt: "desc" } },
      appointments: {
        include: { treatmentRecord: { include: { protocol: true, esthetician: true } } },
        orderBy: { startAt: "desc" },
      },
    },
  });
  if (!client || client.anonymizedAt) notFound();

  const auditTrail = await prisma.auditLog.findMany({
    where: { entityType: "Client", entityId: id },
    include: { actor: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const data: AdminClientDetailData = {
    id: client.id,
    contact: { name: client.name, phone: client.phone, email: client.email ?? "" },
    skinId: {
      skinType: client.skinId?.skinType ?? "",
      allergies: client.skinId?.allergies.join(", ") ?? "",
      medications: client.skinId?.medications.join(", ") ?? "",
      pregnancyOrBreastfeeding: client.skinId?.pregnancyOrBreastfeeding ?? false,
      recentProcedures: client.skinId?.recentProcedures ?? "",
      visitObjective: client.skinId?.visitObjective ?? "",
      sunExposure: client.skinId?.sunExposure ?? "",
      notes: client.skinId?.clinicalNotes ?? "",
    },
    preferences: {
      beverage: client.preferences?.beverage ?? "",
      music: client.preferences?.music ?? "",
      aromatherapy: client.preferences?.aromatherapy ?? "",
      conversation: client.preferences?.conversationStyle ?? "",
    },
    treatmentHistory: client.appointments
      .filter((a) => a.treatmentRecord)
      .map((a) => ({
        protocol: a.treatmentRecord!.protocol.name,
        date: formatDate(a.startAt),
        esthetician: a.treatmentRecord!.esthetician.name,
      })),
    consents: client.consents.map((c) => ({
      type: CONSENT_TYPE_LABEL[c.document.type] ?? c.document.type,
      version: c.document.version,
      acceptedAt: formatDate(c.acceptedAt),
      status: c.status === "ACTIVE" ? "Vigente" : "Revocado",
    })),
    auditTrail: auditTrail.map((entry) => ({
      user: entry.actor?.name ?? "Sistema",
      action: entry.action,
      timestamp: formatDateTime(entry.createdAt),
    })),
  };

  return (
    <>
      <TopBar title={client.name} userName={OWNER.name} userRole={OWNER.role} allowBothLocations />
      <AdminClientDetailForm data={data} />
    </>
  );
}
