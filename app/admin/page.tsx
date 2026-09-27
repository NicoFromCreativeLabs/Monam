"use client";

import Link from "next/link";
import { TopBar } from "@/components/panel/TopBar";
import { GlobalFilterBar } from "@/components/panel/GlobalFilterBar";
import { Card } from "@/components/panel/Card";
import { KpiCard } from "@/components/panel/KpiCard";
import { usePanelAlerts } from "@/components/panel/PanelAlertsContext";
import {
  OWNER,
  PANEL_KPIS,
  PANEL_TODAY_VS_LASTWEEK,
  PENDING_APPROVALS,
  TODAY_APPOINTMENTS,
} from "@/lib/mock-data";

// Panel (Hoy) — rebuilt per client review, Sep 2026. The client's #1
// complaint about the old dashboard: "everything has the same visual
// weight — mixes KPIs, tasks and detail tables." Fix: three visually
// distinct bands — Pulso (KPIs), Requiere acción (tasks), Hoy (today's
// operational detail) — each with its own heading and its own density, so
// the eye can tell at a glance which band it's looking at.
export default function AdminPanel() {
  const { alerts } = usePanelAlerts();
  const appointmentsByEsthetician = TODAY_APPOINTMENTS.reduce<Record<string, typeof TODAY_APPOINTMENTS>>(
    (acc, apt) => {
      (acc[apt.esthetician] ??= []).push(apt);
      return acc;
    },
    {},
  );

  return (
    <>
      <TopBar title="Panel" userName={OWNER.name} userRole={OWNER.role} allowBothLocations />
      <GlobalFilterBar />
      <div className="flex-1 space-y-10 px-4 py-6 min-[860px]:px-8">
        {/* Band 1 — Pulso */}
        <section>
          <SectionHeading title="Pulso" subtitle="Los seis números que definen el mes" />
          <div className="grid grid-cols-1 gap-4 min-[640px]:grid-cols-2 min-[1100px]:grid-cols-3 min-[1440px]:grid-cols-6">
            {PANEL_KPIS.map((kpi) => (
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

        {/* Band 2 — Requiere acción */}
        <section>
          <SectionHeading title="Requiere acción" subtitle="Lo que necesita una decisión tuya hoy" />
          <div className="grid grid-cols-1 gap-6 min-[1000px]:grid-cols-2">
            <Card
              title={`Aprobaciones pendientes (${PENDING_APPROVALS.length})`}
              action={
                <Link href="/admin/control" className="font-body text-xs text-ciruela underline">
                  Ver todas →
                </Link>
              }
            >
              {PENDING_APPROVALS.length === 0 ? (
                <p className="py-4 text-center font-body text-sm text-ciruela/50">
                  Sin aprobaciones pendientes.
                </p>
              ) : (
                <ul className="divide-y divide-ciruela/8">
                  {PENDING_APPROVALS.map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-3 py-3">
                      <p className="font-body text-sm text-ciruela">
                        {a.type} · {a.client} ·{" "}
                        <span className="text-ciruela/70">{a.amount}</span>
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
                        <button className="rounded-full bg-ciruela px-3 py-1 font-body text-xs text-hueso">
                          Aprobar
                        </button>
                        <button className="rounded-full border border-ciruela px-3 py-1 font-body text-xs text-ciruela">
                          Rechazar
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card title="Alertas (seguridad · anomalías · stock)">
              <ul className="space-y-3">
                {alerts.map((a) => (
                  <li key={a.id} className="flex items-start gap-2 font-body text-sm text-ciruela">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#b3392f]" />
                    {a.text}
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </section>

        {/* Band 3 — Hoy */}
        <section>
          <SectionHeading title="Hoy" subtitle="El detalle operativo del día" />
          <div className="grid grid-cols-1 gap-6 min-[1000px]:grid-cols-2">
            <Card title="Agenda del día — por esteticista">
              {Object.keys(appointmentsByEsthetician).length === 0 ? (
                <p className="py-4 text-center font-body text-sm text-ciruela/50">
                  Sin citas agendadas hoy.
                </p>
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
