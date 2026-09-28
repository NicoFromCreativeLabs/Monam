import { prisma } from "@/lib/prisma";
import {
  StaffClientsView,
  type StaffClientListing,
  type StaffClientDetail,
} from "@/components/panel/StaffClientsView";

export default async function StaffClientProfile({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;

  if (id) {
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        skinId: true,
        preferences: true,
        appointments: {
          include: { treatmentRecord: { include: { protocol: true } } },
          orderBy: { startAt: "desc" },
        },
      },
    });

    if (client && !client.anonymizedAt) {
      const detail: StaffClientDetail = {
        id: client.id,
        name: client.name,
        phone: client.phone,
        allergies: client.skinId?.allergies ?? [],
        skinType: client.skinId?.skinType ?? "",
        visitObjective: client.skinId?.visitObjective ?? "",
        sunExposure: client.skinId?.sunExposure ?? "",
        aromatherapy: client.preferences?.aromatherapy ?? "",
        conversation: client.preferences?.conversationStyle ?? "",
        productsOwned: client.preferences?.productsOwned ?? [],
        treatmentHistory: client.appointments
          .filter((a) => a.treatmentRecord)
          .map((a) => ({
            protocol: a.treatmentRecord!.protocol.name,
            date: a.startAt.toISOString().slice(0, 10),
          })),
      };
      return <StaffClientsView listing={null} detail={detail} />;
    }
    // Unknown/invalid id — fall through to the search view below.
  }

  const clients = await prisma.client.findMany({
    where: { anonymizedAt: null },
    orderBy: { name: "asc" },
  });
  const listing: StaffClientListing[] = clients.map((c) => ({ id: c.id, name: c.name, phone: c.phone }));

  return <StaffClientsView listing={listing} detail={null} />;
}
