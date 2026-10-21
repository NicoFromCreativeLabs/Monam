import { describe, expect, it } from "vitest";
import {
  evaluateCode,
  isValidCode,
  normalizeCode,
  suggestCode,
  validateNewCode,
  claimCheck,
  grantsOnSignup,
  modeKey,
  type DiscountCodeRule,
  type TicketContext,
} from "./discount-codes";

const rule = (over: Partial<DiscountCodeRule> = {}): DiscountCodeRule => ({
  code: "MONAM15",
  name: "15% bienvenida",
  kind: "PERCENT",
  value: 15,
  scope: "ALL",
  mode: "CHECKOUT",
  accountGrant: null,
  claimUntil: null,
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
  claim: { exists: false, used: false },
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

describe("account-bound discounts", () => {
  const account = (over: Partial<DiscountCodeRule> = {}) => rule({ mode: "ACCOUNT", accountGrant: "CLAIM", ...over });
  const claimed = { claim: { exists: true, used: false } };

  it("works once she has it in her account", () => {
    expect(evaluateCode(account(), ticket(claimed))).toMatchObject({ ok: true, amountMxn: 315 });
  });
  it("needs the client to be known and to have it", () => {
    expect(evaluateCode(account(), ticket({ ...claimed, hasClient: false }))).toMatchObject({ ok: false });
    expect(evaluateCode(account(), ticket())).toMatchObject({ ok: false });
  });
  it("cannot be used twice by the same account", () => {
    expect(evaluateCode(account(), ticket({ claim: { exists: true, used: true } }))).toMatchObject({ ok: false });
  });
  it("is not blocked by the checkout use limit (that counts claims instead)", () => {
    expect(evaluateCode(account({ maxUses: 1 }), ticket({ ...claimed, usesSoFar: 5 }))).toMatchObject({ ok: true });
  });
  it("still respects its dates and the active flag", () => {
    expect(evaluateCode(account({ validUntil: new Date("2026-10-20T00:00:00Z") }), ticket(claimed))).toMatchObject({ ok: false });
    expect(evaluateCode(account({ isActive: false }), ticket(claimed))).toMatchObject({ ok: false });
  });
  it("a checkout code works for anyone, with no account involved", () => {
    expect(evaluateCode(rule(), ticket({ hasClient: false }))).toMatchObject({ ok: true });
  });
});

describe("claimCheck", () => {
  const now = new Date("2026-11-30T12:00:00Z");
  const cyber = rule({ mode: "ACCOUNT", accountGrant: "CLAIM", validFrom: new Date("2026-11-29T00:00:00Z"), claimUntil: new Date("2026-12-01T00:00:00Z"), validUntil: new Date("2026-12-31T00:00:00Z"), maxUses: 100 });
  it("can be claimed inside the claim window", () => {
    expect(claimCheck(cyber, { now, claimsSoFar: 3, alreadyClaimed: false })).toEqual({ ok: true });
  });
  it("cannot be claimed twice, after the window, or once the limit is reached", () => {
    expect(claimCheck(cyber, { now, claimsSoFar: 3, alreadyClaimed: true })).toMatchObject({ ok: false });
    expect(claimCheck(cyber, { now: new Date("2026-12-02T00:00:00Z"), claimsSoFar: 3, alreadyClaimed: false })).toMatchObject({ ok: false });
    expect(claimCheck(cyber, { now, claimsSoFar: 100, alreadyClaimed: false })).toMatchObject({ ok: false });
  });
  it("is not claimable if it is a signup or checkout discount", () => {
    expect(claimCheck(rule(), { now, claimsSoFar: 0, alreadyClaimed: false })).toMatchObject({ ok: false });
    expect(claimCheck(rule({ mode: "ACCOUNT", accountGrant: "SIGNUP" }), { now, claimsSoFar: 0, alreadyClaimed: false })).toMatchObject({ ok: false });
  });
});

describe("grantsOnSignup / modeKey", () => {
  const launch = rule({ mode: "ACCOUNT", accountGrant: "SIGNUP" });
  it("gives a running launch discount to a new account", () => {
    expect(grantsOnSignup(launch, { now: new Date("2026-10-21T00:00:00Z"), claimsSoFar: 0 })).toBe(true);
  });
  it("does not once it ended, ran out or was turned off", () => {
    expect(grantsOnSignup({ ...launch, validUntil: new Date("2026-10-01T00:00:00Z") }, { now: new Date("2026-10-21T00:00:00Z"), claimsSoFar: 0 })).toBe(false);
    expect(grantsOnSignup({ ...launch, maxUses: 10 }, { now: new Date("2026-10-21T00:00:00Z"), claimsSoFar: 10 })).toBe(false);
    expect(grantsOnSignup({ ...launch, isActive: false }, { now: new Date("2026-10-21T00:00:00Z"), claimsSoFar: 0 })).toBe(false);
  });
  it("names the three kinds", () => {
    expect(modeKey(rule())).toBe("CHECKOUT");
    expect(modeKey(launch)).toBe("SIGNUP");
    expect(modeKey(rule({ mode: "ACCOUNT", accountGrant: "CLAIM" }))).toBe("CLAIM");
  });
});
