import { describe, expect, it } from "vitest";
import {
  CLEAN_CHECKLIST,
  FRONT_DESK_CHECKLIST,
  canCheckOut,
  cashDifference,
  expectedCash,
  frontDeskCheckOutCheck,
  isShiftStale,
  shiftDurationLabel,
} from "./shift-rules";

describe("isShiftStale", () => {
  it("is false on the same Mexico City day", () => {
    // 15:00 and 23:00 UTC on Oct 17 are both Oct 17 in Mexico City
    expect(isShiftStale(new Date("2026-10-17T15:00:00Z"), new Date("2026-10-17T23:00:00Z"))).toBe(false);
  });
  it("is true once the studio day has changed", () => {
    expect(isShiftStale(new Date("2026-10-17T15:00:00Z"), new Date("2026-10-18T15:00:00Z"))).toBe(true);
  });
  it("judges by studio time, not UTC (21:00 local is already past midnight UTC)", () => {
    expect(isShiftStale(new Date("2026-10-17T20:00:00Z"), new Date("2026-10-18T02:00:00Z"))).toBe(false);
  });
});

describe("canCheckOut", () => {
  const all = CLEAN_CHECKLIST.map(() => true);
  it("needs every checklist item and the signature", () => {
    expect(canCheckOut({ checklist: all, cleanSignoff: true })).toBe(true);
    expect(canCheckOut({ checklist: all, cleanSignoff: false })).toBe(false);
    expect(canCheckOut({ checklist: [...all.slice(1), false], cleanSignoff: true })).toBe(false);
    expect(canCheckOut({ checklist: all.slice(1), cleanSignoff: true })).toBe(false);
  });
});

describe("shiftDurationLabel", () => {
  it("formats hours and minutes", () => {
    expect(shiftDurationLabel(new Date("2026-10-17T15:00:00Z"), new Date("2026-10-17T23:05:00Z"))).toBe("8 h 05 min");
    expect(shiftDurationLabel(new Date("2026-10-17T15:00:00Z"), new Date("2026-10-17T15:40:00Z"))).toBe("40 min");
  });
});

describe("front desk check-out", () => {
  const all = FRONT_DESK_CHECKLIST.map(() => true);
  const base = { checklist: all, signed: true, closesCaja: true, countedMxn: 2500, pendingCharges: 0, note: "" };

  it("passes with everything done", () => {
    expect(frontDeskCheckOutCheck(base)).toEqual({ ok: true });
  });
  it("needs every checklist point and the signature", () => {
    expect(frontDeskCheckOutCheck({ ...base, checklist: [...all.slice(1), false] })).toMatchObject({ ok: false });
    expect(frontDeskCheckOutCheck({ ...base, signed: false })).toMatchObject({ ok: false });
  });
  it("needs the cash count only from whoever closes the caja", () => {
    expect(frontDeskCheckOutCheck({ ...base, countedMxn: null })).toMatchObject({ ok: false });
    expect(frontDeskCheckOutCheck({ ...base, closesCaja: false, countedMxn: null })).toEqual({ ok: true });
    expect(frontDeskCheckOutCheck({ ...base, countedMxn: -5 })).toMatchObject({ ok: false });
  });
  it("needs a note when clients are still waiting to be charged", () => {
    expect(frontDeskCheckOutCheck({ ...base, pendingCharges: 2 })).toMatchObject({ ok: false });
    expect(frontDeskCheckOutCheck({ ...base, pendingCharges: 2, note: "Se fue sin pagar, la llamo mañana" })).toEqual({ ok: true });
  });
});

describe("cash", () => {
  it("expects the float plus the cash collected", () => {
    expect(expectedCash(2000, 1350)).toBe(3350);
  });
  it("reports the difference (positive = extra, negative = missing)", () => {
    expect(cashDifference(3300, 3350)).toBe(-50);
    expect(cashDifference(3400, 3350)).toBe(50);
    expect(cashDifference(3350, 3350)).toBe(0);
  });
});
