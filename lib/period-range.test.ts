import { describe, it, expect } from "vitest";
import { periodRange, compareRange } from "./period-range";

const NOW = new Date(2026, 9, 15); // Oct 15, 2026 — mid-month, mid-quarter

describe("periodRange", () => {
  it("Mes en curso is month-to-date, not the full month", () => {
    const { start, end } = periodRange("Mes en curso", NOW);
    expect(start).toEqual(new Date(2026, 9, 1));
    expect(end).toEqual(NOW);
  });

  it("Mes anterior is the full previous calendar month", () => {
    const { start, end } = periodRange("Mes anterior", NOW);
    expect(start).toEqual(new Date(2026, 8, 1));
    expect(end).toEqual(new Date(2026, 9, 1));
  });

  it("Trimestre en curso starts at the quarter boundary, not the month", () => {
    const { start, end } = periodRange("Trimestre en curso", NOW);
    expect(start).toEqual(new Date(2026, 9, 1)); // Q4 starts October
    expect(end).toEqual(NOW);
  });

  it("Año en curso starts January 1st", () => {
    const { start, end } = periodRange("Año en curso", NOW);
    expect(start).toEqual(new Date(2026, 0, 1));
    expect(end).toEqual(NOW);
  });
});

describe("compareRange", () => {
  it("Mes anterior comparison is the equivalent-length window immediately before the period", () => {
    const { start, end } = compareRange("Mes anterior", "Mes en curso", NOW);
    // Current range is Oct 1 - Oct 15 (14 days); baseline should be the 14
    // days immediately before Oct 1.
    expect(end).toEqual(new Date(2026, 9, 1));
    expect(end.getTime() - start.getTime()).toBe(NOW.getTime() - new Date(2026, 9, 1).getTime());
  });

  it("Mismo mes año anterior shifts the exact same range back one year", () => {
    const { start, end } = compareRange("Mismo mes año anterior", "Mes en curso", NOW);
    expect(start).toEqual(new Date(2025, 9, 1));
    expect(end).toEqual(new Date(2025, 9, 15));
  });

  it("scales the comparison window to match a quarter-length period, not always 'last month'", () => {
    const current = periodRange("Trimestre en curso", NOW);
    const { start, end } = compareRange("Mes anterior", "Trimestre en curso", NOW);
    const currentSpan = current.end.getTime() - current.start.getTime();
    const baselineSpan = end.getTime() - start.getTime();
    expect(baselineSpan).toBe(currentSpan);
    expect(end).toEqual(current.start);
  });
});
