import { prisma } from "@/lib/prisma";
import { getCurrentAppUser } from "@/lib/auth/dal";
import { getTodayAppointments } from "@/lib/appointments";
import {
  StaffRetailTagsView,
  type RetailCatalogItem,
  type RetailTagsClient,
} from "@/components/panel/StaffRetailTagsView";

export default async function StaffRetailTags() {
  const romaNorte = await prisma.location.findFirst({ where: { name: "Roma Norte" } });
  const agenda = romaNorte ? await getTodayAppointments(romaNorte.id) : [];
  const currentUser = await getCurrentAppUser();

  // The esthetician's own most recently completed treatment today (last in
  // time order); falls back to the location's most recent completed
  // treatment for the role-toggle preview.
  const completed = agenda.filter((a) => a.statusRaw === "COMPLETED");
  const ownCompleted = currentUser ? completed.filter((a) => a.estheticianId === currentUser.id) : [];
  const target = ownCompleted[ownCompleted.length - 1] ?? completed[completed.length - 1] ?? null;

  let client: RetailTagsClient | null = null;
  let catalog: RetailCatalogItem[] = [];
  let initialSelected: string[] = [];

  if (target && romaNorte) {
    client = { appointmentId: target.id, clientName: target.clientName };

    const items = await prisma.inventoryItem.findMany({
      where: { locationId: romaNorte.id, product: { ledger: "RETAIL", isActive: true } },
      include: { product: true },
      orderBy: { product: { name: "asc" } },
    });
    catalog = items.map((i) => ({ sku: i.product.sku, product: i.product.name, price: i.priceMxn ?? 0 }));

    const record = await prisma.treatmentRecord.findUnique({
      where: { appointmentId: target.id },
      include: { retailTags: { include: { product: true } } },
    });
    initialSelected = record?.retailTags.map((t) => t.product.sku) ?? [];
  }

  return <StaffRetailTagsView client={client} catalog={catalog} initialSelected={initialSelected} />;
}
