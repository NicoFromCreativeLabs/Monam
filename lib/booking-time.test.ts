import { describe, expect, it } from "vitest";
import { isSlotInPast, studioNow } from "./booking-time";

// 2026-10-16 17:16 in Mexico City (UTC-6 in October) is 23:16 UTC.
const NOW = new Date("2026-10-16T23:16:00Z");

describe("studioNow", () => {
  it("reads the Mexico City wall clock whatever the server time zone is", () => {
    expect(studioNow(NOW)).toEqual({ date: "2026-10-16", time: "17:16" });
  });

  it("rolls the date over when UTC is already tomorrow", () => {
    expect(studioNow(new Date("2026-10-17T03:30:00Z"))).toEqual({ date: "2026-10-16", time: "21:30" });
  });
});

describe("isSlotInPast", () => {
  it("rejects earlier slots today and accepts later ones", () => {
    expect(isSlotInPast("2026-10-16", "10:00", NOW)).toBe(true);
    expect(isSlotInPast("2026-10-16", "17:16", NOW)).toBe(true);
    expect(isSlotInPast("2026-10-16", "17:30", NOW)).toBe(false);
  });

  it("handles other days", () => {
    expect(isSlotInPast("2026-10-15", "19:00", NOW)).toBe(true);
    expect(isSlotInPast("2026-10-17", "10:00", NOW)).toBe(false);
  });
});
