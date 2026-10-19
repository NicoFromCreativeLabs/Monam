"use client";

import readXlsxFile from "read-excel-file/browser";
import writeXlsxFile from "write-excel-file/browser";
import { parseCsv } from "@/lib/csv";
import { ledgerFromSheetName, parseInventoryRecords, type ParsedInventoryRows } from "@/lib/inventory-rows";
import type { InventorySheet } from "@/lib/inventory-columns";
import type { ImportInventoryRow } from "@/lib/actions/commerce";

// Browser-side reading and writing of the inventory spreadsheet. An Excel file
// (.xlsx) or a CSV is accepted; both end up as the same import rows.

function cellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
}

export async function readInventoryFile(file: File): Promise<ParsedInventoryRows> {
  try {
    if (/\.xlsx$/i.test(file.name)) {
      // Every sheet is read: a sheet named Piso / Backbar / Warehouse gives its
      // rows that ledger; other sheets need a Ledger column.
      const sheets = await readXlsxFile(file);
      const rows: ImportInventoryRow[] = [];
      let sawData = false;
      for (const { sheet, data } of sheets) {
        const [headerRow, ...body] = data;
        if (!headerRow) continue;
        const headers = headerRow.map(cellText);
        const records = body
          .filter((row) => row.some((c) => cellText(c) !== ""))
          .map((row) => Object.fromEntries(headers.map((h, i) => [h, cellText(row[i])])));
        if (records.length === 0) continue;
        sawData = true;
        const parsed = parseInventoryRecords(records, ledgerFromSheetName(sheet));
        if ("error" in parsed) return { error: `Hoja "${sheet}": ${parsed.error}` };
        rows.push(...parsed.rows);
      }
      if (!sawData) return { error: "El archivo está vacío o no se pudo leer." };
      return { rows };
    }
    if (/\.xls$/i.test(file.name)) {
      return { error: "Guarda el archivo como .xlsx (Excel moderno) o como CSV y vuelve a subirlo." };
    }
    return parseInventoryRecords(parseCsv(await file.text()));
  } catch {
    return { error: "No se pudo leer el archivo. Verifica que sea un .xlsx o .csv válido." };
  }
}

// Downloads one .xlsx with a sheet per ledger (Piso, Backbar, Warehouse) that the
// person can edit and upload back.
export async function downloadInventoryWorkbook(filename: string, sheets: InventorySheet[]): Promise<void> {
  const data = sheets.map((sheet) => ({
    sheet: sheet.name,
    stickyRowsCount: 1,
    data: [
      sheet.columns.map((h) => ({ value: h, fontWeight: "bold" as const })),
      ...sheet.rows.map((row) => sheet.columns.map((h) => (row[h] === undefined || row[h] === "" ? null : row[h]))),
    ],
  }));
  await writeXlsxFile(data).toFile(filename);
}
