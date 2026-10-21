import { describe, expect, it } from "vitest";
import { parseDate, parseTime } from "./parse";

const TODAY = "2026-10-21"; // a Wednesday

describe("parseDate", () => {
  it("reads hoy, mañana and pasado mañana", () => {
    expect(parseDate("hoy", TODAY)).toBe("2026-10-21");
    expect(parseDate("Mañana", TODAY)).toBe("2026-10-22");
    expect(parseDate("pasado mañana", TODAY)).toBe("2026-10-23");
  });
  it("reads a weekday as the next one", () => {
    expect(parseDate("sábado", TODAY)).toBe("2026-10-24");
    expect(parseDate("el lunes", TODAY)).toBe("2026-10-26");
    expect(parseDate("miércoles", TODAY)).toBe("2026-10-28"); // today is Wednesday: next week's
  });
  it("reads DD/MM, DD/MM/YYYY and ISO dates", () => {
    expect(parseDate("30/10", TODAY)).toBe("2026-10-30");
    expect(parseDate("5-11", TODAY)).toBe("2026-11-05");
    expect(parseDate("02/03/2027", TODAY)).toBe("2027-03-02");
    expect(parseDate("2026-12-01", TODAY)).toBe("2026-12-01");
  });
  it("rolls a DD/MM that already passed to next year", () => {
    expect(parseDate("15/01", TODAY)).toBe("2027-01-15");
  });
  it("rejects what is not a date", () => {
    expect(parseDate("31/02", TODAY)).toBeNull();
    expect(parseDate("cuando puedan", TODAY)).toBeNull();
  });
});

describe("parseTime", () => {
  it("reads 24h and am/pm times", () => {
    expect(parseTime("10:00")).toBe("10:00");
    expect(parseTime("2pm")).toBe("14:00");
    expect(parseTime("2:30 pm")).toBe("14:30");
    expect(parseTime("12am")).toBe("00:00");
    expect(parseTime("17")).toBe("17:00");
  });
  it("reads a bare 1-7 as the afternoon", () => {
    expect(parseTime("4")).toBe("16:00");
    expect(parseTime("11")).toBe("11:00");
  });
  it("rejects what is not a time", () => {
    expect(parseTime("tarde")).toBeNull();
    expect(parseTime("25:00")).toBeNull();
  });
});
