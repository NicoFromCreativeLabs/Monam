import { prisma } from "@/lib/prisma";
import { requireClientOrPreview } from "@/lib/auth/dal";
import { ClientConsentList, type ConsentView } from "@/components/panel/ClientConsentList";

const CONSENT_LABEL = {
  TREATMENT: "Tratamiento y responsabilidad",
  PHOTO_USE: "Uso de fotografía",
  PRIVACY_NOTICE: "Términos y aviso de privacidad",
} as const;

// View current consent status per document/version; revoke photo consent
// independently of treatment consent (spec §8.1, §5.1). Real Consent rows
// only — a new client sees just what they actually accepted at signup.
export default async function ClientConsentPage() {
  const { client } = await requireClientOrPreview();
  const rows = await prisma.consent.findMany({
    where: { clientId: client.id },
    include: { document: true },
    orderBy: { acceptedAt: "asc" },
  });

  const consents: ConsentView[] = rows.map((c) => ({
    id: c.id,
    label: CONSENT_LABEL[c.document.type],
    version: c.document.version,
    acceptedAt: c.acceptedAt.toISOString().slice(0, 10),
    revoked: c.status === "REVOKED",
    revocable: c.document.type === "PHOTO_USE",
  }));

  return <ClientConsentList consents={consents} />;
}
