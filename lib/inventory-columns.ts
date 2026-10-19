// The one spreadsheet format for inventory, used by every download (staff and
// admin, every tab) and read back by the upload. It carries everything the
// stock and the waste (merma) control rely on: price, cost, ml per container,
// shared-per-cabina vs individual, days it lasts once opened, and the lot's
// expiry — so a file can be edited and uploaded back without losing any of it.
// Pure, so it is shared and tested.

export type LedgerLabel = "Piso" | "Backbar" | "Warehouse";

export interface ExportableInventoryItem {
  sku: string;
  product: string;
  location: string;
  qty: number;
  par: number;
  price?: number | null; // retail sale price
  cost?: number | null; // wholesale cost, or cost per container for backbar
  contentMl?: number | null; // backbar: ml in one sealed container
  scope?: "COMMUNAL" | "INDIVIDUAL" | null; // backbar
  paoDays?: number | null; // backbar: days it lasts once opened
  expiresOn?: string | null; // lot expiry, YYYY-MM-DD
  openCount?: number | null; // backbar: containers open now (information only)
  openMl?: number | null; // backbar: ml left in them (information only)
}

export type InventoryExportRow = Record<string, string | number | undefined>;

const positive = (n: number | null | undefined) => (n && n > 0 ? n : undefined);
const isoDate = (s: string | null | undefined) => (s && /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : undefined);

// `includeCost: false` leaves the cost column out entirely (staff who must not
// see costs); a file without it simply does not touch costs when uploaded.
export function inventoryExportRow(
  item: ExportableInventoryItem,
  ledger: LedgerLabel,
  options: { includeCost?: boolean } = {},
): InventoryExportRow {
  const { includeCost = true } = options;
  const backbar = ledger === "Backbar";
  return {
    SKU: item.sku,
    Producto: item.product,
    Ledger: ledger,
    Ubicacion: item.location,
    Cantidad: item.qty,
    Par: item.par,
    Precio: ledger === "Piso" ? positive(item.price) : undefined,
    ...(includeCost ? { Costo: positive(item.cost) } : {}),
    "ML por envase": backbar ? positive(item.contentMl) : undefined,
    Alcance: backbar && item.scope ? (item.scope === "COMMUNAL" ? "Comunal" : "Individual") : undefined,
    "Duracion (dias)": backbar ? positive(item.paoDays) : undefined,
    Caducidad: isoDate(item.expiresOn),
    "Envases abiertos": backbar ? (item.openCount ?? 0) : undefined,
    "ML abiertos": backbar ? (item.openMl ?? 0) : undefined,
  };
}

// The workbook has one sheet per ledger; each shows only the columns that apply
// to it. The sheet name tells the upload which ledger the rows belong to.
export const SHEET_COLUMNS: Record<LedgerLabel, string[]> = {
  Piso: ["SKU", "Producto", "Ubicacion", "Cantidad", "Par", "Precio", "Costo", "Caducidad"],
  Backbar: [
    "SKU",
    "Producto",
    "Ubicacion",
    "Cantidad",
    "Par",
    "Costo",
    "ML por envase",
    "Alcance",
    "Duracion (dias)",
    "Caducidad",
    "Envases abiertos",
    "ML abiertos",
  ],
  Warehouse: ["SKU", "Producto", "Ubicacion", "Cantidad", "Par", "Costo", "Caducidad"],
};

export interface InventorySheet {
  name: LedgerLabel;
  columns: string[];
  rows: InventoryExportRow[];
}

export function inventorySheet(
  ledger: LedgerLabel,
  items: ExportableInventoryItem[],
  options: { includeCost?: boolean } = {},
): InventorySheet {
  const { includeCost = true } = options;
  const columns = SHEET_COLUMNS[ledger].filter((c) => includeCost || c !== "Costo");
  const rows = items.map((item) => {
    const full = inventoryExportRow(item, ledger, options);
    return Object.fromEntries(columns.map((c) => [c, full[c]]));
  });
  return { name: ledger, columns, rows };
}
