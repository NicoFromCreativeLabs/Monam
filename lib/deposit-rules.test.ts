import { describe, expect, it } from "vitest";
import { depositRequiredForTier, parseTierDepositRules } from "./deposit-rules";

describe("parseTierDepositRules", () => {
  it("defaults to Signature requiring a deposit and Targeted not", () => {
    expect(parseTierDepositRules([])).toEqual({ signature: true, targeted: false });
  });

  it("reads the stored settings", () => {
    const rules = parseTierDepositRules([
      { key: "deposit.requiredSignature", value: false },
      { key: "deposit.requiredTargeted", value: true },
    ]);
    expect(rules).toEqual({ signature: false, targeted: true });
  });

  it("ignores values that are not booleans", () => {
    const rules = parseTierDepositRules([
      { key: "deposit.requiredSignature", value: "no" },
      { key: "deposit.requiredTargeted", value: 1 },
    ]);
    expect(rules).toEqual({ signature: true, targeted: false });
  });
});

describe("depositRequiredForTier", () => {
  it("applies the rule of the appointment type", () => {
    const rules = { signature: true, targeted: false };
    expect(depositRequiredForTier("Signature", rules)).toBe(true);
    expect(depositRequiredForTier("Targeted", rules)).toBe(false);
    expect(depositRequiredForTier("Targeted", { signature: false, targeted: true })).toBe(true);
  });
});
