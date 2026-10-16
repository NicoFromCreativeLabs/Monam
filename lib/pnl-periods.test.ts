import { describe, expect, it } from "vitest";
import {
  applyOverrides,
  emptyBreakdown,
  monthHasEnded,
  monthKeyOfRange,
  nextMonthKey,
  normalizeSnapshot,
  parseMoneyInput,
  storedFromTyped,
  sumBreakdowns,
  typedFromStored,
} from "./pnl-periods";

describe("monthKeyOfRange", () => {
  it("recognizes a full previous month and the current month so far", () => {
    expect(monthKeyOfRange({ start: new Date(2026, 8, 1), end: new Date(2026, 9, 1) })).toBe("2026-09");
    expect(monthKeyOfRange({ start: new Date(2026, 9, 1), end: new Date(2026, 9, 16) })).toBe("2026-10");
  });

  it("returns null for ranges that are not exactly one month", () => {
    expect(monthKeyOfRange({ start: new Date(2026, 8, 16), end: new Date(2026, 9, 1) })).toBeNull();
    expect(monthKeyOfRange({ start: new Date(2026, 6, 1), end: new Date(2026, 9, 1) })).toBeNull();
    expect(monthKeyOfRange({ start: new Date(2026, 0, 1), end: new Date(2026, 9, 16) })).toBeNull();
  });
});

describe("monthHasEnded / nextMonthKey", () => {
  it("only lets a month be closed after it is over", () => {
    expect(monthHasEnded("2026-09", new Date(2026, 9, 1))).toBe(true);
    expect(monthHasEnded("2026-10", new Date(2026, 9, 16))).toBe(false);
  });

  it("rolls over the year", () => {
    expect(nextMonthKey("2026-09")).toBe("2026-10");
    expect(nextMonthKey("2026-12")).toBe("2027-01");
  });
});

describe("overrides and signs", () => {
  it("replaces only the overridden lines", () => {
    const base = { ...emptyBreakdown(), retail: 8601, costoRetailVendido: -3600 };
    const result = applyOverrides(base, { retail: 9000, notAField: 5 });
    expect(result.retail).toBe(9000);
    expect(result.costoRetailVendido).toBe(-3600);
  });

  it("stores costs as negative and shows them as positive", () => {
    expect(storedFromTyped("renta", 70000)).toBe(-70000);
    expect(storedFromTyped("renta", -70000)).toBe(-70000);
    expect(storedFromTyped("retail", 500)).toBe(500);
    expect(typedFromStored("renta", -70000)).toBe(70000);
  });

  it("sums breakdowns", () => {
    const a = { ...emptyBreakdown(), retail: 100 };
    const b = { ...emptyBreakdown(), retail: 50, merma: -10 };
    const total = sumBreakdowns([a, b]);
    expect(total.retail).toBe(150);
    expect(total.merma).toBe(-10);
  });

  it("normalizes a stored snapshot, defaulting missing lines to 0", () => {
    const snap = normalizeSnapshot({ retail: 5, junk: "x" });
    expect(snap.retail).toBe(5);
    expect(snap.addOns).toBe(0);
  });
});

describe("parseMoneyInput", () => {
  it("accepts whole pesos in common formats", () => {
    expect(parseMoneyInput("1,200")).toBe(1200);
    expect(parseMoneyInput("$ 500")).toBe(500);
    expect(parseMoneyInput("-50")).toBe(-50);
    expect(parseMoneyInput("(500)")).toBe(-500);
    expect(parseMoneyInput("0")).toBe(0);
  });

  it("rejects anything else", () => {
    expect(parseMoneyInput("")).toBeNull();
    expect(parseMoneyInput("12.5")).toBeNull();
    expect(parseMoneyInput("abc")).toBeNull();
  });
});
