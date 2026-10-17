import { describe, expect, it } from "vitest";
import { CLEAN_CHECKLIST, canCheckOut, isShiftStale, shiftDurationLabel } from "./shift-rules";

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
