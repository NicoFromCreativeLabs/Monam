"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { TopBar } from "@/components/panel/TopBar";
import { GlobalFilterBar } from "@/components/panel/GlobalFilterBar";
import { Card } from "@/components/panel/Card";
import { KpiCard } from "@/components/panel/KpiCard";
import { useLocations } from "@/components/panel/LocationsContext";
import { usePeriod } from "@/components/panel/PeriodContext";
import { useCompare } from "@/components/panel/CompareContext";
import { OWNER, PANEL_KPIS, PANEL_TODAY_VS_LASTWEEK } from "@/lib/mock-data";
import { getReportingSnapshotAction, type ReportingSnapshot } from "@/lib/actions/reporting";
import { decideApprovalAction } from "@/lib/actions/commerce";
import { ingresoNetoFromBreakdown, ebitda } from "@/lib/pnl-math";
import { COMPARE_TO_LABEL } from "@/lib/analytics";

export interface PanelApproval {
  id: string;
  type: string;
  client: string;
  amount: string;
  requestedBy: string;
  reason: string;
}
export interface PanelAlert {
  id: string;
  text: string;
}
export interface PanelAppointment {
  id: string;
  time: string;
  client: string;
  tier: "Targeted" | "Signature";
  room: string;
  esthetician: string;
  status: string;
}

function formatDelta(displayed: number, baseline: number | null, compareLabel: string, unit: "%" | "pts" | "$"): { label: string; tone: "positive" | "negative" | "neutral" } {
  if (baseline === null) return { label: "Sin datos previos", tone: "neutral" };
  const diff = displayed - baseline;
  if (diff === 0) return { label: `Sin cambio vs. ${compareLabel}`, tone: "neutral" };
  const arrow = diff > 0 ? "▲" : "▼";
  const tone = diff > 0 ? "positive" : "negative";
  const magnitude = unit === "$" ? Math.abs(diff).toLocaleString() : Math.abs(diff);
  const suffix = unit === "$" ? "MXN" : unit === "pts" ? (Math.abs(diff) === 1 ? "pt" : "pts") : "%";
  return { label: `${arrow} ${magnitude} ${suffix} vs. ${compareLabel}`, tone };
}

function semaphoreFor(progressPct: number | null): "green" | "yellow" | "red" {
  if (progressPct === null) return "yellow";
  if (progressPct >= 100) return "green";
  if (progressPct >= 70) return "yellow";
  return "red";
}

