import { prisma } from "@/lib/prisma";
import { requireClientOrPreview } from "@/lib/auth/dal";
import { ClientPreferencesForm } from "@/components/panel/ClientPreferencesForm";
import type { PreferencesInput } from "@/lib/actions/clients";

export default async function ClientPreferencesPage() {
  const { client } = await requireClientOrPreview();
  const preferences = await prisma.clientPreference.findUnique({ where: { clientId: client.id } });

  const initial: PreferencesInput = {
    beverage: preferences?.beverage ?? "",
    aromatherapy: preferences?.aromatherapy ?? "",
    conversation: preferences?.conversationStyle ?? "",
  };

  return <ClientPreferencesForm initial={initial} wishlist={preferences?.wishlist ?? []} />;
}
