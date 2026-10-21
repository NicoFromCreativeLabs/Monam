import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyMetaSignature } from "./signature";
import { candidateTimes } from "./slots";

const secret = "test-app-secret";
const body = JSON.stringify({ entry: [{ id: "1" }] });
const sign = (b: string, s = secret) => "sha256=" + createHmac("sha256", s).update(b).digest("hex");

describe("verifyMetaSignature", () => {
  it("accepts a body signed with the app secret", () => {
    expect(verifyMetaSignature(body, sign(body), secret)).toBe(true);
  });
  it("rejects a tampered body, a wrong secret and a missing or malformed header", () => {
    expect(verifyMetaSignature(body + " ", sign(body), secret)).toBe(false);
    expect(verifyMetaSignature(body, sign(body, "other"), secret)).toBe(false);
    expect(verifyMetaSignature(body, null, secret)).toBe(false);
    expect(verifyMetaSignature(body, "abc", secret)).toBe(false);
  });
});

describe("candidateTimes", () => {
  it("lists the half-hour starts from opening to the last start for the duration", () => {
    // 2026-10-19 is a Monday: opens 10:00, last 60-min start 19:00, last 30-min start 19:30
    const signature = candidateTimes("2026-10-19", "Signature");
    expect(signature[0]).toBe("10:00");
    expect(signature[signature.length - 1]).toBe("19:00");
    expect(candidateTimes("2026-10-19", "Targeted").at(-1)).toBe("19:30");
  });
  it("uses the shorter Tuesday", () => {
    expect(candidateTimes("2026-10-20", "Signature").at(-1)).toBe("17:00");
  });
});
