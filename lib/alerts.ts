import "server-only";
import { prisma } from "@/lib/prisma";

export interface AlertRow {
  id: string;
  text: string;
}

// What the Panel's "Alertas" KPI counts and what its "Alertas (seguridad ·
// anomalías · stock)" card lists have to be the exact same set — otherwise
// the tile promises a number nobody can find anywhere (the bug this fixes).
// Shared by app/admin/page.tsx (Panel) and app/admin/control/page.tsx
// (Control, where the KPI links to) so both read identically.
//
// "Low stock" only ever existed as a computed signal (qty < par), never a
// written Alert row, and only at active locations — Prado Norte isn't open
// yet (no rooms, still "Próximamente"), so its stock isn't something to
// act on.
export async function getOpenAlerts(): Promise<AlertRow[]> {
  const [realAlerts, inventoryItems] = await Promise.all([
    prisma.alert.findMany({ where: { readAt: null }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.inventoryItem.findMany({
      where: { location: { isActive: true } },
      include: { product: true, location: true },
    }),
  ]);

  const lowStock = inventoryItems.filter((i) => i.qty < i.par);

  return [
    ...realAlerts.map((a) => ({ id: a.id, text: a.text })),
    ...lowStock.map((i) => ({
      id: `low-stock-${i.id}`,
      text: `Bajo stock: ${i.product.name} — ${i.qty}/${i.par} en ${i.location.name}`,
    })),
  ];
}
