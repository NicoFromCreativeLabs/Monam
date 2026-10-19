import { describe, expect, it } from "vitest";
import { closingTimeToday, isShiftOverdue } from "./shift-overdue";

// 2026-10-19 is a Monday (closes 20:00); Mexico City is UTC-6 in October.
describe("closingTimeToday", () => {
  it("reads the closing time of the Mexico City weekday", () => {
    expect(closingTimeToday(new Date("2026-10-19T18:00:00Z"))).toBe("20:00"); // Monday 12:00
    expect(closingTimeToday(new Date("2026-10-20T18:00:00Z"))).toBe("18:00"); // Tuesday closes earlier
    expect(closingTimeToday(new Date("2026-10-24T18:00:00Z"))).toBe("19:00"); // Saturday
  });
});

describe("isShiftOverdue", () => {
  const checkIn = new Date("2026-10-19T15:30:00Z"); // Monday 09:30

  it("is not overdue during the day", () => {
    expect(isShiftOverdue(checkIn, new Date("2026-10-19T22:00:00Z"))).toBe(false); // 16:00
  });
  it("is not overdue right after closing, within the grace hour", () => {
    expect(isShiftOverdue(checkIn, new Date("2026-10-20T01:30:00Z"))).toBe(false); // Monday 19:30 local... before close
    expect(isShiftOverdue(checkIn, new Date("2026-10-20T02:30:00Z"))).toBe(false); // 20:30 local, grace until 21:00
  });
  it("is overdue an hour after closing", () => {
    expect(isShiftOverdue(checkIn, new Date("2026-10-20T03:00:00Z"))).toBe(true); // 21:00 local
  });
  it("is overdue once the studio day has changed", () => {
    expect(isShiftOverdue(checkIn, new Date("2026-10-20T15:00:00Z"))).toBe(true); // next day 09:00
  });
});
