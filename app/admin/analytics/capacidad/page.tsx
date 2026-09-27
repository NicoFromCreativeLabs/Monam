"use client";

import { TopBar } from "@/components/panel/TopBar";
import { GlobalFilterBar } from "@/components/panel/GlobalFilterBar";
import { Card } from "@/components/panel/Card";
import { KpiCard } from "@/components/panel/KpiCard";
import { OWNER, ANALYTICS_CAPACIDAD, OCCUPANCY_7D, ESTHETICIAN_OCCUPANCY } from "@/lib/mock-data";

// Análisis → Capacidad. Nivel 1 + Nivel 2 per spec; room/esthetician
// occupancy detail below folds in what used to live on /admin/financials.
export default function AnalyticsCapacidad() {
  return (
    <>
      <TopBar title="Análisis · Capacidad" userName={OWNER.name} userRole={OWNER.role} allowBothLocations />
      <GlobalFilterBar />
      <div className="flex-1 space-y-6 px-4 py-6 min-[860px]:px-8">
        <KpiCard
          label={ANALYTICS_CAPACIDAD.nivel1.label}
          info={ANALYTICS_CAPACIDAD.nivel1.info}
          value={ANALYTICS_CAPACIDAD.nivel1.value}
          sub={ANALYTICS_CAPACIDAD.nivel1.sub}
          deltaLabel={ANALYTICS_CAPACIDAD.nivel1.deltaLabel}
          deltaTone={ANALYTICS_CAPACIDAD.nivel1.deltaTone}
          target={ANALYTICS_CAPACIDAD.nivel1.target}
          progressPct={ANALYTICS_CAPACIDAD.nivel1.progressPct}
          semaphore={ANALYTICS_CAPACIDAD.nivel1.semaphore}
          sparkline={ANALYTICS_CAPACIDAD.nivel1.sparkline}
        />

        <div className="grid grid-cols-1 gap-4 min-[700px]:grid-cols-2 min-[1200px]:grid-cols-4">
          {ANALYTICS_CAPACIDAD.nivel2.map((k) => (
            <KpiCard
              key={k.id}
              size="sm"
              label={k.label}
              info={k.info}
              value={k.value}
              deltaLabel={k.deltaLabel}
              deltaTone={k.deltaTone}
              target={k.target}
              progressPct={k.progressPct}
              semaphore={k.semaphore}
            />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 min-[1100px]:grid-cols-2">
          <Card title="Ocupación de salas — próximos 7 días">
            <div className="flex items-end gap-2">
              {OCCUPANCY_7D.map((d) => {
                const pct = d.roomsTotal ? d.roomsBooked / d.roomsTotal : 0;
                return (
                  <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                    <div className="flex h-24 w-full items-end rounded bg-ciruela/8">
                      <div className="w-full rounded bg-ciruela" style={{ height: `${pct * 100}%` }} />
                    </div>
                    <span className="font-body text-[11px] text-ciruela/50">{d.day}</span>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card title="Ocupación por esteticista — esta semana">
            <ul className="space-y-3">
              {ESTHETICIAN_OCCUPANCY.map((e) => {
                const pct = e.hoursBooked / e.hoursAvailable;
                return (
                  <li key={e.name}>
                    <div className="mb-1 flex justify-between font-body text-xs text-ciruela">
                      <span>{e.name}</span>
                      <span className="text-ciruela/50">
                        {e.hoursBooked}h / {e.hoursAvailable}h · {Math.round(pct * 100)}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-ciruela/8">
                      <div className="h-2 rounded-full bg-ciruela" style={{ width: `${pct * 100}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
