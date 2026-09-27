"use client";

import { TopBar } from "@/components/panel/TopBar";
import { GlobalFilterBar } from "@/components/panel/GlobalFilterBar";
import { Card } from "@/components/panel/Card";
import { Badge } from "@/components/panel/Badge";
import { useStaffRoster } from "@/components/panel/StaffRosterContext";
import { downloadCsv } from "@/lib/csv";
import { OWNER, PNL_LINES } from "@/lib/mock-data";

function formatMoney(n: number) {
  const abs = Math.abs(n).toLocaleString("es-MX");
  return n < 0 ? `(${abs})` : abs;
}

// P&L — exact line-item structure per client spec (16-page admin review,
// Sep 2026): a real accounting structure, ordered exactly as specified.
// Figures are illustrative mock data, not a live rollup — no target model
// (v9) exists yet, so Objetivo/Var./Mes ant. read "—" everywhere. Rows
// marked ☆ are the ones that also surface as KPI cards on Panel.
// "Nómina base" is the one line here that's a live rollup, not a static
// mock figure — it sums active staff salaries from the same Personal y
// horarios roster Admin edits (spec: adding an employee's salary should
// feed the P&L automatically). Everything else stays illustrative.
export default function AdminPnl() {
  const { roster } = useStaffRoster();
  const nominaBase = roster
    .filter((s) => s.status === "Activo")
    .reduce((sum, s) => sum + s.salary, 0);
  const ingresoNeto = PNL_LINES.find((r) => r.label === "Ingreso neto")?.real ?? 0;
  const pnlLines = PNL_LINES.map((row) =>
    row.label === "Nómina base"
      ? {
          ...row,
          real: -nominaBase,
          pctLabel: ingresoNeto ? `${Math.round((-nominaBase / ingresoNeto) * 100)}%` : row.pctLabel,
        }
      : row,
  );

  function exportForAccountant() {
    downloadCsv(
      "pnl-roma-norte-monam.csv",
      pnlLines
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
            <h2 className="font-display text-xl text-ciruela">Roma Norte · Agosto 2026</h2>
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
              {pnlLines.map((row, i) => {
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
            &ldquo;Nómina base&rdquo; se calcula en vivo: suma el salario de cada persona Activa
            en Personal y horarios. El resto de las cifras son ilustrativas.
          </p>
        </Card>
      </div>
    </>
  );
}
