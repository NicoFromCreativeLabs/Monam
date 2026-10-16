"use client";

import { useEffect, useState, useTransition } from "react";
import { TopBar } from "@/components/panel/TopBar";
import { GlobalFilterBar } from "@/components/panel/GlobalFilterBar";
import { Card } from "@/components/panel/Card";
import { Badge } from "@/components/panel/Badge";
import { useCurrentAppUser } from "@/components/panel/CurrentAppUserContext";
import { useLocations } from "@/components/panel/LocationsContext";
import { usePeriod, type Period } from "@/components/panel/PeriodContext";
import { useCompare } from "@/components/panel/CompareContext";
import { downloadCsv } from "@/lib/csv";
import { COMPARE_TO_LABEL } from "@/lib/analytics";
import { getReportingSnapshotAction, type ReportingSnapshot } from "@/lib/actions/reporting";
import { ventasBrutas, ingresoNetoFromBreakdown, utilidadBruta, ebitda, type PnlBreakdown } from "@/lib/pnl-math";
import { clearPnlLineAction, closePnlMonthAction, savePnlLineAction } from "@/lib/actions/pnl";
import { monthHasEnded, parseMoneyInput, storedFromTyped, typedFromStored, type PnlField } from "@/lib/pnl-periods";

function formatMoney(n: number | null) {
  if (n === null) return "—";
  const abs = Math.abs(n).toLocaleString("es-MX");
  return n < 0 ? `(${abs})` : abs;
}

