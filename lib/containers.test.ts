import { describe, expect, it } from "vitest";
import { allocateMl, containerLimit, usableMl } from "./containers";

const NOW = new Date("2026-10-16T12:00:00Z");
const day = (n: number) => new Date(NOW.getTime() + n * 86400000);

describe("containerLimit", () => {
  it("uses the period after opening when it comes before the lot expiry", () => {
    expect(containerLimit(NOW, 30, day(200)).getTime()).toBe(day(30).getTime());
  });

  it("uses the lot expiry when it comes first", () => {
    expect(containerLimit(NOW, 180, day(20)).getTime()).toBe(day(20).getTime());
  });

  it("uses only the period after opening when the lot has no expiry", () => {
    expect(containerLimit(NOW, 10, null).getTime()).toBe(day(10).getTime());
  });
});

describe("allocateMl", () => {
  const a = { id: "a", remainingMl: 30, openedAt: day(-5), expiresOn: day(10) };
  const b = { id: "b", remainingMl: 100, openedAt: day(-1), expiresOn: day(20) };

  it("takes from one container when it is enough", () => {
    expect(allocateMl([a, b], 20, NOW)).toEqual([{ containerId: "a", ml: 20, remainingAfter: 10 }]);
  });

  it("spills over to the next container, oldest first", () => {
    expect(allocateMl([b, a], 50, NOW)).toEqual([
      { containerId: "a", ml: 30, remainingAfter: 0 },
      { containerId: "b", ml: 20, remainingAfter: 80 },
    ]);
  });

  it("returns null (and takes nothing) when there is not enough", () => {
    expect(allocateMl([a], 31, NOW)).toBeNull();
  });

  it("ignores expired containers and invalid amounts", () => {
    const expired = { id: "x", remainingMl: 500, openedAt: day(-100), expiresOn: day(-1) };
    expect(allocateMl([expired], 5, NOW)).toBeNull();
    expect(allocateMl([a], 0, NOW)).toBeNull();
  });
});

describe("usableMl", () => {
  it("adds up the unexpired containers only", () => {
    const expired = { id: "x", remainingMl: 500, openedAt: day(-100), expiresOn: day(-1) };
    expect(usableMl([{ id: "a", remainingMl: 30, openedAt: day(-5), expiresOn: day(10) }, expired], NOW)).toBe(30);
  });
});
