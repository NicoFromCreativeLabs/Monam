import { describe, expect, it } from "vitest";
import { ADMIN_COLUMN, defaultPermissionRows, normalizePermissionRows } from "./permissions-matrix";

describe("normalizePermissionRows", () => {
  it("returns the defaults when nothing is stored", () => {
    expect(normalizePermissionRows(undefined)).toEqual(defaultPermissionRows());
    expect(normalizePermissionRows("junk")).toEqual(defaultPermissionRows());
  });

  it("applies a valid stored edit", () => {
    const rows = normalizePermissionRows([{ area: "Caja y cobros", access: ["Total", "Total", "Total", "Ver"] }]);
    expect(rows.find((r) => r.area === "Caja y cobros")?.access).toEqual(["Total", "Total", "Total", "Ver"]);
  });

  it("never lets the Admin column be lowered", () => {
    const defaults = defaultPermissionRows().find((r) => r.area === "Configuración")!;
    const rows = normalizePermissionRows([{ area: "Configuración", access: ["—", "Total", "—", "—"] }]);
    const edited = rows.find((r) => r.area === "Configuración")!;
    expect(edited.access[ADMIN_COLUMN]).toBe(defaults.access[ADMIN_COLUMN]);
    expect(edited.access[1]).toBe("Total");
  });

  it("ignores unknown areas, wrong lengths and unknown values", () => {
    const rows = normalizePermissionRows([
      { area: "Área inventada", access: ["Total", "Total", "Total", "Total"] },
      { area: "Panel y Análisis", access: ["Total", "Total"] },
      { area: "Aprobaciones", access: ["Total", "Total", "Root", "Ver"] },
    ]);
    expect(rows).toEqual(defaultPermissionRows());
  });
});
