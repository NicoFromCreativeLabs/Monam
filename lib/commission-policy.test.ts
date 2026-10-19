import { describe, expect, it } from "vitest";
import { earnsCommission } from "./commission-policy";

describe("earnsCommission", () => {
  it("pays an esthetician only on retail", () => {
    expect(earnsCommission("RETAIL", "ESTHETICIAN")).toBe(true);
    expect(earnsCommission("SERVICE", "ESTHETICIAN")).toBe(false);
    expect(earnsCommission("ADD_ON", "ESTHETICIAN")).toBe(false);
    expect(earnsCommission("PACKAGE", "ESTHETICIAN")).toBe(false);
  });
  it("leaves other roles to the configured rules", () => {
    expect(earnsCommission("RETAIL", "FRONT_DESK")).toBe(true);
    expect(earnsCommission("SERVICE", "OWNER")).toBe(true);
  });
});
