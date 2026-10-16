import { describe, expect, it } from "vitest";
import { isSkinIdComplete, skinIdToInput } from "./skin-id";

describe("isSkinIdComplete", () => {
  it("is false when the client has no Skin ID yet", () => {
    expect(isSkinIdComplete(null)).toBe(false);
  });

  it("is false when any required answer is missing", () => {
    expect(isSkinIdComplete({ skinType: "Mixta", visitObjective: null, sunExposure: "Leve" })).toBe(false);
    expect(isSkinIdComplete({ skinType: "", visitObjective: "Limpieza", sunExposure: "Leve" })).toBe(false);
    expect(isSkinIdComplete({ skinType: "Mixta", visitObjective: "Limpieza", sunExposure: null })).toBe(false);
  });

  it("is true once skin type, objective and sun exposure are answered", () => {
    expect(isSkinIdComplete({ skinType: "Mixta", visitObjective: "Limpieza", sunExposure: "Leve" })).toBe(true);
  });
});

describe("skinIdToInput", () => {
  it("returns blank defaults for a client with no Skin ID", () => {
    expect(skinIdToInput(null)).toEqual({
      skinType: "",
      allergies: "",
      medications: "",
      visitObjective: "",
      sunExposure: "",
      notes: "",
    });
  });
});
