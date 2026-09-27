"use client";

import { TopBar } from "@/components/panel/TopBar";
import { GlobalFilterBar } from "@/components/panel/GlobalFilterBar";
import { Card } from "@/components/panel/Card";
import { Badge } from "@/components/panel/Badge";
import { useStaffRoster } from "@/components/panel/StaffRosterContext";
import { useLocations } from "@/components/panel/LocationsContext";
import { downloadCsv } from "@/lib/csv";
import { OWNER, PNL_LINES, type PnlRow } from "@/lib/mock-data";

function formatMoney(n: number) {
  const abs = Math.abs(n).toLocaleString("es-MX");
  return n < 0 ? `(${abs})` : abs;
}

// Every sale/COGS/commission line in PNL_LINES is Roma Norte's real activity
// — the only location actually operating today. Rather than fabricate a
// Prado Norte revenue history it doesn't have, these lines read 0 whenever
// Roma Norte isn't part of the selected scope; Renta/Mantenimiento/Nómina
// stay live either way, since a signed lease and shared admin overhead are
// real pre-opening costs (spec: Prado Norte's rentCost/maintenanceCost are
// "the projected pre-opening estimate, not a signed lease" — still real
// numbers Settings already lets you edit, not invented here).
const OPERATIONAL_LABELS = new Set([
  "Servicios Targeted",
  "Servicios Signature",
  "Add-ons",
  "Retail",
  "Paquetes vencidos no usados",
  "− Descuentos",
  "− Reembolsos",
  "Backbar teórico",
  "Insumos de add-ons",
  "Costo retail vendido",
  "Cortesías",
  "Merma",
  "Comisiones de servicio",
  "Comisiones de retail",
  "Comisión de terminal",
  "Operación del local",
  "Marketing local",
]);

// Cargas sociales (payroll tax) tracked at the same ratio to Nómina base as
// the original illustrative figures (20,400 / 68,000) — scales with a live
// payroll total instead of a second hardcoded number that could drift out
// of sync with it.
const CARGAS_SOCIALES_RATIO = 20400 / 68000;

