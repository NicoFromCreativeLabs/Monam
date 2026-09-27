"use client";

import { useMemo, useState } from "react";
import { TopBar } from "@/components/panel/TopBar";
import { Card } from "@/components/panel/Card";
import { OWNER, ESTHETICIAN_OCCUPANCY, COMMISSION_ENTRIES } from "@/lib/mock-data";
import { useStaffRoster } from "@/components/panel/StaffRosterContext";

type SortKey = "name" | "occupancyPct" | "service" | "retail" | "total" | "commissionToSalaryPct";

type Row = {
  id: string;
  name: string;
  role: string;
  location: string;
  occupancyPct: number | null;
  service: number;
  retail: number;
  total: number;
  salary: number;
  commissionToSalaryPct: number | null;
};

const COLUMNS: { key: SortKey; label: string; align?: "right" }[] = [
  { key: "name", label: "Personal" },
  { key: "occupancyPct", label: "Ocupación", align: "right" },
  { key: "service", label: "Comisión servicio", align: "right" },
  { key: "retail", label: "Comisión retail", align: "right" },
  { key: "total", label: "Comisión total", align: "right" },
  { key: "commissionToSalaryPct", label: "Comisión / salario", align: "right" },
];

// Equipo → Comparativa. Junta, por persona, las métricas que ya viven en
// otras pantallas (ocupación de Análisis → Capacidad, comisiones de
// Comisiones) en una sola vista ordenable en vez de duplicar los números en
// una tabla nueva — comparar quién rinde más/menos es el punto, no otro
// reporte aislado. Ocupación solo aplica a esteticistas (son las únicas con
// horas reservables); el resto muestra "—" en vez de un cero engañoso.
export default function StaffComparativa() {
  const { roster } = useStaffRoster();
  const [sortKey, setSortKey] = useState<SortKey>("total");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const rows: Row[] = useMemo(() => {
    return roster
      .filter((s) => s.status === "Activo")
      .map((s) => {
        const occ = ESTHETICIAN_OCCUPANCY.find((o) => o.name === s.name);
        const comm = COMMISSION_ENTRIES.find((c) => c.staff === s.name);
        const occupancyPct = occ ? Math.round((occ.hoursBooked / occ.hoursAvailable) * 100) : null;
        const service = comm?.service ?? 0;
        const retail = comm?.retail ?? 0;
        const total = comm?.total ?? 0;
        const commissionToSalaryPct = s.salary > 0 ? Math.round((total / s.salary) * 100) : null;
        return {
          id: s.id,
          name: s.name,
          role: s.role,
          location: s.location,
          occupancyPct,
          service,
          retail,
          total,
          salary: s.salary,
          commissionToSalaryPct,
        };
      });
  }, [roster]);

  const maxTotal = Math.max(1, ...rows.map((r) => r.total));

  const sortedRows = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      if (sortKey === "name") return dir * a.name.localeCompare(b.name);
      const av = a[sortKey];
      const bv = b[sortKey];
      // Nulls (metric doesn't apply to this role) always sort last, regardless of direction.
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      return dir * (av - bv);
    });
  }, [rows, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  return (
    <>
      <TopBar title="Equipo · Comparativa" userName={OWNER.name} userRole={OWNER.role} allowBothLocations />
      <div className="flex-1 space-y-6 px-8 py-6">
        <Card title="Comparar métricas del equipo — mes en curso">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] whitespace-nowrap font-body text-sm text-ciruela">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-ciruela/40">
                  {COLUMNS.map((col) => (
                    <th key={col.key} className={col.align === "right" ? "pb-2 text-right" : "pb-2"}>
                      <button
                        onClick={() => toggleSort(col.key)}
                        className={`inline-flex items-center gap-1 hover:text-ciruela ${
                          sortKey === col.key ? "text-ciruela" : ""
                        }`}
                      >
                        {col.label}
                        {sortKey === col.key && <span>{sortDir === "asc" ? "▲" : "▼"}</span>}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((r) => (
                  <tr key={r.id} className="border-t border-ciruela/8">
                    <td className="py-2.5">
                      {r.name}
                      <span className="ml-1.5 font-body text-xs text-ciruela/40">
                        · {r.role} · {r.location}
                      </span>
                    </td>
                    <td className="py-2.5 text-right text-ciruela/60">
                      {r.occupancyPct === null ? "—" : `${r.occupancyPct}%`}
                    </td>
                    <td className="py-2.5 text-right text-ciruela/60">${r.service.toLocaleString()}</td>
                    <td className="py-2.5 text-right text-ciruela/60">${r.retail.toLocaleString()}</td>
                    <td className="py-2.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-ciruela/10">
                          <div
                            className="h-full rounded-full bg-ciruela"
                            style={{ width: `${(r.total / maxTotal) * 100}%` }}
                          />
                        </div>
                        <span className="font-medium">${r.total.toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="py-2.5 text-right text-ciruela/60">
                      {r.commissionToSalaryPct === null ? "—" : `${r.commissionToSalaryPct}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 font-body text-xs text-ciruela/40">
            Ocupación aplica solo a esteticistas (únicas con horas reservables) — el resto
            muestra &ldquo;—&rdquo;. Haz clic en un encabezado para ordenar por esa métrica.
          </p>
        </Card>
      </div>
    </>
  );
}
