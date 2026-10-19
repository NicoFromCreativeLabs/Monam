import { describe, expect, it } from "vitest";
import { whatsappDigits } from "./whatsapp";

describe("whatsappDigits", () => {
  it("keeps only the digits, as wa.me requires", () => {
    expect(whatsappDigits("+52 55 1234 5678")).toBe("525512345678");
    expect(whatsappDigits("+52-55-1234-5678")).toBe("525512345678");
    expect(whatsappDigits("525512345678")).toBe("525512345678");
  });
  it("falls back to the visible placeholder when empty", () => {
    expect(whatsappDigits(undefined)).toBe("000000000000");
    expect(whatsappDigits("")).toBe("000000000000");
  });
});
