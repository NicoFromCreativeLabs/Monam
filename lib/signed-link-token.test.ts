import { describe, it, expect, beforeAll } from "vitest";
import { signLinkToken, verifyLinkToken } from "./signed-link-token";

beforeAll(() => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-secret-key-not-real";
});

describe("signLinkToken / verifyLinkToken", () => {
  it("verifies a token it just signed", () => {
    const token = signLinkToken("receipt", "sale-123");
    expect(verifyLinkToken("receipt", "sale-123", token)).toBe(true);
  });

  it("rejects a token signed for a different id", () => {
    const token = signLinkToken("receipt", "sale-123");
    expect(verifyLinkToken("receipt", "sale-456", token)).toBe(false);
  });

  it("rejects a token signed for a different purpose — one leaked PDF link can't delete an account", () => {
    const token = signLinkToken("receipt", "client-123");
    expect(verifyLinkToken("delete-account", "client-123", token)).toBe(false);
  });

  it("rejects a missing or empty token", () => {
    expect(verifyLinkToken("receipt", "sale-123", null)).toBe(false);
    expect(verifyLinkToken("receipt", "sale-123", undefined)).toBe(false);
    expect(verifyLinkToken("receipt", "sale-123", "")).toBe(false);
  });

  it("rejects a tampered token", () => {
    const token = signLinkToken("receipt", "sale-123");
    const tampered = token.slice(0, -2) + (token.slice(-2) === "00" ? "11" : "00");
    expect(verifyLinkToken("receipt", "sale-123", tampered)).toBe(false);
  });
});