function monthLabel(date: Date) {
  const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
}
function quarterLabel(date: Date) {
  const abbr = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const quarterStartMonth = Math.floor(date.getMonth() / 3) * 3;
  return `Q${quarterStartMonth / 3 + 1} ${date.getFullYear()} (${abbr[quarterStartMonth]}–${abbr[quarterStartMonth + 2]})`;
}
function periodLabel(period: Period): string {
  const now = new Date();
  if (period === "Mes en curso") return monthLabel(now);
  if (period === "Mes anterior") return monthLabel(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  if (period === "Trimestre en curso") return quarterLabel(now);
  return `${now.getFullYear()}`;
}

type Row =
  | { type: "section"; label: string }
  | { type: "line"; label: string; field: keyof PnlBreakdown; favorite?: boolean; objetivoKey?: "ingresoNeto" | "ebitda" }
  | { type: "subtotal"; label: string; compute: (b: PnlBreakdown) => number; favorite?: boolean; objetivoKey?: "ingresoNeto" | "ebitda" };

// Paquetes vencidos, Insumos de add-ons, Comisión de terminal, Operación del
// local and Marketing local have no data source in the system: they start at
// $0 and are typed in by the Owner while the month is open, like every other
// line.
const ROWS: Row[] = [
  { type: "section", label: "INGRESOS" },
  { type: "line", label: "Servicios Targeted", field: "serviciosTargeted" },
  { type: "line", label: "Servicios Signature", field: "serviciosSignature" },
  { type: "line", label: "Add-ons", field: "addOns" },
  { type: "line", label: "Retail", field: "retail", favorite: true },
  { type: "line", label: "Paquetes vencidos no usados", field: "paquetesVencidos" },
  { type: "subtotal", label: "Ventas brutas", compute: ventasBrutas },
  { type: "line", label: "− Descuentos", field: "descuentos" },
  { type: "line", label: "− Reembolsos", field: "reembolsos" },
  { type: "subtotal", label: "Ingreso neto", compute: ingresoNetoFromBreakdown, favorite: true, objetivoKey: "ingresoNeto" },

  { type: "section", label: "COSTO DE VENTAS" },
  { type: "line", label: "Backbar teórico", field: "backbarTeorico" },
  { type: "line", label: "Insumos de add-ons", field: "insumosAddOns" },
  { type: "line", label: "Costo retail vendido", field: "costoRetailVendido" },
  { type: "line", label: "Cortesías", field: "cortesias" },
  { type: "line", label: "Merma", field: "merma", favorite: true },
  { type: "subtotal", label: "Utilidad bruta", compute: utilidadBruta, favorite: true },

  { type: "section", label: "GASTOS DE PERSONAL" },
  { type: "line", label: "Nómina base", field: "nominaBase" },
  { type: "line", label: "Cargas sociales", field: "cargasSociales" },
  { type: "line", label: "Comisiones de servicio", field: "comisionesServicio" },
  { type: "line", label: "Comisiones de retail", field: "comisionesRetail" },

  { type: "section", label: "GASTOS DE OCUPACIÓN" },
  { type: "line", label: "Renta", field: "renta" },
  { type: "line", label: "Mantenimiento y servicios", field: "mantenimiento" },

  { type: "section", label: "GASTOS DE OPERACIÓN" },
  { type: "line", label: "Comisión de terminal", field: "comisionTerminal" },
  { type: "line", label: "Operación del local", field: "operacionLocal" },
  { type: "line", label: "Marketing local", field: "marketingLocal" },
  { type: "subtotal", label: "EBITDA del local", compute: ebitda, favorite: true, objetivoKey: "ebitda" },
];

interface DisplayRow {
  type: "section" | "subtotal" | "line";
  label: string;
  real: number | null;
  pctLabel: string | null;
  objetivo: number | null;
  mesAnt: number | null;
  varDollar: number | null;
  favorite?: boolean;
  field?: PnlField; // set on lines whose Real value can be typed in
}

function buildRows(snapshot: ReportingSnapshot, compareTo: string): DisplayRow[] {
  const { pnl, pnlBaseline, pnlMesAnterior, kpiTargets } = snapshot;
  const compareBreakdown = compareTo === "Objetivo" ? null : pnlBaseline;

  const ingresoNetoTarget = kpiTargets["Ingreso neto (MTD)"]?.value ?? null;
  const ebitdaPctTarget = kpiTargets["EBITDA del local"]?.value ?? null;
  const realIngresoNeto = ingresoNetoFromBreakdown(pnl);
  const ebitdaTarget = ebitdaPctTarget !== null ? Math.round((realIngresoNeto * ebitdaPctTarget) / 100) : null;

  const rows: DisplayRow[] = [];
  for (const row of ROWS) {
    if (row.type === "section") {
      rows.push({ type: "section", label: row.label, real: null, pctLabel: null, objetivo: null, mesAnt: null, varDollar: null });
      continue;
    }
    const real = row.type === "line" ? pnl[row.field] : row.compute(pnl);
    const mesAnt = row.type === "line" ? pnlMesAnterior[row.field] : row.compute(pnlMesAnterior);
    const compareValue = compareBreakdown ? (row.type === "line" ? compareBreakdown[row.field] : row.compute(compareBreakdown)) : null;

    let objetivo: number | null = null;
    if (row.objetivoKey === "ingresoNeto") objetivo = ingresoNetoTarget;
    if (row.objetivoKey === "ebitda") objetivo = ebitdaTarget;

    const varBaseline = compareTo === "Objetivo" ? objetivo : compareValue;
    const varDollar = varBaseline !== null ? real - varBaseline : null;

    rows.push({
      type: row.type,
      label: row.label,
      real,
      pctLabel: null,
      objetivo,
      mesAnt,
      varDollar,
      favorite: row.favorite,
      field: row.type === "line" ? row.field : undefined,
    });
  }

  const ingresoNeto = rows.find((r) => r.label === "Ingreso neto")?.real ?? 0;
  return rows.map((row) => {
    if (row.real === null) return row;
    const pctLabel = ingresoNeto ? `${Math.round((row.real / ingresoNeto) * 100)}%` : row.real === 0 ? "0%" : "—";
    return { ...row, pctLabel };
  });
}

export function AdminPnlView({ initialSnapshot }: { initialSnapshot: ReportingSnapshot }) {
  const { selectedNames } = useLocations();
  const { period, setPeriod } = usePeriod();
  const currentUser = useCurrentAppUser();
  const { compareTo } = useCompare();
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const next = await getReportingSnapshotAction(selectedNames, period, compareTo);
      setSnapshot(next);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNames.join(","), period, compareTo]);

  const scopeLabel = selectedNames.length > 1 ? "Consolidado" : selectedNames[0];
  const rows = buildRows(snapshot, compareTo);

  // Editing the Real column and closing the month: Owner only, one location
  // at a time, on a single calendar month that is not closed yet. A month
  // can only be closed once it has ended.
  const state = snapshot.pnlState;
  const singleLocation = selectedNames.length === 1 ? selectedNames[0] : null;
  const isOwner = currentUser.role === "OWNER";
  const canEdit = isOwner && !!singleLocation && !!state.monthKey && !state.closed;
  const canClose = canEdit && !!state.monthKey && monthHasEnded(state.monthKey);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const [closing, setClosing] = useState(false);

  function reload() {
    startTransition(async () => {
      setSnapshot(await getReportingSnapshotAction(selectedNames, period, compareTo));
    });
  }

  async function saveLine(field: PnlField, text: string) {
    if (!singleLocation || !state.monthKey) return;
    const typed = parseMoneyInput(text);
    if (typed === null) {
      setMessage("Escribe un monto entero en pesos.");
      reload();
      return;
    }
    const stored = storedFromTyped(field, typed);
    if (stored === snapshot.pnl[field]) return;
    setMessage(null);
    const result = await savePnlLineAction({
      locationName: singleLocation,
      monthKey: state.monthKey,
      field,
      valueMxn: stored,
    });
    if (result.error) setMessage(result.error);
    reload();
  }

  async function resetLine(field: PnlField) {
    if (!singleLocation || !state.monthKey) return;
    setMessage(null);
    const result = await clearPnlLineAction({ locationName: singleLocation, monthKey: state.monthKey, field });
    if (result.error) setMessage(result.error);
    reload();
  }

  async function closeMonth() {
    if (!singleLocation || !state.monthKey) return;
    setClosing(true);
    const result = await closePnlMonthAction({ locationName: singleLocation, monthKey: state.monthKey });
    setClosing(false);
    setConfirmClose(false);
    if (result.error) {
      setMessage(result.error);
      return;
    }
    setMessage(`${periodLabel(period)} cerrado.`);
    // On to the next month: the previous month's close lands you on the
    // current one. (Other periods just refresh.)
    if (period === "Mes anterior") setPeriod("Mes en curso");
    else reload();
  }

  const editHint = !isOwner
    ? "Solo el Admin puede editar el P&L."
    : state.closed
      ? "Mes cerrado: los valores ya no se pueden editar."
      : !state.monthKey
        ? "Elige Mes en curso o Mes anterior para editar."
        : !singleLocation
          ? "Elige una sola sucursal para editar los valores."
          : canClose
            ? "Edita la columna Real. Al cerrar el mes, los valores quedan bloqueados."
            : "Edita la columna Real. Podrás cerrar el mes cuando termine.";

  function exportForAccountant() {
    downloadCsv(
      `pnl-${(scopeLabel ?? "consolidado").toLowerCase().replace(/\s+/g, "-")}-monam.csv`,
      rows
        .filter((row) => row.type !== "section")
        .map((row) => ({
          Línea: row.label,
          Real: row.real ?? "",
          "% Ing.": row.pctLabel ?? "",
          Objetivo: row.objetivo ?? "",
          "Var. $": row.varDollar ?? "",
          "Mes ant.": row.mesAnt ?? "",
        })),
    );
  }

  return (
    <>
      <TopBar title="P&L" allowBothLocations />
      <GlobalFilterBar />
      <div className="flex-1 space-y-4 px-4 py-6 min-[860px]:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl text-ciruela">
              {scopeLabel} · {periodLabel(period)}
              {isPending && <span className="ml-2 font-body text-xs text-ciruela/40">Actualizando…</span>}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {state.closed ? <Badge tone="positive">Cerrado</Badge> : <Badge tone="warning">Preliminar</Badge>}
            {canClose && (
              <button
                onClick={() => setConfirmClose(true)}
                className="rounded-full border border-ciruela px-4 py-2 font-body text-xs text-ciruela"
              >
                Cerrar mes
              </button>
            )}
            <button onClick={exportForAccountant} className="rounded-full bg-ciruela px-4 py-2 font-body text-xs text-hueso">
              Exportar para contador
            </button>
          </div>
        </div>

        <p className="font-body text-xs text-ciruela/50">{editHint}</p>
        {message && <p className="font-body text-xs text-[#b3392f]">{message}</p>}

        <Card>
          <table className="w-full font-body text-sm text-ciruela">
            <thead>
              <tr className="border-b border-ciruela/15 text-left text-[11px] uppercase tracking-wide text-ciruela/40">
                <th className="pb-2">Línea</th>
                <th className="pb-2 text-right">Real</th>
                <th className="pb-2 pl-4 text-right">% Ing.</th>
                <th className="pb-2 pl-4 text-right">Objetivo</th>
                <th className="pb-2 pl-4 text-right">Var. $ vs. {COMPARE_TO_LABEL[compareTo]}</th>
                <th className="pb-2 pl-4 text-right">Mes ant.</th>
                <th className="pb-2 pl-3 text-center">☆</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                if (row.type === "section") {
                  return (
                    <tr key={`${row.label}-${i}`}>
                      <td colSpan={7} className="pb-1.5 pt-5 font-body text-[11px] font-medium uppercase tracking-[0.14em] text-ciruela/50 first:pt-0">
                        {row.label}
                      </td>
                    </tr>
                  );
                }
                const isSubtotal = row.type === "subtotal";
                return (
                  <tr key={`${row.label}-${i}`} className={isSubtotal ? "border-y border-ciruela/20 bg-ciruela/5 font-medium" : "border-t border-ciruela/8"}>
                    <td className={`py-2 ${isSubtotal ? "" : "pl-3 text-ciruela/80"}`}>{row.label}</td>
                    <td className={`py-2 text-right tabular-nums ${row.real !== null && row.real < 0 ? "text-[#b3392f]" : ""}`}>
                      {canEdit && row.field ? (
                        <div className="flex items-center justify-end gap-1.5">
                          {state.overriddenFields.includes(row.field) && (
                            <button
                              onClick={() => resetLine(row.field!)}
                              title="Editado a mano — volver al valor calculado"
                              aria-label={`Restablecer ${row.label}`}
                              className="font-body text-xs text-crepe"
                            >
                              ↺
                            </button>
                          )}
                          <input
                            key={`${row.field}-${row.real}`}
                            defaultValue={typedFromStored(row.field, row.real ?? 0).toLocaleString("es-MX")}
                            inputMode="numeric"
                            aria-label={`Real — ${row.label}`}
                            onBlur={(e) => saveLine(row.field!, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") e.currentTarget.blur();
                            }}
                            className="w-28 rounded border border-ciruela/25 bg-hueso px-1.5 py-1 text-right font-body text-sm tabular-nums text-ciruela focus:outline-none focus:ring-1 focus:ring-ciruela/40"
                          />
                        </div>
                      ) : (
                        formatMoney(row.real)
                      )}
                    </td>
                    <td className="py-2 pl-4 text-right text-ciruela/60 tabular-nums">{row.pctLabel ?? "—"}</td>
                    <td className="py-2 pl-4 text-right text-ciruela/60 tabular-nums">{formatMoney(row.objetivo)}</td>
                    <td className={`py-2 pl-4 text-right tabular-nums ${row.varDollar !== null && row.varDollar < 0 ? "text-[#b3392f]" : "text-oliva"}`}>
                      {formatMoney(row.varDollar)}
                    </td>
                    <td className="py-2 pl-4 text-right text-ciruela/60 tabular-nums">{formatMoney(row.mesAnt)}</td>
                    <td className="py-2 pl-3 text-center">{row.favorite && <span title="Favorito a métricas de Panel">★</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
        {canEdit && (
          <p className="font-body text-[11px] text-ciruela/40">
            Los costos, descuentos y reembolsos se escriben como monto positivo.
          </p>
        )}
      </div>

      {confirmClose && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ciruela/40 px-4"
          onClick={() => !closing && setConfirmClose(false)}
        >
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-hueso p-5 shadow-xl">
            <p className="font-display text-sm text-ciruela">¿Cerrar {periodLabel(period)}?</p>
            <p className="mt-2 font-body text-sm text-ciruela/70">
              Los valores de {scopeLabel} quedan bloqueados: ya no se podrán editar, y el mes se
              reportará tal como está ahora aunque cambien las ventas después.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setConfirmClose(false)}
                disabled={closing}
                className="rounded-full border border-ciruela px-4 py-1.5 font-body text-xs text-ciruela hover:bg-ciruela hover:text-hueso"
              >
                Cancelar
              </button>
              <button
                onClick={closeMonth}
                disabled={closing}
                className="rounded-full bg-ciruela px-4 py-1.5 font-body text-xs text-hueso disabled:opacity-50"
              >
                {closing ? "Cerrando…" : "Cerrar mes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
