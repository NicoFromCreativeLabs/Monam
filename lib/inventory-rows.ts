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
  marca: "brand",
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

// "2027-03-01" or "01/03/2027" (day first, as written in Mexico) → "2027-03-01".
// Anything else (a dash, text) is ignored rather than stored.
function toIsoDate(text: string | undefined): string | undefined {
  if (!text) return undefined;
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  return undefined;
}

export type ParsedInventoryRows = { rows: ImportInventoryRow[] } | { error: string };

const EXPECTED =
  "Columnas esperadas: SKU, Producto, Ubicacion, Cantidad, Par (y Ledger Piso/Backbar/Warehouse si no hay una hoja por ledger).";

// A sheet called Piso, Retail, Backbar or Warehouse (any case/accents) names its ledger.
export function ledgerFromSheetName(name: string): ImportInventoryRow["ledger"] | undefined {
  const k = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
  return { piso: "RETAIL", retail: "RETAIL", backbar: "BACKBAR", warehouse: "WAREHOUSE" }[k] as
    | ImportInventoryRow["ledger"]
    | undefined;
}

// `defaultLedger` is used for rows with no Ledger column — the workbook's sheet
// name (Piso / Backbar / Warehouse) says which ledger the rows are.
export function parseInventoryRecords(
  records: Record<string, string>[],
  defaultLedger?: ImportInventoryRow["ledger"],
): ParsedInventoryRows {
  if (records.length === 0) return { error: "El archivo está vacío o no se pudo leer." };

  const rows: ImportInventoryRow[] = [];
  for (const [index, record] of records.entries()) {
    const r: Record<string, string> = {};
    for (const [header, value] of Object.entries(record)) {
      const column = COLUMNS[key(header)];
      if (column) r[column] = (value ?? "").trim();
    }

    const ledger = CSV_LEDGER[r.ledger ?? ""] ?? defaultLedger;
    if (!ledger || !r.sku || !r.product || !r.location) {
      return { error: `${EXPECTED} Revisa la fila ${index + 2}.` };
    }
    const scope = /indiv/i.test(r.scope ?? "") ? "INDIVIDUAL" : /comun/i.test(r.scope ?? "") ? "COMMUNAL" : undefined;
    rows.push({
      sku: r.sku,
      product: r.product,
      brand: r.brand || undefined,
      ledger,
      locationName: r.location,
      qty: toNumber(r.qty) ?? 0,
      par: toNumber(r.par) ?? 0,
      priceMxn: toNumber(r.price),
      costMxn: toNumber(r.cost),
      contentMl: toNumber(r.contentMl),
      scope,
      paoDays: toNumber(r.paoDays),
      expiresOn: toIsoDate(r.expiresOn),
    });
  }
  return { rows };
}
