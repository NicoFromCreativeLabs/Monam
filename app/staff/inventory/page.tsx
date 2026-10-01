import { prisma } from "@/lib/prisma";
import { StaffInventoryView, type InventoryRow } from "@/components/panel/StaffInventoryView";

function formatDate(d: Date | null) {
  return d ? d.toISOString().slice(0, 10) : "—";
}

function paoLabel(days: number | null) {
  return days ? `${Math.round(days / 30)} meses` : "—";
}

// Front Desk owns stock levels at their own location — receiving shipments,
// correcting counts, spotting what's below par. Admin's Inventory screen
// covers both locations and the full catalog (add/remove products, CSV
// export); this is the location-scoped, quantity-only slice staff need day
// to day. Real InventoryItem rows now, across both locations — the view
// filters down to whichever location the previewed role is on, same as the
// rest of the staff-side pages.
export default async function StaffInventory() {
  const items = await prisma.inventoryItem.findMany({
    include: { product: true, location: true },
    orderBy: { product: { name: "asc" } },
  });

  const toRow = (i: (typeof items)[number]): InventoryRow => ({
    id: i.id,
    sku: i.product.sku,
    product: i.product.name,
    location: i.location.name,
    qty: i.qty,
    par: i.par,
    expiresOn: i.expiresOn ? formatDate(i.expiresOn) : undefined,
    opensOn: i.openedOn ? formatDate(i.openedOn) : undefined,
    pao: i.paoDays ? paoLabel(i.paoDays) : undefined,
  });

  const retail = items.filter((i) => i.product.ledger === "RETAIL").map(toRow);
  const backbar = items.filter((i) => i.product.ledger === "BACKBAR").map(toRow);
  const warehouse = items.filter((i) => i.product.ledger === "WAREHOUSE").map(toRow);

  return <StaffInventoryView retail={retail} backbar={backbar} warehouse={warehouse} />;
}
