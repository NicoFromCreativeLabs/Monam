import { prisma } from "@/lib/prisma";
import { requireClient } from "@/lib/auth/dal";
import { ClientSkinIdForm } from "@/components/panel/ClientSkinIdForm";
import type { SkinIdInput } from "@/lib/actions/clients";

export default async function ClientSkinIdPage() {
  const client = await requireClient();
  const skinId = await prisma.clientSkinId.findUnique({ where: { clientId: client.id } });

  const initial: SkinIdInput = {
    skinType: skinId?.skinType ?? "",
    allergies: skinId?.allergies.join(", ") ?? "",
    medications: skinId?.medications.join(", ") ?? "",
    visitObjective: skinId?.visitObjective ?? "",
    sunExposure: skinId?.sunExposure ?? "",
    notes: skinId?.clinicalNotes ?? "",
  };

  return <ClientSkinIdForm initial={initial} />;
}
