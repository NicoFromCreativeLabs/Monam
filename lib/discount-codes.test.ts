import { describe, expect, it } from "vitest";
import {
  evaluateCode,
  isValidCode,
  normalizeCode,
  suggestCode,
  validateNewCode,
  type DiscountCodeRule,
  type TicketContext,
} from "./discount-codes";

const rule = (over: Partial<DiscountCodeRule> = {}): DiscountCodeRule => ({
  code: "MONAM15",
  name: "15% bienvenida",
  kind: "PERCENT",
  value: 15,
  scope: "ALL",
  addOnId: null,
  productSku: null,
  validFrom: null,
  validUntil: null,
  maxUses: null,
  onePerClient: false,
  isActive: true,
  ...over,
});

const ticket = (over: Partial<TicketContext> = {}): TicketContext => ({
  now: new Date("2026-10-21T18:00:00Z"),
  usesSoFar: 0,
  clientUsesSoFar: 0,
  hasClient: true,
  servicePrice: 1000,
  addOns: [{ addOnId: "cupping", price: 200 }],
  retail: [{ sku: "AN-HT-150", price: 450, qty: 2 }],
  ...over,
});

describe("normalizeCode", () => {
  it("uppercases and strips what a code never has", () => {
    expect(normalizeCode("  monam 15! ")).toBe("MONAM15");
  });
  it("takes the code out of a scanned QR link", () => {
    expect(normalizeCode("https://monam.mx/d/monam-15?utm=1")).toBe("MONAM-15");
  });
});

describe("suggestCode / isValidCode", () => {
  it("suggests a valid, readable code", () => {
    const code = suggestCode(() => 0.5);
    expect(code.startsWith("MONAM-")).toBe(true);
    expect(isValidCode(code)).toBe(true);
  });
  it("rejects codes that are too short or have odd characters", () => {
    expect(isValidCode("AB")).toBe(false);
    expect(isValidCode("ab c")).toBe(false);
  });
});

describe("evaluateCode", () => {
  it("takes a percentage off the whole ticket", () => {
    // services 1200 + products 900 = 2100 → 15% = 315 (rounded)
    expect(evaluateCode(rule(), ticket())).toMatchObject({ ok: true, amountMxn: 315 });
  });
  it("limits a percentage to services or to products", () => {
    expect(evaluateCode(rule({ scope: "SERVICES" }), ticket())).toMatchObject({ amountMxn: 180 });
    expect(evaluateCode(rule({ scope: "PRODUCTS" }), ticket())).toMatchObject({ amountMxn: 135 });
  });
  it("caps a fixed amount at what it applies to", () => {
    expect(evaluateCode(rule({ kind: "AMOUNT", value: 500 }), ticket())).toMatchObject({ amountMxn: 500 });
    expect(evaluateCode(rule({ kind: "AMOUNT", value: 5000 }), ticket())).toMatchObject({ amountMxn: 2100 });
    expect(evaluateCode(rule({ kind: "AMOUNT", value: 5000, scope: "SERVICES" }), ticket())).toMatchObject({ amountMxn: 1200 });
  });
  it("refuses a scope with nothing in the ticket", () => {
    expect(evaluateCode(rule({ scope: "PRODUCTS" }), ticket({ retail: [] }))).toMatchObject({ ok: false });
  });
  it("gives a free add-on only when it is on the appointment", () => {
    expect(evaluateCode(rule({ kind: "FREE_ADD_ON", addOnId: "cupping" }), ticket())).toMatchObject({ ok: true, amountMxn: 200 });
    expect(evaluateCode(rule({ kind: "FREE_ADD_ON", addOnId: "other" }), ticket())).toMatchObject({ ok: false });
  });
  it("gives one unit of a free product", () => {
    expect(evaluateCode(rule({ kind: "FREE_PRODUCT", productSku: "AN-HT-150" }), ticket())).toMatchObject({ ok: true, amountMxn: 450 });
    expect(evaluateCode(rule({ kind: "FREE_PRODUCT", productSku: "X" }), ticket())).toMatchObject({ ok: false });
  });
  it("respects the dates, the active flag and the use limit", () => {
    expect(evaluateCode(rule({ isActive: false }), ticket())).toMatchObject({ ok: false });
    expect(evaluateCode(rule({ validUntil: new Date("2026-10-20T00:00:00Z") }), ticket())).toMatchObject({ ok: false });
    expect(evaluateCode(rule({ validFrom: new Date("2026-11-01T00:00:00Z") }), ticket())).toMatchObject({ ok: false });
    expect(evaluateCode(rule({ maxUses: 5 }), ticket({ usesSoFar: 5 }))).toMatchObject({ ok: false });
    expect(evaluateCode(rule({ maxUses: 5 }), ticket({ usesSoFar: 4 }))).toMatchObject({ ok: true });
  });
  it("enforces one use per client, and needs the client to be known", () => {
    expect(evaluateCode(rule({ onePerClient: true }), ticket({ clientUsesSoFar: 1 }))).toMatchObject({ ok: false });
    expect(evaluateCode(rule({ onePerClient: true }), ticket({ hasClient: false }))).toMatchObject({ ok: false });
    expect(evaluateCode(rule({ onePerClient: true }), ticket())).toMatchObject({ ok: true });
  });
});

describe("validateNewCode", () => {
  const base = { code: "MONAM15", name: "Bienvenida", kind: "PERCENT" as const, value: 15 };
  it("accepts a good code", () => {
    expect(validateNewCode(base)).toBeNull();
  });
  it("rejects out-of-range values and missing targets", () => {
    expect(validateNewCode({ ...base, value: 0 })).not.toBeNull();
    expect(validateNewCode({ ...base, value: 150 })).not.toBeNull();
    expect(validateNewCode({ ...base, kind: "FREE_ADD_ON" })).not.toBeNull();
    expect(validateNewCode({ ...base, kind: "FREE_PRODUCT" })).not.toBeNull();
    expect(validateNewCode({ ...base, maxUses: 0 })).not.toBeNull();
  });
  it("rejects an end date before the start", () => {
    expect(
      validateNewCode({ ...base, validFrom: new Date("2026-11-02"), validUntil: new Date("2026-11-01") }),
    ).not.toBeNull();
  });
});
