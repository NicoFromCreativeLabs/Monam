import { describe, it, expect } from "vitest";
import { ventasBrutas, ingresoNetoFromBreakdown, utilidadBruta, ebitda, formatRealDelta, type PnlBreakdown } from "./pnl-math";

function breakdown(overrides: Partial<PnlBreakdown> = {}): PnlBreakdown {
  return {
    serviciosTargeted: 0,
    serviciosSignature: 0,
    addOns: 0,
    retail: 0,
    descuentos: 0,
    reembolsos: 0,
    backbarTeorico: 0,
    costoRetailVendido: 0,
    cortesias: 0,
    merma: 0,
    nominaBase: 0,
    cargasSociales: 0,
    comisionesServicio: 0,
    comisionesRetail: 0,
    renta: 0,
    mantenimiento: 0,
    ...overrides,
  };
}

describe("ventasBrutas", () => {
  it("sums the four revenue lines only", () => {
    const b = breakdown({ serviciosTargeted: 100, serviciosSignature: 200, addOns: 50, retail: 150, nominaBase: -9999 });
    expect(ventasBrutas(b)).toBe(500);
  });
});

describe("ingresoNetoFromBreakdown", () => {
  it("subtracts discounts and refunds from gross sales", () => {
    const b = breakdown({ retail: 1000, descuentos: -100, reembolsos: -50 });
    expect(ingresoNetoFromBreakdown(b)).toBe(850);
  });
});

describe("utilidadBruta", () => {
  it("nets ingreso neto against COGS lines", () => {
    const b = breakdown({ retail: 1000, backbarTeorico: -200, costoRetailVendido: -300, cortesias: -10, merma: -5 });
    expect(utilidadBruta(b)).toBe(485);
  });
});

describe("ebitda", () => {
  it("accounts correctly even on a near-zero-revenue month (fixed costs dominate)", () => {
    // A real early-stage scenario: $550 revenue against real fixed costs —
    // the resulting EBITDA is a large negative number, which is correct,
    // not a bug (see AdminPanelView's "wire to real data" decision).
    const b = breakdown({ retail: 550, nominaBase: -20000, renta: -70000, mantenimiento: -11200 });
    expect(ebitda(b)).toBe(550 - 20000 - 70000 - 11200);
  });

  it("matches a hand-computed full P&L with every line populated", () => {
    const b: PnlBreakdown = {
      serviciosTargeted: 100000,
      serviciosSignature: 200000,
      addOns: 20000,
      retail: 150000,
      descuentos: -10000,
      reembolsos: -2000,
      backbarTeorico: -90000,
      costoRetailVendido: -67000,
      cortesias: -500,
      merma: -3000,
      nominaBase: -68000,
      cargasSociales: -20400,
      comisionesServicio: -42000,
      comisionesRetail: -12000,
      renta: -70000,
      mantenimiento: -11200,
    };
    const expectedIngresoNeto = 100000 + 200000 + 20000 + 150000 - 10000 - 2000;
    const expectedUtilidadBruta = expectedIngresoNeto - 90000 - 67000 - 500 - 3000;
    const expectedEbitda = expectedUtilidadBruta - 68000 - 20400 - 42000 - 12000 - 70000 - 11200;
    expect(ingresoNetoFromBreakdown(b)).toBe(expectedIngresoNeto);
    expect(utilidadBruta(b)).toBe(expectedUtilidadBruta);
    expect(ebitda(b)).toBe(expectedEbitda);
  });
});

describe("formatRealDelta", () => {
  it("reports 'sin datos previos' when there's no real baseline yet", () => {
    expect(formatRealDelta(50, null, "mes anterior", "pts").label).toBe("Sin datos previos");
    expect(formatRealDelta(null, 50, "mes anterior", "pts").label).toBe("Sin datos previos");
  });

  it("reports no change without a spurious arrow", () => {
    const result = formatRealDelta(50, 50, "mes anterior", "pts");
    expect(result.tone).toBe("neutral");
    expect(result.label).toContain("Sin cambio");
  });

  it("uses singular 'pt' for a magnitude-1 change", () => {
    expect(formatRealDelta(51, 50, "mes anterior", "pts").label).toContain("1 pt ");
    expect(formatRealDelta(52, 50, "mes anterior", "pts").label).toContain("2 pts");
  });

  it("marks a decrease as negative tone with a down arrow", () => {
    const result = formatRealDelta(40, 50, "mes anterior", "pts");
    expect(result.tone).toBe("negative");
    expect(result.label.startsWith("▼")).toBe(true);
  });
});
