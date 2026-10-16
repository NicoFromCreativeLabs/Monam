"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { TopBar } from "@/components/panel/TopBar";
import { Card } from "@/components/panel/Card";
import { Badge } from "@/components/panel/Badge";
import { NewAppointmentModal, type BookableClient } from "@/components/panel/NewAppointmentModal";
import { checkInAction } from "@/lib/actions/booking";
import type { TodayAppointmentView } from "@/lib/appointments";

const STATUS_TONE: Record<string, "positive" | "info" | "warning" | "neutral"> = {
  Registrado: "positive",
  Esperando: "info",
  Retrasado: "warning",
  Confirmado: "neutral",
};

// Statuses where the client has not been checked in yet — only these get
// "Registrar llegada" (not Registrado / En progreso / Completado).
const CHECK_IN_STATUSES = ["CONFIRMED", "WAITING", "LATE"];

// Greet by name; confirm Skin ID/consents complete before proceeding to
// treatment (spec §7.3) — cannot proceed with an incomplete record. Real
// Appointment rows now (Booking phase) via getTodayAppointments().
export function StaffCheckInView({
  queue,
  clients,
}: {
  queue: TodayAppointmentView[];
  clients: BookableClient[];
}) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function checkIn(id: string) {
    setPendingId(id);
    startTransition(async () => {
      await checkInAction(id);
      setPendingId(null);
    });
  }

  return (
    <>
      <TopBar title="Check-in" />
      <div className="flex-1 px-8 py-6">
        <div className="mb-4 flex justify-end">
          <NewAppointmentModal locationName="Roma Norte" clients={clients} />
        </div>
        <Card title="Llegadas — Roma Norte">
          {queue.length === 0 ? (
            <p className="py-4 text-center font-body text-sm text-ciruela/50">
              Sin citas registradas para hoy en esta sucursal.
            </p>
          ) : (
            <ul className="divide-y divide-ciruela/8">
              {queue.map((apt) => (
                <li key={apt.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-body text-sm text-ciruela">
                      {apt.time} · {apt.clientName}{" "}
                      <span className="text-ciruela/50">
                        · {apt.tier} · {apt.esthetician}
                      </span>
                    </p>
                    {apt.flags.length > 0 && (
                      <p className="mt-0.5 font-body text-xs text-crepe">{apt.flags.join(" · ")}</p>
                    )}
                    <p className="mt-0.5 font-body text-xs text-oliva">
                      Skin ID y consentimientos completos
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {apt.checkedOut ? (
                      <Badge tone="positive">Cobrado</Badge>
                    ) : apt.treatmentFinished ? (
                      <>
                        <Badge tone="info">Tratamiento finalizado</Badge>
                        <Link
                          href={`/staff/checkout?session=${apt.id}`}
                          className="rounded-full bg-ciruela px-3 py-1.5 font-body text-xs text-hueso"
                        >
                          Ir a cobro
                        </Link>
                      </>
                    ) : (
                      <>
                        <Badge tone={STATUS_TONE[apt.status] ?? "neutral"}>{apt.status}</Badge>
                        {CHECK_IN_STATUSES.includes(apt.statusRaw) && (
                          <button
                            onClick={() => checkIn(apt.id)}
                            disabled={isPending && pendingId === apt.id}
                            className="rounded-full bg-ciruela px-3 py-1.5 font-body text-xs text-hueso disabled:opacity-50"
                          >
                            {isPending && pendingId === apt.id ? "Registrando…" : "Registrar llegada"}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
