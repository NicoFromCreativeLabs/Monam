import { describe, it, expect } from "vitest";
import { buildWelcomeReceiptEmailHtml } from "./receipt";

function input(overrides: Partial<Parameters<typeof buildWelcomeReceiptEmailHtml>[0]> = {}) {
  return {
    clientName: "María López",
    locationName: "Roma Norte",
    dateLabel: "28 de octubre de 2026",
    lines: [{ label: "Limpieza facial", priceMxn: 850 }],
    discountMxn: 0,
    totalMxn: 850,
    passwordSetupUrl: "https://monam.mx/auth/confirm?token_hash=abc&type=recovery&next=/auth/update-password",
    pdfUrl: "https://monam.mx/api/receipts/sale-123/pdf?token=def",
    deleteAccountUrl: "https://monam.mx/eliminar-cuenta?clientId=client-123&token=ghi",
    ...overrides,
  };
}

describe("buildWelcomeReceiptEmailHtml", () => {
  it("includes every line item and the total", () => {
    const html = buildWelcomeReceiptEmailHtml(
      input({ lines: [{ label: "Limpieza facial", priceMxn: 850 }, { label: "Serum vitamina C", priceMxn: 420 }], totalMxn: 1270 }),
    );
    expect(html).toContain("Limpieza facial");
    expect(html).toContain("$850 MXN");
    expect(html).toContain("Serum vitamina C");
    expect(html).toContain("$420 MXN");
    expect(html).toContain("Total: $1,270 MXN");
  });

  it("shows a discount row only when there is a discount", () => {
    const withDiscount = buildWelcomeReceiptEmailHtml(input({ discountMxn: 100 }));
    expect(withDiscount).toContain("Descuento");
    expect(withDiscount).toContain("-$100 MXN");

    const withoutDiscount = buildWelcomeReceiptEmailHtml(input({ discountMxn: 0 }));
    expect(withoutDiscount).not.toContain("Descuento");
  });

  it("includes the password-setup link", () => {
    const html = buildWelcomeReceiptEmailHtml(input());
    expect(html).toContain('href="https://monam.mx/auth/confirm?token_hash=abc&type=recovery&next=/auth/update-password"');
  });

  it("includes the Descargar PDF button", () => {
    const html = buildWelcomeReceiptEmailHtml(input());
    expect(html).toContain('href="https://monam.mx/api/receipts/sale-123/pdf?token=def"');
    expect(html).toContain("Descargar PDF");
  });

  it("includes the delete-account link", () => {
    const html = buildWelcomeReceiptEmailHtml(input());
    expect(html).toContain('href="https://monam.mx/eliminar-cuenta?clientId=client-123&token=ghi"');
    expect(html).toContain("eliminar tu cuenta y tus datos");
  });

  it("escapes HTML-unsafe characters in the client name and line labels", () => {
    const html = buildWelcomeReceiptEmailHtml(
      input({ clientName: `<script>alert("x")</script>`, lines: [{ label: "A & B <tag>", priceMxn: 100 }] }),
    );
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("A &amp; B &lt;tag&gt;");
  });
});
