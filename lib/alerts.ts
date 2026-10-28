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
// "Low stock" and "expiring soon / expired" only ever existed as computed
// signals (qty < par; expiresOn within a week or already past), never a
// written Alert row, and only at active locations — Prado Norte isn't open
// yet (no rooms, still "Próximamente"), so its stock isn't something to
// act on.
const EXPIRY_WARNING_DAYS = 7;

function formatExpiry(date: Date): string {
  return date.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
}

export async function getOpenAlerts(): Promise<AlertRow[]> {
  const [realAlerts, inventoryItems] = await Promise.all([
    prisma.alert.findMany({ where: { readAt: null }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.inventoryItem.findMany({
      where: { location: { isActive: true } },
      include: { product: true, location: true },
    }),
  ]);

  const lowStock = inventoryItems.filter((i) => i.qty < i.par);

  const now = new Date();
  const warnFrom = new Date(now.getTime() + EXPIRY_WARNING_DAYS * 86400000);
  const expiring = inventoryItems
    .filter((i) => i.qty > 0 && i.expiresOn && i.expiresOn <= warnFrom)
    .sort((a, b) => a.expiresOn!.getTime() - b.expiresOn!.getTime());

  return [
    ...realAlerts.map((a) => ({ id: a.id, text: a.text })),
    ...expiring.map((i) => ({
      id: `expiring-${i.id}`,
      text:
        i.expiresOn! < now
          ? `Caducado: ${i.product.name} — venció el ${formatExpiry(i.expiresOn!)} en ${i.location.name}`
          : `Por caducar: ${i.product.name} — vence el ${formatExpiry(i.expiresOn!)} en ${i.location.name}`,
    })),
    ...lowStock.map((i) => ({
      id: `low-stock-${i.id}`,
      text: `Bajo stock: ${i.product.name} — ${i.qty}/${i.par} en ${i.location.name}`,
    })),
  ];
}
