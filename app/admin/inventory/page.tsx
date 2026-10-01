import { prisma } from "@/lib/prisma";
import {
  AdminInventoryView,
  type RetailInventoryRow,
  type BackbarInventoryRow,
  type WarehouseInventoryRow,
} from "@/components/panel/AdminInventoryView";

function formatDate(d: Date | null) {
  return d ? d.toISOString().slice(0, 10) : "—";
}

function paoLabel(days: number | null) {
  return days ? `${Math.round(days / 30)} meses` : "—";
}

// Three ledgers, kept logically separate (spec §5.3: "never merge into one
// stock line") — Piso (retail floor stock for sale), Backbar (opened, in
// active clinic use), and Warehouse (sealed bulk stock received but not yet
// moved to either). Ledger lives on Product (a discriminator column), so
// each ledger's catalog is really a different set of Products; InventoryItem
// just holds the per-location qty/par/cost for whichever product it is.
export default async function AdminInventory() {
  const items = await prisma.inventoryItem.findMany({
    include: { product: true, location: true },
    orderBy: { product: { name: "asc" } },
  });

  const retail: RetailInventoryRow[] = items
    .filter((i) => i.product.ledger === "RETAIL")
    .map((i) => ({
      id: i.id,
      sku: i.product.sku,
      product: i.product.name,
      location: i.location.name,
      qty: i.qty,
      par: i.par,
      price: i.priceMxn ?? 0,
      cost: i.costMxn ?? 0,
      expiresOn: formatDate(i.expiresOn),
    }));

  const backbar: BackbarInventoryRow[] = items
    .filter((i) => i.product.ledger === "BACKBAR")
    .map((i) => ({
      id: i.id,
      sku: i.product.sku,
      product: i.product.name,
      location: i.location.name,
      qty: i.qty,
      par: i.par,
      opensOn: formatDate(i.openedOn),
      pao: paoLabel(i.paoDays),
    }));

  const warehouse: WarehouseInventoryRow[] = items
    .filter((i) => i.product.ledger === "WAREHOUSE")
    .map((i) => ({
      id: i.id,
      sku: i.product.sku,
      product: i.product.name,
      location: i.location.name,
      qty: i.qty,
      par: i.par,
      cost: i.costMxn ?? 0,
      expiresOn: formatDate(i.expiresOn),
    }));

  return <AdminInventoryView initialRetail={retail} initialBackbar={backbar} initialWarehouse={warehouse} />;
}
