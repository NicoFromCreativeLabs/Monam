import { CSV_LEDGER } from "@/lib/csv";
import type { ImportInventoryRow } from "@/lib/actions/commerce";

// Turns the rows of an inventory spreadsheet (already split into
// header → text records, from a CSV or an Excel file) into import rows.
// Pure, so the staff and admin screens and the tests read a file the same way.
// Headers are matched ignoring case, accents and spaces, so "Ubicación",
// "ubicacion" and "UBICACION" are all the same column.

function key(header: string): string {
  return header
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

const COLUMNS: Record<string, string> = {
  sku: "sku",
  producto: "product",
  ledger: "ledger",
  ubicacion: "location",
  cantidad: "qty",
  par: "par",
  precio: "price",
  costo: "cost",
  mlporenvase: "contentMl",
  alcance: "scope",
  duraciondias: "paoDays",
  caducidad: "expiresOn",
  vence: "expiresOn",
};

function toNumber(text: string | undefined): number | undefined {
  if (text === undefined || text.trim() === "") return undefined;
  const n = Number(text.replace(/[$,\s]/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

export type ParsedInventoryRows = { rows: ImportInventoryRow[] } | { error: string };

const EXPECTED = "Columnas esperadas: SKU, Producto, Ledger (Piso/Backbar/Warehouse), Ubicacion, Cantidad, Par.";

export function parseInventoryRecords(records: Record<string, string>[]): ParsedInventoryRows {
  if (records.length === 0) return { error: "El archivo está vacío o no se pudo leer." };

  const rows: ImportInventoryRow[] = [];
  for (const [index, record] of records.entries()) {
    const r: Record<string, string> = {};
    for (const [header, value] of Object.entries(record)) {
      const column = COLUMNS[key(header)];
      if (column) r[column] = (value ?? "").trim();
    }

    const ledger = CSV_LEDGER[r.ledger ?? ""];
    if (!ledger || !r.sku || !r.product || !r.location) {
      return { error: `${EXPECTED} Revisa la fila ${index + 2}.` };
    }
    const scope = /indiv/i.test(r.scope ?? "") ? "INDIVIDUAL" : /comun/i.test(r.scope ?? "") ? "COMMUNAL" : undefined;
    rows.push({
      sku: r.sku,
      product: r.product,
      ledger,
      locationName: r.location,
      qty: toNumber(r.qty) ?? 0,
      par: toNumber(r.par) ?? 0,
      priceMxn: toNumber(r.price),
      costMxn: toNumber(r.cost),
      contentMl: toNumber(r.contentMl),
      scope,
      paoDays: toNumber(r.paoDays),
      expiresOn: r.expiresOn || undefined,
    });
  }
  return { rows };
}
