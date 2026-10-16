import { prisma } from "@/lib/prisma";
import { requireStaffRole } from "@/lib/auth/dal";
import { isExpired } from "@/lib/containers";
import { StaffOpenProductView } from "@/components/panel/StaffOpenProductView";

export default async function StaffOpenProduct() {
  const user = await requireStaffRole(["ESTHETICIAN", "FRONT_DESK", "OWNER", "CLINIC_MANAGER"]);
  const location = await prisma.location.findFirst({ where: { name: "Roma Norte" } });
  if (!location) return <StaffOpenProductView products={[]} rooms={[]} open={[]} />;

  const [items, rooms] = await Promise.all([
    prisma.inventoryItem.findMany({
      where: { locationId: location.id, product: { ledger: "BACKBAR", isActive: true } },
      include: { product: true },
      orderBy: { product: { name: "asc" } },
    }),
    prisma.room.findMany({ where: { locationId: location.id }, orderBy: { name: "asc" } }),
  ]);
  const containers = items.length
    ? await prisma.openContainer.findMany({
        where: { inventoryItemId: { in: items.map((i) => i.id) }, status: "OPEN" },
        orderBy: { openedAt: "asc" },
      })
    : [];
  const owners = await prisma.appUser.findMany({
    where: { id: { in: containers.flatMap((c) => (c.ownerUserId ? [c.ownerUserId] : [])) } },
    select: { id: true, name: true },
  });

  return (
    <StaffOpenProductView
      products={items.map((i) => ({
        id: i.id,
        name: i.product.name,
        sealed: i.qty,
        contentMl: i.contentMl,
        paoDays: i.paoDays,
        scope: i.scope,
      }))}
      rooms={rooms.map((r) => ({ id: r.id, name: r.name }))}
      open={containers.map((c) => {
        const item = items.find((i) => i.id === c.inventoryItemId)!;
        return {
          id: c.id,
          productName: item.product.name,
          scope: c.scope,
          where:
            c.scope === "COMMUNAL"
              ? (rooms.find((r) => r.id === c.roomId)?.name ?? "Cabina")
              : (owners.find((o) => o.id === c.ownerUserId)?.name ?? "Esteticista"),
          mine: c.ownerUserId === user.id,
          remainingMl: c.remainingMl,
          contentMl: c.contentMl,
          expiresOn: c.expiresOn.toISOString(),
          expired: isExpired(c.expiresOn),
        };
      })}
    />
  );
}
