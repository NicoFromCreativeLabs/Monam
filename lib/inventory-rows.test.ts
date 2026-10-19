import { describe, expect, it } from "vitest";
import { parseInventoryRecords } from "./inventory-rows";

describe("parseInventoryRecords", () => {
  it("reads the round-trip columns", () => {
    const result = parseInventoryRecords([
      { SKU: "AN-HT-150", Producto: "Anua Toner", Ledger: "Piso", Ubicacion: "Roma Norte", Cantidad: "9", Par: "8" },
    ]);
    expect(result).toEqual({
      rows: [
        {
          sku: "AN-HT-150",
          product: "Anua Toner",
          ledger: "RETAIL",
          locationName: "Roma Norte",
          qty: 9,
          par: 8,
          priceMxn: undefined,
          costMxn: undefined,
          contentMl: undefined,
          scope: undefined,
          paoDays: undefined,
          expiresOn: undefined,
        },
      ],
    });
  });

  it("ignores case, accents and spaces in headers, and reads the optional columns", () => {
    const result = parseInventoryRecords([
      {
        sku: "X",
        PRODUCTO: "Suero",
        " Ledger ": "Backbar",
        Ubicación: "Roma Norte",
        cantidad: "2",
        Par: "1",
        "ML por envase": "200",
        Alcance: "Individual",
        "Duración (días)": "60",
        Costo: "$1,250",
        Caducidad: "2027-03-01",
      },
    ]);
    expect(result).toMatchObject({
      rows: [{ ledger: "BACKBAR", contentMl: 200, scope: "INDIVIDUAL", paoDays: 60, costMxn: 1250, expiresOn: "2027-03-01" }],
    });
  });

  it("reads Precio and Vence from the retail export", () => {
    const result = parseInventoryRecords([
      { SKU: "A", Producto: "P", Ledger: "Piso", Ubicacion: "Roma Norte", Cantidad: "1", Par: "1", Precio: "450", Vence: "2027-01-15" },
    ]);
    expect(result).toMatchObject({ rows: [{ priceMxn: 450, expiresOn: "2027-01-15" }] });
  });

  it("names the row that is missing a required value", () => {
    const result = parseInventoryRecords([
      { SKU: "A", Producto: "P", Ledger: "Piso", Ubicacion: "Roma Norte", Cantidad: "1", Par: "1" },
      { SKU: "", Producto: "P2", Ledger: "Piso", Ubicacion: "Roma Norte", Cantidad: "1", Par: "1" },
    ]);
    expect(result).toEqual({ error: expect.stringContaining("fila 3") });
  });

  it("rejects an empty file", () => {
    expect(parseInventoryRecords([])).toEqual({ error: expect.stringContaining("vacío") });
  });
});