export function AdminPanelView({
  initialSnapshot,
  pendingApprovals: initialApprovals,
  lowStockCount,
  alerts,
  todayAppointments,
}: {
  initialSnapshot: ReportingSnapshot;
  pendingApprovals: PanelApproval[];
  lowStockCount: number;
  alerts: PanelAlert[];
  todayAppointments: PanelAppointment[];
}) {
  const { selectedNames } = useLocations();
  const { period } = usePeriod();
  const { compareTo } = useCompare();
  const compareLabel = COMPARE_TO_LABEL[compareTo];

  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [isPending, startTransition] = useTransition();
  const [pendingApprovals, setPendingApprovals] = useState(initialApprovals);

  useEffect(() => {
    startTransition(async () => {
      const next = await getReportingSnapshotAction(selectedNames, period, compareTo);
      setSnapshot(next);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNames.join(","), period, compareTo]);

  function decide(id: string, status: "APPROVED" | "REJECTED") {
    setPendingApprovals((prev) => prev.filter((a) => a.id !== id));
    decideApprovalAction(id, status).catch((err) => console.error("Failed to decide approval:", err));
  }

  const ingresoNeto = ingresoNetoFromBreakdown(snapshot.pnl);
  const ingresoNetoBaseline = snapshot.pnlBaseline ? ingresoNetoFromBreakdown(snapshot.pnlBaseline) : null;
  const ingresoTarget = snapshot.kpiTargets["Ingreso neto (MTD)"]?.value ?? 0;
  const ingresoProgress = ingresoTarget ? Math.round((ingresoNeto / ingresoTarget) * 100) : null;

  const ebitdaMxn = ebitda(snapshot.pnl);
  const ebitdaPct = ingresoNeto ? Math.round((ebitdaMxn / ingresoNeto) * 100) : 0;
  const ebitdaBaseline = snapshot.pnlBaseline
    ? (() => {
        const baseIngreso = ingresoNetoFromBreakdown(snapshot.pnlBaseline!);
        return baseIngreso ? Math.round((ebitda(snapshot.pnlBaseline!) / baseIngreso) * 100) : null;
      })()
    : null;
  const ebitdaTarget = snapshot.kpiTargets["EBITDA del local"]?.value ?? null;

  const kpiMeta = Object.fromEntries(PANEL_KPIS.map((k) => [k.id, k]));

  const kpiCards = [
    (() => {
      const k = kpiMeta["ingreso-mtd"];
      const delta = formatDelta(ingresoNeto, ingresoNetoBaseline, compareLabel, "$");
      return {
        ...k,
        value: `$${ingresoNeto.toLocaleString()}`,
        sub: ingresoTarget ? `vs. objetivo $${ingresoTarget.toLocaleString()}` : "sin objetivo configurado",
        deltaLabel: delta.label,
        deltaTone: delta.tone,
        target: ingresoTarget ? `Objetivo $${ingresoTarget.toLocaleString()} · ${ingresoProgress}% de avance` : "",
        progressPct: ingresoProgress ?? 0,
        semaphore: semaphoreFor(ingresoProgress),
        sparkline: undefined,
      };
    })(),
    (() => {
      const k = kpiMeta["ocupacion"];
      const value = snapshot.rates.ocupacion;
      const baseline = snapshot.ratesBaseline?.ocupacion ?? null;
      const target = snapshot.kpiTargets["Ocupación de cabinas"]?.value ?? null;
      const progress = value !== null && target ? Math.round((value / target) * 100) : null;
      const delta = formatDelta(value ?? 0, baseline, compareLabel, "pts");
      return {
        ...k,
        value: value !== null ? `${value}%` : "Sin datos",
        sub: undefined,
        deltaLabel: value !== null ? delta.label : "Sin historial todavía",
        deltaTone: value !== null ? delta.tone : "neutral",
        target: target ? `Objetivo ${target}% · ${progress ?? 0}% de avance` : "",
        progressPct: progress ?? 0,
        semaphore: semaphoreFor(progress),
        sparkline: undefined,
      };
    })(),
    (() => {
      const k = kpiMeta["attach-retail"];
      const value = snapshot.rates.attachRetail;
      const baseline = snapshot.ratesBaseline?.attachRetail ?? null;
      const target = snapshot.kpiTargets["Attach retail (≤ 7 días)"]?.value ?? null;
      const progress = value !== null && target ? Math.round((value / target) * 100) : null;
      const delta = formatDelta(value ?? 0, baseline, compareLabel, "pts");
      return {
        ...k,
        value: value !== null ? `${value}%` : "Sin datos",
        deltaLabel: value !== null ? delta.label : "Sin historial todavía",
        deltaTone: value !== null ? delta.tone : "neutral",
        target: target ? `Objetivo ${target}% · ${progress ?? 0}% de avance` : "",
        progressPct: progress ?? 0,
        semaphore: semaphoreFor(progress),
        sparkline: undefined,
      };
    })(),
    (() => {
      const k = kpiMeta["rebooking"];
      const target = snapshot.kpiTargets["Rebooking"]?.value ?? null;
      return {
        ...k,
        value: "Sin datos",
        sub: "Necesita historial de citas para calcularse",
        deltaLabel: "Sin historial todavía",
        deltaTone: "neutral" as const,
        target: target ? `Objetivo ${target}%` : "",
        progressPct: 0,
        semaphore: "yellow" as const,
        sparkline: undefined,
      };
    })(),
    (() => {
      const k = kpiMeta["contribucion"];
      const delta = formatDelta(ebitdaPct, ebitdaBaseline, compareLabel, "pts");
      return {
        ...k,
        value: `${ebitdaPct}%`,
        sub: `$${ebitdaMxn.toLocaleString()} MXN sobre equilibrio`,
        deltaLabel: delta.label,
        deltaTone: delta.tone,
        target: ebitdaTarget ? `Objetivo ${ebitdaTarget}%` : "",
        progressPct: ebitdaTarget ? Math.round((ebitdaPct / ebitdaTarget) * 100) : 0,
        semaphore: semaphoreFor(ebitdaTarget ? Math.round((ebitdaPct / ebitdaTarget) * 100) : null),
        sparkline: undefined,
      };
    })(),
    (() => {
      const k = kpiMeta["alertas"];
      const total = pendingApprovals.length + lowStockCount + alerts.length;
      return { ...k, value: `${total} abiertas`, sparkline: undefined };
    })(),
  ];

  const appointmentsByEsthetician = todayAppointments.reduce<Record<string, PanelAppointment[]>>((acc, apt) => {
    (acc[apt.esthetician] ??= []).push(apt);
    return acc;
  }, {});

  return (
    <>
      <TopBar title="Panel" userName={OWNER.name} userRole={OWNER.role} allowBothLocations />
      <GlobalFilterBar />
      <div className="flex-1 space-y-10 px-4 py-6 min-[860px]:px-8">
        <section>
          <SectionHeading title="Pulso" subtitle={isPending ? "Actualizando…" : "Los seis números que definen el mes"} />
          <div className="grid grid-cols-1 gap-4 min-[640px]:grid-cols-2 min-[1100px]:grid-cols-3 min-[1440px]:grid-cols-6">
            {kpiCards.map((kpi) => (
              <KpiCard
                key={kpi.id}
                label={kpi.label}
                info={kpi.info}
                value={kpi.value}
                sub={kpi.sub}
                deltaLabel={kpi.deltaLabel}
                deltaTone={kpi.deltaTone}
                target={kpi.target}
                progressPct={kpi.progressPct}
                semaphore={kpi.semaphore}
                sparkline={kpi.sparkline}
                href={kpi.href}
              />
            ))}
          </div>
        </section>

        <section>
          <SectionHeading title="Requiere acción" subtitle="Lo que necesita una decisión tuya hoy" />
          <div className="grid grid-cols-1 gap-6 min-[1000px]:grid-cols-2">
            <Card
              title={`Aprobaciones pendientes (${pendingApprovals.length})`}
              action={
                <Link href="/admin/control" className="font-body text-xs text-ciruela underline">
                  Ver todas →
                </Link>
              }
            >
              {pendingApprovals.length === 0 ? (
                <p className="py-4 text-center font-body text-sm text-ciruela/50">
                  Sin aprobaciones pendientes.
                </p>
              ) : (
                <ul className="divide-y divide-ciruela/8">
                  {pendingApprovals.map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-3 py-3">
                      <p className="font-body text-sm text-ciruela">
                        {a.type} · {a.client} · <span className="text-ciruela/70">{a.amount}</span>
                        {a.type === "Reembolso" && a.reason ? (
                          <>
                            {" "}
                            · <span className="text-ciruela/50">{a.reason}</span>
                          </>
                        ) : (
                          <>
                            {" "}
                            · <span className="text-ciruela/50">solicitó {a.requestedBy}</span>
                          </>
                        )}
                      </p>
                      <div className="flex shrink-0 gap-2">
                        <button
                          onClick={() => decide(a.id, "APPROVED")}
                          className="rounded-full bg-ciruela px-3 py-1 font-body text-xs text-hueso"
                        >
                          Aprobar
                        </button>
                        <button
                          onClick={() => decide(a.id, "REJECTED")}
                          className="rounded-full border border-ciruela px-3 py-1 font-body text-xs text-ciruela"
                        >
                          Rechazar
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card title="Alertas (seguridad · anomalías · stock)">
              {alerts.length === 0 ? (
                <p className="py-4 text-center font-body text-sm text-ciruela/50">Sin alertas abiertas.</p>
              ) : (
                <ul className="space-y-3">
                  {alerts.map((a) => (
                    <li key={a.id} className="flex items-start gap-2 font-body text-sm text-ciruela">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#b3392f]" />
                      {a.text}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </section>

        <section>
          <SectionHeading title="Hoy" subtitle="El detalle operativo del día" />
          <div className="grid grid-cols-1 gap-6 min-[1000px]:grid-cols-2">
            <Card title="Agenda del día — por esteticista">
              {Object.keys(appointmentsByEsthetician).length === 0 ? (
                <p className="py-4 text-center font-body text-sm text-ciruela/50">Sin citas agendadas hoy.</p>
              ) : (
                <div className="space-y-5">
                  {Object.entries(appointmentsByEsthetician).map(([esthetician, appts]) => (
                    <div key={esthetician}>
                      <p className="mb-2 font-body text-xs font-medium uppercase tracking-[0.14em] text-ciruela/50">
                        {esthetician}
                      </p>
                      <ul className="space-y-2">
                        {appts.map((apt) => (
                          <li
                            key={apt.id}
                            className="flex items-center justify-between gap-3 rounded-lg bg-ciruela/[0.03] px-3 py-2"
                          >
                            <div className="flex items-center gap-3">
                              <span className="font-body text-xs text-ciruela/60">{apt.time}</span>
                              <span className="font-body text-sm text-ciruela">{apt.client}</span>
                              <span className="font-body text-[11px] text-ciruela/40">
                                {apt.tier} · {apt.room}
                              </span>
                            </div>
                            <span className="font-body text-[11px] text-ciruela/50">{apt.status}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card title="Hoy vs. mismo día semana pasada">
              <p className="mb-3 font-body text-xs text-ciruela/40">
                Cifras de ejemplo — no hay suficiente historial real para comparar contra la
                semana pasada todavía.
              </p>
              <table className="w-full font-body text-sm text-ciruela">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-ciruela/40">
                    <th className="pb-2">Métrica</th>
                    <th className="pb-2 text-right">Hoy</th>
                    <th className="pb-2 text-right">Mismo día — sem. pasada</th>
                  </tr>
                </thead>
                <tbody>
                  {PANEL_TODAY_VS_LASTWEEK.map((row) => (
                    <tr key={row.label} className="border-t border-ciruela/8">
                      <td className="py-2.5">{row.label}</td>
                      <td className="py-2.5 text-right">{row.today}</td>
                      <td className="py-2.5 text-right text-ciruela/50">{row.lastWeek}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        </section>
      </div>
    </>
  );
}

function SectionHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-4 flex items-baseline gap-3">
      <h2 className="font-display text-lg text-ciruela">{title}</h2>
      <p className="font-body text-xs text-ciruela/40">{subtitle}</p>
    </div>
  );
}
