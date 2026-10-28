import { describe, it, expect } from "vitest";
import { buildReceiptPdf } from "./receipt-pdf";

describe("buildReceiptPdf", () => {
  it("produces a valid PDF buffer", async () => {
    const bytes = await buildReceiptPdf({
      clientName: "María López",
      locationName: "Roma Norte",
      dateLabel: "28 de octubre de 2026",
      saleId: "sale-abc-123",
      lines: [{ label: "Limpieza facial", priceMxn: 850 }],
      discountMxn: 0,
      totalMxn: 850,
    });
    expect(bytes.length).toBeGreaterThan(0);
    const header = Buffer.from(bytes.slice(0, 5)).toString("ascii");
    expect(header).toBe("%PDF-");
  });

  it("handles multiple lines and a discount without throwing", async () => {
    const bytes = await buildReceiptPdf({
      clientName: "Ana",
      locationName: "Roma Norte",
      dateLabel: "28 de octubre de 2026",
      saleId: "sale-xyz",
      lines: [
        { label: "Limpieza facial", priceMxn: 850 },
        { label: "Serum vitamina C", priceMxn: 420 },
      ],
      discountMxn: 100,
      totalMxn: 1170,
    });
    expect(bytes.length).toBeGreaterThan(0);
  });
});
