import { prisma } from "@/lib/prisma";
import { requireClientOrPreview } from "@/lib/auth/dal";
import { ClientSkinIdForm } from "@/components/panel/ClientSkinIdForm";
import { skinIdToInput } from "@/lib/skin-id";

export default async function ClientSkinIdPage() {
  const { client } = await requireClientOrPreview();
  const skinId = await prisma.clientSkinId.findUnique({ where: { clientId: client.id } });

  return <ClientSkinIdForm initial={skinIdToInput(skinId)} />;
}
