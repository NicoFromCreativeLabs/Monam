import { TopBar } from "@/components/panel/TopBar";
import { AdminClientsTable, type AdminClientRow } from "@/components/panel/AdminClientsTable";
import { prisma } from "@/lib/prisma";

// Full-text search across the shared client database (spec §6.3).
// No bulk export control exists for any role but Owner — see Settings/Audit
// Log for the logged export action; there is none here on purpose.
//
// Real Client rows now (Client & Clinical phase) — "Última visita" and
// package/first-visit flags dropped from the old mock columns since there's
// no real Appointment/PackagePurchase data to derive them from yet
// (Booking/Commerce phases); allergies (safety-relevant) are real.
export default async function AdminClients() {
  const clients = await prisma.client.findMany({
    where: { anonymizedAt: null },
    include: { skinId: true },
    orderBy: { name: "asc" },
  });

  const rows: AdminClientRow[] = clients.map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    skinType: c.skinId?.skinType ?? "",
    allergies: c.skinId?.allergies.join(", ") ?? "",
  }));

  return (
    <>
      <TopBar title="Clientes" allowBothLocations />
      <div className="flex-1 px-8 py-6">
        <AdminClientsTable clients={rows} />
      </div>
    </>
  );
}
