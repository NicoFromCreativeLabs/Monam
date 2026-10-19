"use client";

import { readSheet } from "read-excel-file/browser";
import writeXlsxFile from "write-excel-file/browser";
import { parseCsv } from "@/lib/csv";
import { parseInventoryRecords, type ParsedInventoryRows } from "@/lib/inventory-rows";

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
      const data = await readSheet(file);
      const [headerRow, ...body] = data;
      if (!headerRow) return { error: "El archivo está vacío o no se pudo leer." };
      const headers = headerRow.map(cellText);
      const records = body
        .filter((row) => row.some((c) => cellText(c) !== ""))
        .map((row) => Object.fromEntries(headers.map((h, i) => [h, cellText(row[i])])));
      return parseInventoryRecords(records);
    }
    if (/\.xls$/i.test(file.name)) {
      return { error: "Guarda el archivo como .xlsx (Excel moderno) o como CSV y vuelve a subirlo." };
    }
    return parseInventoryRecords(parseCsv(await file.text()));
  } catch {
    return { error: "No se pudo leer el archivo. Verifica que sea un .xlsx o .csv válido." };
  }
}

// Downloads the rows as an .xlsx the person can edit and upload back.
export async function downloadInventoryXlsx(
  filename: string,
  rows: Record<string, string | number | undefined>[],
): Promise<void> {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const sheet = [
    headers.map((h) => ({ value: h, fontWeight: "bold" as const })),
    ...rows.map((row) => headers.map((h) => (row[h] === undefined || row[h] === "" ? null : row[h]))),
  ];
  await writeXlsxFile(sheet).toFile(filename);
}