// P&L — exact line-item structure per client spec (16-page admin review,
// Sep 2026): a real accounting structure, ordered exactly as specified.
// Figures are illustrative mock data, not a live rollup — no target model
// (v9) exists yet, so Objetivo/Var./Mes ant. read "—" everywhere. Rows
// marked ☆ are the ones that also surface as KPI cards on Panel.
//
// The whole table now scopes to whatever location(s) the switcher in the
// top bar has selected (the same LocationsContext.selectedNames every other
// Admin screen reads) — "Roma Norte", "Prado Norte", or consolidated when
// more than one is picked — instead of always showing Roma Norte.
export default function AdminPnl() {
  const { roster } = useStaffRoster();
  const { locations, selectedNames } = useLocations();

  const includesRomaNorte = selectedNames.includes("Roma Norte");
  const scopeLabel = selectedNames.length > 1 ? "Consolidado" : selectedNames[0];

  const scopedLocations = locations.filter((l) => selectedNames.includes(l.name));
  const rentCost = scopedLocations.reduce((sum, l) => sum + l.rentCost, 0);
  const maintenanceCost = scopedLocations.reduce((sum, l) => sum + l.maintenanceCost, 0);

  // A staff member assigned "Ambas" counts toward every individual
  // location's payroll (their cost is real for running that location) but
  // only once when both locations are selected — this filter+reduce over
  // the roster naturally can't double-count the same person.
  const nominaBase = roster
    .filter((s) => s.status === "Activo" && (s.location === "Ambas" || selectedNames.includes(s.location)))
    .reduce((sum, s) => sum + s.salary, 0);

  const scaledLines = PNL_LINES.map((row) => {
    if (row.type === "section" || row.type === "subtotal") return row;
    if (row.label === "Nómina base") return { ...row, real: -nominaBase };
    if (row.label === "Cargas sociales") {
      return { ...row, real: -Math.round(nominaBase * CARGAS_SOCIALES_RATIO) };
    }
    if (row.label === "Renta") return { ...row, real: -rentCost };
    if (row.label === "Mantenimiento y servicios") return { ...row, real: -maintenanceCost };
    if (OPERATIONAL_LABELS.has(row.label)) return { ...row, real: includesRomaNorte ? row.real : 0 };
    return row;
  });

  // One running total for the whole table — section headers don't reset it,
  // subtotal rows just snapshot it at that point and add nothing themselves.
  // Recomputed from the (possibly location-scaled) lines above instead of
  // kept as separately hand-authored numbers that could drift. Built with
  // reduce (an accumulator, not a mutated outer variable) so nothing gets
  // reassigned across the render.
  const pnlLines = scaledLines.reduce<{ rows: PnlRow[]; running: number }>(
    (acc, row) => {
      if (row.type === "section") return { rows: [...acc.rows, row], running: acc.running };
      if (row.type === "subtotal") {
        return { rows: [...acc.rows, { ...row, real: acc.running }], running: acc.running };
      }
      return { rows: [...acc.rows, row], running: acc.running + (row.real ?? 0) };
    },
    { rows: [], running: 0 },
  ).rows;

  const ingresoNeto = pnlLines.find((r) => r.label === "Ingreso neto")?.real ?? 0;
  const pnlLinesWithPct = pnlLines.map((row) => {
    if (row.real === null) return row;
    const pctLabel = ingresoNeto
      ? `${Math.round((row.real / ingresoNeto) * 100)}%`
      : row.real === 0
        ? "0%"
        : "—";
    return { ...row, pctLabel };
  });

  function exportForAccountant() {
    downloadCsv(
      `pnl-${(scopeLabel ?? "consolidado").toLowerCase().replace(/\s+/g, "-")}-monam.csv`,
      pnlLinesWithPct
        .filter((row) => row.type !== "section")
        .map((row) => ({
          Línea: row.label,
          Real: row.real ?? "",
          "% Ing.": row.pctLabel ?? "",
        })),
    );
  }

  return (
    <>
      <TopBar title="P&L" userName={OWNER.name} userRole={OWNER.role} allowBothLocations />
      <GlobalFilterBar />
      <div className="flex-1 space-y-4 px-4 py-6 min-[860px]:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl text-ciruela">{scopeLabel} · Agosto 2026</h2>
            <p className="mt-1 font-body text-xs italic text-ciruela/50">
              Las cifras son ilustrativas — no son datos reales.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge tone="warning">Preliminar</Badge>
            <button
              onClick={exportForAccountant}
              className="rounded-full bg-ciruela px-4 py-2 font-body text-xs text-hueso"
            >
              Exportar para contador
            </button>
          </div>
        </div>

        <Card>
          <table className="w-full font-body text-sm text-ciruela">
            <thead>
              <tr className="border-b border-ciruela/15 text-left text-[11px] uppercase tracking-wide text-ciruela/40">
                <th className="pb-2">Línea</th>
                <th className="pb-2 text-right">Real</th>
                <th className="pb-2 pl-4 text-right">% Ing.</th>
                <th className="pb-2 pl-4 text-right">Objetivo</th>
                <th className="pb-2 pl-4 text-right">Var. $</th>
                <th className="pb-2 pl-4 text-right">Mes ant.</th>
                <th className="pb-2 pl-3 text-center">☆</th>
              </tr>
            </thead>
            <tbody>
              {pnlLinesWithPct.map((row, i) => {
                if (row.type === "section") {
                  return (
                    <tr key={`${row.label}-${i}`}>
                      <td
                        colSpan={7}
                        className="pb-1.5 pt-5 font-body text-[11px] font-medium uppercase tracking-[0.14em] text-ciruela/50 first:pt-0"
                      >
                        {row.label}
                      </td>
                    </tr>
                  );
                }
                const isSubtotal = row.type === "subtotal";
                return (
                  <tr
                    key={`${row.label}-${i}`}
                    className={
                      isSubtotal
                        ? "border-y border-ciruela/20 bg-ciruela/5 font-medium"
                        : "border-t border-ciruela/8"
                    }
                  >
                    <td className={`py-2 ${isSubtotal ? "" : "pl-3 text-ciruela/80"}`}>
                      {row.label}
                    </td>
                    <td
                      className={`py-2 text-right tabular-nums ${
                        row.real !== null && row.real < 0 ? "text-[#b3392f]" : ""
                      }`}
                    >
                      {row.real !== null ? formatMoney(row.real) : "—"}
                    </td>
                    <td className="py-2 pl-4 text-right text-ciruela/60 tabular-nums">
                      {row.pctLabel ?? "—"}
                    </td>
                    <td className="py-2 pl-4 text-right text-ciruela/30">—</td>
                    <td className="py-2 pl-4 text-right text-ciruela/30">—</td>
                    <td className="py-2 pl-4 text-right text-ciruela/30">—</td>
                    <td className="py-2 pl-3 text-center">
                      {row.favorite && <span title="Favorito a métricas de Panel">★</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-3 font-body text-xs text-ciruela/40">
            {includesRomaNorte
              ? "Ingresos y costos operativos son de Roma Norte, la única sucursal abierta hoy. "
              : "Prado Norte aún no abre — sin actividad de ventas, solo Renta/Mantenimiento/Nómina. "}
            &ldquo;Nómina base&rdquo;, &ldquo;Renta&rdquo; y &ldquo;Mantenimiento y servicios&rdquo;
            se calculan en vivo para la(s) sucursal(es) seleccionada(s) — el resto son cifras
            ilustrativas.
          </p>
        </Card>
      </div>
    </>
  );
}
