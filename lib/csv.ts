import type { LedgerName } from "@/lib/actions/commerce";

// Maps the CSV's "Ledger" column (Piso/Retail/Backbar/Warehouse, matching
// AdminInventoryView's export labels) to the DB's LedgerName.
export const CSV_LEDGER: Record<string, LedgerName> = {
  Piso: "RETAIL",
  Retail: "RETAIL",
  Backbar: "BACKBAR",
  Warehouse: "WAREHOUSE",
};

// Client-side CSV export — no backend needed, and CSV opens directly in
// Excel. A UTF-8 BOM is prepended so Excel renders accented Spanish text
// (á, é, í, ó, ú, ñ) correctly instead of mojibake.
export function downloadCsv(filename: string, rows: Record<string, string | number>[]) {
  if (rows.length === 0) return;

  const headers = Object.keys(rows[0]);
  const escape = (value: string | number) => {
    const str = String(value);
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };

  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(",")),
  ];

  const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Minimal CSV parser for the round-trip case: a file previously produced by
// downloadCsv (comma-separated, double-quote escaping, optional UTF-8 BOM).
// Not a general-purpose parser — doesn't handle alternate delimiters or
// multi-line quoted fields beyond what Excel/Sheets produce for this shape.
export function parseCsv(text: string): Record<string, string>[] {
  const clean = text.replace(/^﻿/, "").replace(/\r\n/g, "\n").trim();
  if (!clean) return [];

  function parseLine(line: string): string[] {
    const fields: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          cur += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        fields.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    fields.push(cur);
    return fields;
  }

  const [headerLine, ...rows] = clean.split("\n");
  const headers = parseLine(headerLine).map((h) => h.trim());
  return rows
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const values = parseLine(line);
      const row: Record<string, string> = {};
      headers.forEach((h, i) => {
        row[h] = (values[i] ?? "").trim();
      });
      return row;
    });
}
