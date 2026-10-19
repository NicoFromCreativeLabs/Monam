import { describe, expect, it } from "vitest";
import { inventoryExportRow } from "./inventory-columns";
import { parseInventoryRecords } from "./inventory-rows";

const backbarItem = {
  sku: "PUR-CS-200B",
  product: "Purito Centella Serum (backbar)",
  location: "Roma Norte",
  qty: 5,
  par: 6,
  contentMl: 200,
  scope: "COMMUNAL" as const,
  paoDays: 60,
  cost: 950,
  expiresOn: "2027-03-01",
  openCount: 1,
  openMl: 120,
};

describe("inventoryExportRow", () => {
  it("carries the waste-control data for backbar", () => {
    expect(inventoryExportRow(backbarItem, "Backbar")).toMatchObject({
      "ML por envase": 200,
      Alcance: "Comunal",
      "Duracion (dias)": 60,
      Costo: 950,
      Caducidad: "2027-03-01",
      "Envases abiertos": 1,
      "ML abiertos": 120,
    });
  });

  it("leaves the backbar-only columns empty for retail and shows the price", () => {
    const row = inventoryExportRow({ sku: "A", product: "P", location: "Roma Norte", qty: 1, par: 2, price: 450, expiresOn: "—" }, "Piso");
    expect(row.Precio).toBe(450);
    expect(row["ML por envase"]).toBeUndefined();
    expect(row.Caducidad).toBeUndefined();
  });

  it("omits the cost column when it must stay hidden", () => {
    expect(Object.keys(inventoryExportRow(backbarItem, "Backbar", { includeCost: false }))).not.toContain("Costo");
  });

  it("round-trips: what is exported is read back unchanged", () => {
    const row = inventoryExportRow(backbarItem, "Backbar");
    const record = Object.fromEntries(Object.entries(row).map(([k, v]) => [k, v === undefined ? "" : String(v)]));
    expect(parseInventoryRecords([record])).toMatchObject({
      rows: [{ sku: "PUR-CS-200B", ledger: "BACKBAR", qty: 5, par: 6, contentMl: 200, scope: "COMMUNAL", paoDays: 60, costMxn: 950, expiresOn: "2027-03-01" }],
    });
  });
});
